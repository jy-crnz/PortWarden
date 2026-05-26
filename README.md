# PortWarden

**Real-time Network Audit & Vulnerability Matrix**

PortWarden is a comprehensive, enterprise-grade full-stack application designed to perform network security audits, track devices, and map open ports to known vulnerabilities. It combines a robust Django backend with a modern Next.js frontend to provide real-time scanning capabilities, 3D network topology visualizations, and live threat intelligence integration.

## Architecture Overview

The project is structured using Layered Separation to ensure scalability and maintainability:
- **Backend:** Django & Django REST Framework (Python), containerized for production.
- **Frontend:** Next.js (React, TypeScript), optimized for Edge deployment.

### Backend (Django)
Located in the `backend/` directory, the server manages the database, executes system-level network scans, and serves API endpoints.

**Key Models (`scanner/models.py`):**
- **Device:** Represents a node on the network (IP Address, MAC Address, Vendor).
- **Scan:** Tracks the status and timestamps of network scan executions.
- **PortVulnerability:** Maps discovered open ports and services (product/version) to specific devices.
- **CVE (New):** Stores vulnerability data (CVE ID, Severity, CVSS Score) locally to minimize external API rate limits.

**Core Features (`scanner/views.py` & Services):**
- **Real-Time Scanning:** A custom Server-Sent Events (SSE) endpoint (`stream_scan`) streams live standard output from system `nmap` commands directly to the frontend.
- **NIST NVD Integration:** An automated pipeline that parses Advanced Scan (`-sV`) results and queries the US Government National Vulnerability Database to attach real-world CVEs and CVSS v3 scores to discovered software.

### Frontend (Next.js)
Located in the `frontend/` directory, the client is a modern web application utilizing the Next.js App Router (`app/`).

**Key Components:**
- **Network Dashboard (`app/page.tsx`):** The central hub that fetches and displays the current state of the network. 
- **Interactive Threat Matrix (`components/ThreatMatrix.tsx`):** A custom 5x5 grid calculating a device's Likelihood of exploitation (exposure/open ports) against its Impact (highest CVSS score). 
- **Topology Engine (`components/TopologyMap.tsx`):** Utilizes `react-force-graph-2d` and `react-force-graph-3d` to render interactive physics-based node maps. Includes a slide-out frosted-glass UI for deep-dive device analytics.
- **Client-Side Export (`components/ExportReport.tsx`):** Leverages `jspdf` and `jspdf-autotable` to instantly generate zero-latency PDF reports containing an Executive Summary, Device Lists, and a detailed Threat Matrix of all discovered CVEs.

## Tech Stack
* **Backend:** Python 3.11, Django, Django REST Framework, PostgreSQL (Production) / SQLite (Local), Gunicorn
* **Frontend:** React 19, Next.js 16, TypeScript, Tailwind CSS, Lucide React
* **Visualizations:** ForceGraph2D, ForceGraph3D
* **System Tools:** Nmap (Advanced TCP Connect & SYN Stealth Scanning)
* **Threat Intelligence:** NIST NVD REST API

## Getting Started

### Prerequisites
- Python 3.x installed
- Node.js & npm installed
- Nmap installed on the host system running the backend.

### Running the Backend (Local Development)
1. Navigate to `backend/`
2. Activate the virtual environment (`venv\Scripts\activate` on Windows).
3. Install dependencies: `python -m pip install -r requirements.txt`
4. Apply migrations: `python manage.py migrate`
5. Run the server: `python manage.py runserver 127.0.0.1:8000`

### Running the Frontend (Local Development)
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Access the application at `http://localhost:3000`

### Production Deployment
The backend includes a highly optimized `Dockerfile` configured to provision a lightweight Debian environment, install system-level `nmap`, and boot the Django application via Gunicorn. It is designed to be deployed on platforms like Render or Railway, alongside a managed PostgreSQL instance.

## Risk Assessment Logic
The application automatically assesses risk using a heuristic scoring algorithm:
- **Impact (Y-Axis):** Scored 1-5 based on the absolute highest CVSS score attached to a device's exposed services (e.g., CVSS 9.0+ = Critical Impact).
- **Likelihood (X-Axis):** Scored 1-5 based on the attack surface area (number of open ports) with heuristic penalties applied for notoriously targeted ports (e.g., RDP 3389, SMB 445).
- **Node Colors:** - **High (Red):** Severe vulnerabilities or highly exposed critical ports.
  - **Moderate (Amber):** Warning states, moderate CVEs, or unusual port exposure.
  - **Low (Green):** Secure nodes with minimal attack surfaces.