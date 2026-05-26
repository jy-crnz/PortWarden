import { Device } from '../types/api';
import { ScoredDevice } from '../components/ThreatMatrix';

// Common ports targeted by automated botnets and ransomware
const HIGH_RISK_PORTS = [21, 22, 23, 135, 139, 445, 3389];

export function calculateThreatMatrix(devices: Device[]): ScoredDevice[] {
  return devices.map((device) => {
    let maxCvss = 0;
    let openPortCount = 0;
    let hasHighRiskPort = false;

    // 1. Analyze the device's footprint
    device.ports.forEach((port) => {
      if (port.state === 'OPEN') {
        openPortCount++;
        
        if (HIGH_RISK_PORTS.includes(port.port_number)) {
          hasHighRiskPort = true;
        }

        // Search for the absolute worst vulnerability on this port
        if (port.cves && port.cves.length > 0) {
          port.cves.forEach((cve) => {
            const score = parseFloat(cve.cvss_score || '0');
            if (score > maxCvss) {
              maxCvss = score;
            }
          });
        }
      }
    });

    // 2. Calculate IMPACT (Y-Axis: 1 to 5)
    let impact = 1; // Default: Safe
    if (maxCvss >= 9.0) impact = 5;      // Critical
    else if (maxCvss >= 7.0) impact = 4; // High
    else if (maxCvss >= 4.0) impact = 3; // Medium
    else if (maxCvss > 0) impact = 2;    // Low

    // 3. Calculate LIKELIHOOD (X-Axis: 1 to 5)
    let likelihood = 1; // Default: No exposure
    
    if (openPortCount >= 10) likelihood = 4;
    else if (openPortCount >= 4) likelihood = 3;
    else if (openPortCount > 0) likelihood = 2;

    // Apply Heuristic Penalties
    if (hasHighRiskPort && likelihood < 5) {
      // If they leave RDP or SMB open, an attack is highly likely
      likelihood += 1; 
    }
    
    if (maxCvss >= 9.0) {
       // If a 9.8 CVSS exploit exists (like Log4j), scanners *will* find it.
       // We force the likelihood up to ensure it hits the "Kill Zone" in the matrix.
       likelihood = Math.max(likelihood, 4); 
    }

    return {
      id: device.id,
      ip_address: device.ip_address,
      impact,
      likelihood,
      risk_level: device.risk_level, // We pass this through to maintain the red/amber/green node styling
    };
  });
}