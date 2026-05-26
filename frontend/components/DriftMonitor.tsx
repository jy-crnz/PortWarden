'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, CheckCircle, PlusCircle, Clock, AlertOctagon, Info } from 'lucide-react';

interface Exposure {
  ip_address: string;
  port: number;
  service: string;
  severity?: 'HIGH' | 'MODERATE';
}

interface DriftData {
  status: string;
  message?: string;
  timeframe?: {
    latest: string;
    previous: string;
  };
  drift?: {
    new_devices_count: number;
    new_devices: string[];
    new_exposures_count: number;
    new_exposures: Exposure[];
    resolved_exposures_count: number;
    resolved_exposures: Exposure[];
  };
}

interface DriftMonitorProps {
  refreshTrigger?: number;
}

export default function DriftMonitor({ refreshTrigger = 0 }: DriftMonitorProps) {
  const [data, setData] = useState<DriftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrift = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/scans/drift/');
        if (!res.ok) throw new Error('Failed to fetch drift data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDrift();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="w-full p-6 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse flex items-center justify-center h-48">
        <Activity className="w-6 h-6 text-cyan-500/50 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
        <AlertOctagon className="w-4 h-4" /> {error}
      </div>
    );
  }

  if (data?.status === 'insufficient_data') {
    return (
      <div className="w-full p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-4 text-slate-400">
        <Info className="w-6 h-6 text-cyan-500/50" />
        <div>
          <h3 className="font-bold text-slate-300">Awaiting Historical Data</h3>
          <p className="text-sm mt-1">{data.message}</p>
        </div>
      </div>
    );
  }

  const { drift, timeframe } = data!;

  // Format dates for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" /> Network Drift Analysis
        </h2>
        {timeframe && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Clock className="w-3 h-3" />
            <span>Last Scan: {formatDate(timeframe.previous)}</span>
            <span>→</span>
            <span className="text-cyan-400">Current: {formatDate(timeframe.latest)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🔴 New Exposures (Highest Priority) */}
        <div className="bg-slate-900/40 border border-red-500/20 rounded-xl p-5">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> New Exposures</span>
            <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{drift?.new_exposures_count}</span>
          </h3>
          
          {drift?.new_exposures_count === 0 ? (
            <p className="text-sm text-slate-500 italic">No new open ports detected.</p>
          ) : (
            <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {drift?.new_exposures.map((exp, i) => (
                <li key={i} className="flex items-start justify-between bg-slate-950/50 p-2.5 rounded border border-slate-800/50">
                  <div>
                    <span className="font-mono text-xs text-slate-300 block">{exp.ip_address}</span>
                    <span className="font-mono text-sm font-bold text-cyan-400">:{exp.port} <span className="text-xs text-slate-500 uppercase tracking-wider font-sans ml-1">{exp.service}</span></span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${
                    exp.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {exp.severity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 🟡 New Devices */}
        <div className="bg-slate-900/40 border border-amber-500/20 rounded-xl p-5">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Unknown Devices</span>
            <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{drift?.new_devices_count}</span>
          </h3>
          
          {drift?.new_devices_count === 0 ? (
            <p className="text-sm text-slate-500 italic">No new hardware detected.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {drift?.new_devices.map((ip, i) => (
                <li key={i} className="font-mono text-sm text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800/50 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {ip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 🟢 Resolved Exposures */}
        <div className="bg-slate-900/40 border border-green-500/20 rounded-xl p-5">
          <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Resolved</span>
            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">{drift?.resolved_exposures_count}</span>
          </h3>
          
          {drift?.resolved_exposures_count === 0 ? (
            <p className="text-sm text-slate-500 italic">No ports were closed since last scan.</p>
          ) : (
            <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {drift?.resolved_exposures.map((exp, i) => (
                <li key={i} className="flex items-start justify-between bg-slate-950/50 p-2.5 rounded border border-slate-800/50">
                  <div>
                    <span className="font-mono text-xs text-slate-400 line-through decoration-slate-600">{exp.ip_address}</span>
                    <span className="font-mono text-sm font-bold text-slate-500 block">:{exp.port} <span className="text-xs uppercase ml-1">{exp.service}</span></span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold tracking-wider bg-green-500/10 text-green-500">
                    SECURED
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}