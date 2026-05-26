import requests
import logging
from urllib.parse import quote
from .models import CVE  # Adjust this import if your models are in a different path

logger = logging.getLogger(__name__)

# The official NIST NVD API v2 endpoint
NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"


def fetch_cves_for_service(product, version=None, limit=5):
    """
    Queries the NIST NVD API for CVEs matching a product and version.
    Parses the response and caches the results in the local PostgreSQL/SQLite database.
    """
    # 1. Format the search query
    search_query = product
    if version:
        search_query = f"{product} {version}"

    # URL encode the query (e.g., "OpenSSH 7.2" -> "OpenSSH%207.2")
    encoded_query = quote(search_query)

    # Build the URL. We limit the results to the top 'limit' to avoid massive payload processing
    url = f"{NVD_API_URL}?keywordSearch={encoded_query}&resultsPerPage={limit}"

    try:
        # We use a 10-second timeout so the scanner doesn't hang if NIST is down
        # Pro-tip: If you get a NIST API key, you can pass headers={"apiKey": "YOUR_KEY"} here
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch NIST data for {search_query}: {e}")
        return []

    vulnerabilities = data.get("vulnerabilities", [])
    saved_cves = []

    # 2. Parse the chaotic NIST JSON structure
    for item in vulnerabilities:
        cve_data = item.get("cve", {})
        cve_id = cve_data.get("id")

        if not cve_id:
            continue

        # 3. Check if we already cached this specific CVE in a previous scan
        cve_obj = CVE.objects.filter(cve_id=cve_id).first()
        if cve_obj:
            saved_cves.append(cve_obj)
            continue

        # Extract the English description
        descriptions = cve_data.get("descriptions", [])
        english_desc = next(
            (d.get("value") for d in descriptions if d.get("lang") == "en"),
            "No description available.",
        )

        # 4. Extract CVSS Scores (Prefer newer v3.1, fallback to older v2)
        metrics = cve_data.get("metrics", {})
        cvss_score = None
        severity = CVE.SeverityChoices.UNKNOWN

        if "cvssMetricV31" in metrics:
            cvss_data = metrics["cvssMetricV31"][0]["cvssData"]
            cvss_score = cvss_data.get("baseScore")
            severity_str = cvss_data.get("baseSeverity", "UNKNOWN").upper()
            # Safely map to our Django Choices
            severity = getattr(
                CVE.SeverityChoices, severity_str, CVE.SeverityChoices.UNKNOWN
            )

        elif "cvssMetricV2" in metrics:
            cvss_data = metrics["cvssMetricV2"][0]["cvssData"]
            cvss_score = cvss_data.get("baseScore")
            severity_str = (
                metrics["cvssMetricV2"][0].get("baseSeverity", "UNKNOWN").upper()
            )
            severity = getattr(
                CVE.SeverityChoices, severity_str, CVE.SeverityChoices.UNKNOWN
            )

        # Extract the first reference URL for proof/reading
        references = cve_data.get("references", [])
        ref_url = references[0].get("url") if references else ""

        # 5. Save the newly discovered CVE to our local database
        new_cve = CVE.objects.create(
            cve_id=cve_id,
            description=english_desc,
            cvss_score=cvss_score,
            severity=severity,
            reference_url=ref_url,
        )
        saved_cves.append(new_cve)

    return saved_cves
