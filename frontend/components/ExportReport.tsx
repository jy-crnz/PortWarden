'use client';

import React, { useState } from 'react';
import { Download, FileJson, FileText, ChevronDown } from 'lucide-react';
import { Device } from '../types/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportReportProps {
    devices: Device[];
    stats: { high: number; moderate: number; low: number };
}

export default function ExportReport({ devices, stats }: ExportReportProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Helper to dynamically grab the last scan type from memory
    const getScanType = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('portwarden_last_scan') || 'UNKNOWN';
        }
        return 'UNKNOWN';
    };

    const downloadJSON = () => {
        const scanType = getScanType();
        const report = {
            audit_timestamp: new Date().toISOString(),
            scan_type: scanType,
            summary: stats,
            nodes: devices,
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PortWarden_${scanType}_Audit_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };

    const downloadPDF = () => {
        const scanType = getScanType();
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();

        // 1. Report Header
        doc.setFontSize(22);
        doc.setTextColor(59, 130, 246);
        doc.text('PortWarden Security Audit', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${timestamp}`, 14, 30);
        doc.text(`Scan Methodology: ${scanType} Scan`, 14, 36); 
        doc.text(`Total Nodes Scanned: ${devices.length}`, 14, 42);

        // 2. Executive Summary
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Critical Risks: ${stats.high}`, 14, 52);
        doc.text(`Moderate Warnings: ${stats.moderate}`, 14, 58);
        doc.text(`Secure Nodes: ${stats.low}`, 14, 64);

        // 3. Device Table Transformation
        const tableColumn = ["IP Address", "MAC / Vendor", "Risk Level", "Open Ports"];
        const tableRows = devices.map(device => {
            const openPorts = device.ports.length === 0
                ? "None"
                : device.ports.map(p => `${p.port_number} (${p.service_name || 'unknown'})`).join(', ');

            return [
                device.ip_address,
                `${device.mac_address || 'Unknown'}\n${device.vendor || ''}`,
                device.risk_level,
                openPorts
            ];
        });

        // 4. Generate Main Device Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 72,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [15, 23, 42] },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 2) {
                    if (data.cell.raw === 'HIGH') data.cell.styles.textColor = [239, 68, 68];
                    if (data.cell.raw === 'MODERATE') data.cell.styles.textColor = [245, 158, 11];
                    if (data.cell.raw === 'LOW') data.cell.styles.textColor = [34, 197, 94];
                }
            }
        });

        // 5. EXTRACT CVE DATA FOR THREAT MATRIX
        const threatRows: any[] = [];
        devices.forEach(device => {
            device.ports.forEach(port => {
                if (port.cves && port.cves.length > 0) {
                    port.cves.forEach(cve => {
                        threatRows.push([
                            device.ip_address,
                            `${port.port_number} (${port.service_product || port.service_name || 'unknown'})`,
                            cve.cve_id,
                            cve.severity,
                            cve.cvss_score ? `CVSS ${cve.cvss_score}` : 'N/A'
                        ]);
                    });
                }
            });
        });

        // 6. Generate Threat Matrix Table (If Vulnerabilities Exist)
        if (threatRows.length > 0) {
            // Get the Y coordinate where the first table finished drawing
            const finalY = (doc as any).lastAutoTable.finalY || 72;

            doc.setFontSize(14);
            doc.setTextColor(220, 38, 38); // Red warning color
            doc.text("Identified Vulnerabilities (Threat Matrix)", 14, finalY + 15);

            autoTable(doc, {
                head: [["IP Address", "Exposed Service", "CVE ID", "Severity", "Score"]],
                body: threatRows,
                startY: finalY + 20,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [127, 29, 29] }, // Dark red header to indicate danger
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 3) { 
                        // Color code the Severity column
                        if (data.cell.raw === 'CRITICAL') data.cell.styles.textColor = [168, 85, 247]; // Purple
                        if (data.cell.raw === 'HIGH') data.cell.styles.textColor = [239, 68, 68]; // Red
                        if (data.cell.raw === 'MODERATE' || data.cell.raw === 'MEDIUM') data.cell.styles.textColor = [245, 158, 11]; // Amber
                    }
                }
            });
        }

        // 7. Save Document
        doc.save(`PortWarden_${scanType}_Audit_${new Date().getTime()}.pdf`);
        setIsOpen(false);
    };

    if (devices.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-bold text-textMain hover:border-primary transition-colors focus:ring-2 focus:ring-primary/50"
            >
                <Download className="w-4 h-4" />
                EXPORT REPORT
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={downloadPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-textMain hover:bg-background transition-colors text-left border-b border-border/50"
                    >
                        <FileText className="w-4 h-4 text-primary" />
                        PDF Document
                    </button>
                    <button
                        onClick={downloadJSON}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-textMain hover:bg-background transition-colors text-left"
                    >
                        <FileJson className="w-4 h-4 text-warning" />
                        Raw JSON Data
                    </button>
                </div>
            )}
        </div>
    );
}