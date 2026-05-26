# Future Improvements & Feature Roadmap

This document outlines potential areas for enhancement, new features, and architectural improvements for the PortWarden project.

## Backend Enhancements (Django)

*   **Asynchronous Task Queue:** Currently, scans are executed using a subprocess and streamed via Server-Sent Events. For better scalability and reliability, integrate a background task queue like **Celery** with **Redis** or **RabbitMQ**. This would allow for concurrent scans and better error handling without blocking server threads.
*   **Authentication & Authorization:** The API currently appears to be open. Implementing authentication (e.g., JWT via `djangorestframework-simplejwt` or session-based auth) will secure the network data and allow for multi-user support with different roles (Admin, Viewer).
*   **Scheduled Scans:** Implement a scheduler (like `celery-beat`) to allow users to set up recurring network audits (e.g., daily, weekly) and track changes over time automatically.
*   **CVE Database Integration:** Enhance the `PortVulnerability` model by integrating with an external CVE (Common Vulnerabilities and Exposures) database API (like NVD). When a specific `service_product` and `service_version` are detected, the system could automatically fetch and link known vulnerabilities.
*   **Alerting System:** Add a notification module to trigger alerts (via Email, Slack webhook, etc.) when a new critical or high-risk vulnerability is discovered or when an unknown device joins the network.

## Frontend Improvements (Next.js)

*   **Advanced Filtering and Search:** Add interactive filters to the Dashboard to allow users to sort and filter devices by risk level, vendor, open ports, or last seen date.
*   **Device Details View:** Create a dedicated page or modal for individual devices (`/device/[id]`). This view could show the historical timeline of the device, how its open ports have changed over time across different scans, and more granular details.
*   **Scan Configuration UI:** Provide a settings interface for users to customize Nmap scan profiles. Allow them to specify custom IP ranges, specific ports, or choose between aggressive, stealth, or fast scans.
*   **Historical Trends Visualization:** Add charts (using a library like Recharts or Chart.js) to the dashboard showing the network's overall health trend over time (e.g., number of high-risk devices per week).
*   **Authentication UI:** Build login, registration, and user profile management pages to accompany backend security enhancements.

## Infrastructure & Deployment

*   **Dockerization:** Create a `docker-compose.yml` file to containerize the entire stack (Django, Next.js, and any databases/message brokers). This will make setup and deployment seamless and ensure the environment includes Nmap.
*   **Production Database:** Migrate from the default SQLite database to a robust relational database like **PostgreSQL** to handle larger volumes of scan data and concurrent connections.
*   **CI/CD Pipeline:** Set up GitHub Actions (or similar) to automatically run linters (`eslint`), backend tests (`pytest` or Django tests), and build the Next.js application on every pull request.

## Security Considerations

*   **API Rate Limiting:** Implement rate limiting on the Django REST Framework endpoints to prevent abuse.
*   **Input Validation:** Ensure strict validation on any user inputs that are passed down to the underlying Nmap process to prevent command injection vulnerabilities.
