from rest_framework import serializers
from .models import Device, Scan, PortVulnerability, CVE


# --- NEW: CVE Serializer ---
class CVESerializer(serializers.ModelSerializer):
    class Meta:
        model = CVE
        fields = ["cve_id", "description", "cvss_score", "severity", "reference_url"]


class PortVulnerabilitySerializer(serializers.ModelSerializer):
    # NEW: Tell Django to nest the full CVE objects, not just their IDs
    cves = CVESerializer(many=True, read_only=True)

    class Meta:
        model = PortVulnerability
        # UPDATED: Added 'cves' to the end of the fields list
        fields = [
            "id",
            "port_number",
            "protocol",
            "state",
            "service_name",
            "service_product",
            "service_version",
            "updated_at",
            "cves",
        ]


class DeviceSerializer(serializers.ModelSerializer):
    ports = PortVulnerabilitySerializer(many=True, read_only=True)
    # Calculated on the fly for the dashboard
    risk_level = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            "id",
            "ip_address",
            "mac_address",
            "vendor",
            "last_seen",
            "ports",
            "risk_level",
        ]

    def get_risk_level(self, obj):
        # We only consider 'OPEN' ports for the risk assessment
        open_ports_count = obj.ports.filter(state="OPEN").count()

        if open_ports_count > 3:
            return "HIGH"
        elif open_ports_count > 0:
            return "MODERATE"
        return "LOW"


# This is the class that was missing!
class ScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scan
        fields = ["id", "status", "created_at", "completed_at"]
