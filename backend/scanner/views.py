import sys
import subprocess
import requests
import json
from django.core.management import call_command
from django.http import StreamingHttpResponse
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import AllowAny

from .models import Device, Scan, PortVulnerability
from .serializers import DeviceSerializer, ScanSerializer


class DeviceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows devices to be viewed.
    Includes nested ports and prevents N+1 query issues.
    """

    queryset = Device.objects.all().prefetch_related("ports").order_by("-last_seen")
    serializer_class = DeviceSerializer


class ScanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows scan history to be viewed.
    Includes custom actions to trigger Nmap scans and calculate drift.
    """

    queryset = Scan.objects.all().order_by("-created_at")
    serializer_class = ScanSerializer

    @action(detail=False, methods=["post"])
    def trigger(self, request):
        """
        Executes a standard 'run_scan' command.
        """
        scan_type = request.data.get("type", "quick")
        try:
            call_command("run_scan", type=scan_type)
            return Response(
                {"status": f"{scan_type} scan completed successfully"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to execute scan: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def drift(self, request):
        """
        Calculates network drift by comparing the two most recent completed scans.
        Identifies new devices, new open ports, and resolved vulnerabilities.
        """
        # Fetch the two most recent completed scans
        scans = Scan.objects.filter(status=Scan.StatusChoices.COMPLETED).order_by(
            "-created_at"
        )[:2]

        if scans.count() < 2:
            return Response(
                {
                    "status": "insufficient_data",
                    "message": "At least two completed scans are required to detect network drift.",
                },
                status=status.HTTP_200_OK,
            )

        latest_scan = scans[0]
        prev_scan = scans[1]

        # Fetch all port vulnerabilities associated with these specific scans
        latest_records = PortVulnerability.objects.filter(
            scan=latest_scan
        ).select_related("device")
        prev_records = PortVulnerability.objects.filter(scan=prev_scan).select_related(
            "device"
        )

        # Create lookup dictionaries keyed by "IP:PORT" for O(1) comparison
        latest_map = {
            f"{r.device.ip_address}:{r.port_number}": r
            for r in latest_records
            if r.state == "OPEN"
        }
        prev_map = {
            f"{r.device.ip_address}:{r.port_number}": r
            for r in prev_records
            if r.state == "OPEN"
        }

        new_exposures = []
        resolved_exposures = []

        # 🔴 Detect New Exposures (Exists today, wasn't there yesterday)
        for key, record in latest_map.items():
            if key not in prev_map:
                is_high_risk = record.port_number in [21, 22, 23, 135, 139, 445, 3389]
                new_exposures.append(
                    {
                        "ip_address": record.device.ip_address,
                        "port": record.port_number,
                        "service": record.service_name or "unknown",
                        "severity": "HIGH" if is_high_risk else "MODERATE",
                    }
                )

        # 🟢 Detect Resolved Exposures (Was there yesterday, closed today)
        for key, record in prev_map.items():
            if key not in latest_map:
                resolved_exposures.append(
                    {
                        "ip_address": record.device.ip_address,
                        "port": record.port_number,
                        "service": record.service_name or "unknown",
                    }
                )

        # 🟡 Detect New Devices (IPs seen in latest scan but not in previous)
        latest_ips = {r.device.ip_address for r in latest_records}
        prev_ips = {r.device.ip_address for r in prev_records}
        new_devices = list(latest_ips - prev_ips)

        return Response(
            {
                "status": "success",
                "timeframe": {
                    "latest": latest_scan.created_at,
                    "previous": prev_scan.created_at,
                },
                "drift": {
                    "new_devices_count": len(new_devices),
                    "new_devices": new_devices,
                    "new_exposures_count": len(new_exposures),
                    "new_exposures": new_exposures,
                    "resolved_exposures_count": len(resolved_exposures),
                    "resolved_exposures": resolved_exposures,
                },
            },
            status=status.HTTP_200_OK,
        )


# --- UPDATED FEATURE: Secure, Rate-Limited AI Endpoint ---
class AIAdvisorView(APIView):
    """
    API endpoint to generate AI security assessments.
    Strictly rate-limited and sanitizes AI output to ensure valid JSON.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_advisor"

    def post(self, request):
        try:
            network_data = request.data.get("devices", [])
            if not network_data:
                return Response(
                    {"error": "No network data provided for analysis."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            system_prompt = """You are a Cybersecurity AI. Analyze the following list of network devices and their open ports.
            Return a JSON object with this exact structure:
            {
            "network_health_score": 75,
            "executive_summary": "Short summary here.",
            "critical_threats": [{"ip_address": "192.168.1.1", "vulnerability": "Risk", "immediate_action": "Fix"}],
            "general_recommendations": ["Do this", "Do that"]
            }
            If no vulnerabilities exist, return empty arrays for threats.
            Your response MUST be valid JSON. No markdown, no prefixes, no explanations."""

            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "PortWarden",
            }

            payload = {
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(network_data)},
                ],
            }

            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )

            if not response.ok:
                return Response(
                    {"error": f"AI service error: {response.text}"},
                    status=response.status_code,
                )

            ai_content = response.json()["choices"][0]["message"]["content"]

            # --- CRITICAL FIX: Sanitize Markdown wrappers ---
            ai_content = ai_content.replace("```json", "").replace("```", "").strip()

            return Response({"report": ai_content}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"AI generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# --- STANDARD DJANGO VIEW ---
def stream_scan(request):
    """
    Server-Sent Events (SSE) endpoint to stream live Nmap logs.
    """
    scan_type = request.GET.get("type", "quick")

    def event_stream():
        yield f"data: [INIT] Initializing {scan_type.upper()} scan...\n\n".encode(
            "utf-8"
        )
        cmd = [
            sys.executable,
            "-u",
            "manage.py",
            "run_scan",
            "--type",
            scan_type,
            "--unprivileged",
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                clean_line = line.strip()
                if clean_line:
                    display_line = clean_line.replace("[LOG] ", "")
                    yield f"data: {display_line}\n\n".encode("utf-8")
            process.stdout.close()
        process.wait()
        yield "data: [DONE] Scan process finished.\n\n".encode("utf-8")

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
