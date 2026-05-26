// NEW: Interface for the NIST NVD vulnerability data
export interface CVE {
    cve_id: string;
    description: string;
    cvss_score: string | null;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
    reference_url: string | null;
}

export interface PortVulnerability {
    id: string;
    port_number: number;
    protocol: string;
    state: 'OPEN' | 'CLOSED' | 'FILTERED';
    service_name: string | null;
    service_product: string | null;
    service_version: string | null;
    updated_at: string;
    
    // NEW: Optional array of attached vulnerabilities from the Django backend
    cves?: CVE[]; 
}

// Consolidated Device interface (merged your duplicates)
export interface Device {
    id: string;
    ip_address: string;
    mac_address: string | null;
    vendor: string | null;
    last_seen: string;
    ports: PortVulnerability[];
    risk_level: 'HIGH' | 'MODERATE' | 'LOW'; 
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}