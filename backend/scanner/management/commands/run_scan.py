import subprocess
import xml.etree.ElementTree as ET
import re
import os
import tempfile
from django.core.management.base import BaseCommand
from django.utils import timezone
from scanner.models import Scan, Device, PortVulnerability

# NEW: Import the NIST service layer we just built
from scanner.nist_service import fetch_cves_for_service


class Command(BaseCommand):
    help = "Executes Nmap scans with real-time feedback and aggressive XML scrubbing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--type",
            type=str,
            choices=["quick", "advanced"],
            default="quick",
            help="Select scan intensity: quick (port scan) or advanced (version detection)",
        )

    def handle(self, *args, **options):
        scan_type = options["type"]
        target = "192.168.1.0/24"

        nmap_flags = ["-F", "-T4"]
        if scan_type == "advanced":
            nmap_flags.append("-sV")

        self.stdout.write(
            self.style.NOTICE(f"--- Starting {scan_type.upper()} Scan on {target} ---")
        )
        self.stdout.flush()
        scan_record = Scan.objects.create(status=Scan.StatusChoices.PENDING)

        temp_xml_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xml")
        temp_xml_path = temp_xml_file.name
        temp_xml_file.close()

        try:
            cmd = (
                ["nmap"]
                + nmap_flags
                + ["-v", "--stats-every", "5s", "-oX", temp_xml_path, target]
            )

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
            )

            if process.stdout is None:
                raise Exception("Failed to initialize Nmap output pipe.")

            for line in iter(process.stdout.readline, ""):
                clean_line = line.strip()
                if clean_line:
                    if "PCRE2 error" in clean_line:
                        continue

                    self.stdout.write(f"[LOG] {clean_line}")
                    self.stdout.flush()

                    if "Stats:" in clean_line:
                        self.stdout.write(self.style.WARNING(f"PROGRESS: {clean_line}"))
                        self.stdout.flush()

            process.stdout.close()
            return_code = process.wait()

            if return_code == 0:
                with open(temp_xml_path, "r", encoding="utf-8", errors="ignore") as f:
                    full_xml = f.read()

                if full_xml:
                    ingestion_success = self.parse_and_save(full_xml, scan_record)

                    if ingestion_success:
                        scan_record.status = Scan.StatusChoices.COMPLETED
                        scan_record.completed_at = timezone.now()
                        scan_record.save()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Successfully ingested {scan_type} results."
                            )
                        )
                    else:
                        scan_record.status = Scan.StatusChoices.FAILED
                        scan_record.save()
                        self.stderr.write(
                            self.style.ERROR(
                                "Data ingestion failed due to XML encoding errors."
                            )
                        )
            else:
                raise subprocess.CalledProcessError(return_code, cmd)

        except Exception as e:
            scan_record.status = Scan.StatusChoices.FAILED
            scan_record.save()
            self.stderr.write(self.style.ERROR(f"Scan Error: {str(e)}"))

        finally:
            if os.path.exists(temp_xml_path):
                os.remove(temp_xml_path)

    def parse_and_save(self, xml_string, scan_record):
        try:
            clean_xml = re.sub(r"&(?!(?:amp|lt|gt|quot|apos);)", "&amp;", xml_string)
            illegal_xml_re = re.compile(
                "[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f\ud800-\udfff\ufdd0-\ufddf\ufffe\uffff]"
            )
            clean_xml = illegal_xml_re.sub("", clean_xml)
            root = ET.fromstring(clean_xml)
        except ET.ParseError as e:
            self.stderr.write(
                self.style.WARNING(
                    f"Standard parse failed ({str(e)}). Attempting ASCII brute-force..."
                )
            )
            try:
                ascii_xml = xml_string.encode("ascii", "ignore").decode("ascii")
                ascii_xml = re.sub(r"&(?!(?:amp|lt|gt|quot|apos);)", "&amp;", ascii_xml)
                root = ET.fromstring(ascii_xml)
            except Exception as final_e:
                self.stderr.write(
                    self.style.ERROR(f"Critical XML Failure: {str(final_e)}")
                )
                return False

        for host in root.findall("host"):
            status_el = host.find("status")
            if status_el is not None and status_el.get("state") != "up":
                continue

            ip_address = None
            mac_address = None
            vendor = None

            for address in host.findall("address"):
                addr_type = address.get("addrtype")
                if addr_type == "ipv4":
                    ip_address = address.get("addr")
                elif addr_type == "mac":
                    mac_address = address.get("addr")
                    vendor = address.get("vendor")

            if not ip_address:
                continue

            device, _ = Device.objects.update_or_create(
                ip_address=ip_address,
                defaults={"mac_address": mac_address, "vendor": vendor},
            )

            ports_el = host.find("ports")
            if ports_el is not None:
                for port in ports_el.findall("port"):
                    port_id = int(port.get("portid") or 0)
                    protocol = port.get("protocol") or "tcp"

                    state_el = port.find("state")
                    state = "UNKNOWN"
                    if state_el is not None:
                        raw_state = state_el.get("state")
                        if raw_state:
                            state = raw_state.upper()

                    service_el = port.find("service")
                    service_name = None
                    service_product = None
                    service_version = None

                    if service_el is not None:
                        service_name = service_el.get("name")
                        service_product = service_el.get("product")
                        service_version = service_el.get("version")

                    if state in dict(PortVulnerability.StateChoices.choices):
                        # MODIFIED: We capture the returned object as `port_vuln`
                        port_vuln, _ = PortVulnerability.objects.update_or_create(
                            device=device,
                            port_number=port_id,
                            protocol=protocol,
                            defaults={
                                "scan": scan_record,
                                "state": state,
                                "service_name": service_name,
                                "service_product": service_product,
                                "service_version": service_version,
                            },
                        )

                        # --- NEW: CVE INJECTION LOGIC ---
                        # If Nmap identified a specific product (e.g., "OpenSSH"), query NIST
                        if service_product:
                            self.stdout.write(
                                f"[LOG] Querying NVD for {service_product} {service_version or ''}..."
                            )

                            cves = fetch_cves_for_service(
                                service_product, service_version
                            )

                            if cves:
                                # Assign the list of CVE objects to the Many-to-Many field
                                port_vuln.cves.set(cves)
                                self.stdout.write(
                                    f"[LOG] Attached {len(cves)} known CVEs to Port {port_id}"
                                )

        return True
