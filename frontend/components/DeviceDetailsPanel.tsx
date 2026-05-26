'use client';

import React from 'react';
import { X, ShieldAlert, ShieldX, ShieldCheck, Server, Activity, Flame, AlertTriangle } from 'lucide-react';
import { Device, CVE } from '../types/api';

interface DeviceDetailsPanelProps {
  device: Device;
  onClose: () => void;
}

// Helper component for the threat badges
const CVEBadge = ({ cve }: { cve: CVE }) => {
  const isCritical = cve.severity === 'CRITICAL';
  const isHigh = cve.severity === 'HIGH';
  
  return (
    <div className={`mt-2 p-2 rounded border border-dashed flex flex-col gap-1.5 ${
      isCritical ? 'bg-purple-950/30 border-purple-500/50' :
      isHigh ? 'bg-red-950/30 border-red-500/50' :
      'bg-amber-950/30 border-amber-500/50'
    }`}>
      <div className="flex items-center justify-between">
        <a 
          href={cve.reference_url || `https://nvd.nist.gov/vuln/detail/${cve.cve_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs font-bold font-mono hover:underline flex items-center gap-1 ${
            isCritical ? 'text-purple-400' : isHigh ? 'text-red-400' : 'text-amber-400'
          }`}
        >
          {isCritical ? <Flame className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {cve.cve_id}
        </a>
        {cve.cvss_score && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${
            isCritical ? 'bg-purple-500/20 text-purple-300' : isHigh ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            CVSS {cve.cvss_score}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-400 leading-tight line-clamp-2" title={cve.description}>
        {cve.description}
      </p>
    </div>
  );
};

export default function DeviceDetailsPanel({ device, onClose }: DeviceDetailsPanelProps) {
  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-slate-950/90 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100 font-mono">{device.ip_address}</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Risk Status */}
        <div className={`p-3 rounded-lg border ${
          device.risk_level === 'HIGH' ? 'bg-red-950/30 border-red-500/30 text-red-400' : 
          device.risk_level === 'MODERATE' ? 'bg-amber-950/30 border-amber-500/30 text-amber-400' : 
          'bg-green-950/30 border-green-500/30 text-green-400'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {device.risk_level === 'HIGH' && <ShieldX className="w-4 h-4" />}
            {device.risk_level === 'MODERATE' && <ShieldAlert className="w-4 h-4" />}
            {device.risk_level === 'LOW' && <ShieldCheck className="w-4 h-4" />}
            <span className="text-xs font-bold tracking-widest uppercase">{device.risk_level} RISK</span>
          </div>
          <p className="text-[10px] opacity-80 font-mono">Last seen: {new Date(device.last_seen).toLocaleTimeString()}</p>
        </div>

        {/* Hardware Info */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Hardware Fingerprint</h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">MAC Address</span>
              <span className="text-slate-300">{device.mac_address || 'UNKNOWN'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vendor</span>
              <span className="text-slate-300">{device.vendor || 'UNKNOWN'}</span>
            </div>
          </div>
        </div>

        {/* Open Ports & Vulnerabilities */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Exposed Services
          </h4>
          {device.ports.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No open ports detected.</p>
          ) : (
            <ul className="space-y-3">
              {device.ports.map((port) => (
                <li key={port.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col">
                  
                  {/* Port Info Header */}
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-cyan-400 font-bold font-mono text-sm">:{port.port_number}</span>
                      <span className="text-[10px] text-slate-400 uppercase ml-2">{port.service_name}</span>
                      
                      {/* Show the software version if Nmap found it */}
                      {(port.service_product || port.service_version) && (
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {port.service_product} {port.service_version}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${
                      port.state === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {port.state}
                    </span>
                  </div>

                  {/* Render CVE Badges if any exist */}
                  {port.cves && port.cves.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/50">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Known Vulnerabilities ({port.cves.length})
                      </p>
                      {port.cves.map(cve => (
                        <CVEBadge key={cve.cve_id} cve={cve} />
                      ))}
                    </div>
                  )}

                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}