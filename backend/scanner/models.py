import uuid
from django.db import models


class BaseModel(models.Model):
    """Abstract base class to enforce IDs and timestamps on all entities."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Device(BaseModel):
    ip_address = models.GenericIPAddressField(unique=True)
    mac_address = models.CharField(max_length=17, null=True, blank=True)
    vendor = models.CharField(max_length=255, null=True, blank=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.ip_address


class Scan(BaseModel):
    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Scan {self.id} - {self.status}"


# NEW: The CVE Model to cache NIST data
class CVE(BaseModel):
    class SeverityChoices(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"
        UNKNOWN = "UNKNOWN", "Unknown"  # Fallback for NVD entries without scores

    # We use db_index=True because we will frequently search the DB to see if a CVE already exists
    cve_id = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField()

    # CVSS scores range from 0.0 to 10.0
    cvss_score = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )

    severity = models.CharField(
        max_length=20, choices=SeverityChoices.choices, default=SeverityChoices.UNKNOWN
    )

    # Optional but highly recommended: Link back to the official NIST page
    reference_url = models.URLField(max_length=500, null=True, blank=True)

    def __str__(self):
        return f"{self.cve_id} (CVSS: {self.cvss_score})"


class PortVulnerability(BaseModel):
    class StateChoices(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"
        FILTERED = "FILTERED", "Filtered"

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="ports")
    scan = models.ForeignKey(
        Scan, on_delete=models.CASCADE, related_name="discovered_ports"
    )

    port_number = models.IntegerField()
    protocol = models.CharField(max_length=10)
    state = models.CharField(max_length=20, choices=StateChoices.choices)
    service_name = models.CharField(max_length=100, null=True, blank=True)

    service_product = models.CharField(max_length=255, null=True, blank=True)
    service_version = models.CharField(max_length=255, null=True, blank=True)

    # NEW: The Many-to-Many relationship linking the port to its cached vulnerabilities
    cves = models.ManyToManyField("CVE", related_name="affected_ports", blank=True)

    class Meta:
        unique_together = ("device", "scan", "port_number", "protocol")

    def __str__(self):
        return f"{self.device.ip_address}:{self.port_number} ({self.state})"
