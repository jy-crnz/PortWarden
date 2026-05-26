'use client';

import { PaginatedResponse, Device } from '../types/api';
import ScanConsole from '../components/ScanConsole';
import TopologyMap from '../components/TopologyMap';
import ExportReport from '../components/ExportReport';
import { ShieldAlert, ShieldX, ShieldCheck, Server, Clock, Activity, Zap, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AIAdvisor from '../components/AIAdvisor';
import WardenLogo from '../components/WardenLogo';
import Pagination from '../components/Pagination';
import DriftMonitor from '../components/DriftMonitor';

// Next.js requires Client Components that use useSearchParams to be wrapped in a Suspense boundary
// to prevent hydration errors during build. We split the core logic into an inner component.
function DashboardContent() {
  const [data, setData] = useState<PaginatedResponse<Device> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: State to trigger data fetches
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Read URL State for Pagination
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page') || '1';

  // NEW: Callback to trigger the refresh
  const handleScanComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Pass currentPage to Django backend
        const res = await fetch(`http://127.0.0.1:8000/api/v1/devices/?page=${currentPage}`, {
          cache: 'no-store',
        });

        // NEW: Gracefully handle out-of-bounds pages (like ?page=99 on an empty DB)
        if (res.status === 404) {
          setData({ count: 0, next: null, previous: null, results: [] });
          return; 
        }

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: Failed to fetch network data`);
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, refreshTrigger]); // UPDATED: Added refreshTrigger

  if (loading && data === null) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-5">
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        `}</style>
        <div className="text-center">
          <div className="inline-block mb-6 pulse-glow">
            <WardenLogo className="w-16 h-16 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
          </div>
          <p className="text-cyan-300 font-mono text-lg">Initializing PortWarden...</p>
          <p className="text-slate-400 font-mono text-sm mt-2">Establishing secure connection</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-5">
        <style>{`
          @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          .flicker { animation: flicker 0.15s infinite; }
        `}</style>
        <div className="max-w-md">
          <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <ShieldX className="w-6 h-6 text-red-400 flicker" />
              <h2 className="text-red-300 font-mono font-bold text-lg">CRITICAL ERROR</h2>
            </div>
            <p className="text-red-200 text-sm font-mono mb-2">
              {error || 'Failed to fetch network data. Is the Django backend running?'}
            </p>
            <p className="text-slate-400 text-xs font-mono">
              Backend Status: OFFLINE | Attempting reconnection...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const devices = data.results;
  const stats = {
    high: devices.filter(d => d.risk_level === 'HIGH').length,
    moderate: devices.filter(d => d.risk_level === 'MODERATE').length,
    low: devices.filter(d => d.risk_level === 'LOW').length,
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        
        * {
          font-family: 'JetBrains Mono', monospace;
        }

        h1, h2, h3 {
          font-family: 'Space Grotesk', sans-serif;
        }

        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes float-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .float-up {
          animation: float-up 0.6s ease-out;
        }

        .risk-high {
          border-color: rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, rgba(127, 29, 29, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
        }

        .risk-moderate {
          border-color: rgba(217, 119, 6, 0.4);
          background: linear-gradient(135deg, rgba(120, 53, 15, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%);
        }

        .risk-low {
          border-color: rgba(34, 197, 94, 0.4);
          background: linear-gradient(135deg, rgba(20, 83, 45, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
        }

        .stat-card {
          position: relative;
          overflow: hidden;
          border: 1px solid;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.5), transparent);
        }

        .device-card {
          transition: all 0.3s ease;
          border: 1px solid rgba(34, 211, 238, 0.2);
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%);
        }

        .device-card:hover {
          border-color: rgba(34, 211, 238, 0.5);
          box-shadow: 0 0 25px rgba(34, 211, 238, 0.15), inset 0 0 20px rgba(34, 211, 238, 0.05);
          transform: translateY(-2px);
        }

        .port-item {
          border: 1px solid rgba(34, 211, 238, 0.15);
          background: rgba(15, 23, 42, 0.8);
          transition: all 0.2s ease;
        }

        .port-item:hover {
          border-color: rgba(34, 211, 238, 0.4);
          background: rgba(30, 41, 59, 0.6);
        }

        .neon-text {
          text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
        }

        .code-text {
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.05em;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
        
        /* Custom Scrollbar for Ports List */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.6);
        }
      `}</style>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <header className="mb-12 float-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <WardenLogo className="w-14 h-14 drop-shadow-md" />
                <h1 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tighter">
                  Port<span className="text-cyan-400 neon-text">Warden</span>
                </h1>
              </div>
              <p className="text-slate-400 font-mono text-sm md:text-base pl-2">
                ▶ Real-time Network Audit &amp; Vulnerability Matrix
              </p>
            </div>

            <div className="flex flex-col items-end gap-3 text-right">
              <div className="text-xs text-slate-400 font-mono code-text">
                v1.2.0 <span className="text-slate-600">│</span> NODES: <span className="text-cyan-300 font-bold">{data.count}</span>
              </div>
              <ExportReport devices={devices} stats={stats} />
            </div>
          </div>
          <div className="h-px bg-linear-to-r from-transparent via-cyan-500/30 to-transparent" />
        </header>
        
        <div className="space-y-8 mb-12">
          <div className="float-up" style={{ animationDelay: '0.1s' }}>
            <ScanConsole onScanComplete={handleScanComplete} />
          </div>
          <div className="float-up" style={{ animationDelay: '0.15s' }}>
            <DriftMonitor refreshTrigger={refreshTrigger} />
          </div>
          <div className="float-up" style={{ animationDelay: '0.2s' }}>
            <AIAdvisor devices={devices} />
            <TopologyMap devices={devices} />
          </div>
        </div>
        
        {devices.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="stat-card risk-high rounded-lg p-6 backdrop-blur-sm float-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ShieldX className="w-5 h-5 text-red-400" />
                  <h2 className="text-xs font-bold text-red-300 uppercase tracking-widest">Critical Risks</h2>
                </div>
                <Zap className="w-4 h-4 text-red-400/50" />
              </div>
              <p className="text-4xl font-black text-red-400 font-mono code-text">
                {stats.high}
              </p>
              <p className="text-xs text-red-300/70 mt-3 font-mono">Active Threats</p>
            </div>

            <div className="stat-card risk-moderate rounded-lg p-6 backdrop-blur-sm float-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xs font-bold text-amber-300 uppercase tracking-widest">Warnings</h2>
                </div>
                <AlertTriangle className="w-4 h-4 text-amber-400/50" />
              </div>
              <p className="text-4xl font-black text-amber-400 font-mono code-text">
                {stats.moderate}
              </p>
              <p className="text-xs text-amber-300/70 mt-3 font-mono">Vulnerable Services</p>
            </div>

            <div className="stat-card risk-low rounded-lg p-6 backdrop-blur-sm float-up" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h2 className="text-xs font-bold text-green-300 uppercase tracking-widest">Secure</h2>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-400/50" />
              </div>
              <p className="text-4xl font-black text-green-400 font-mono code-text">
                {stats.low}
              </p>
              <p className="text-xs text-green-300/70 mt-3 font-mono">Hardened Nodes</p>
            </div>
          </section>
        )}

        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-cyan-500/20 rounded-lg backdrop-blur-sm bg-linear-to-b from-cyan-950/20 to-transparent float-up">
            <Activity className="w-16 h-16 text-cyan-400/40 mb-6" />
            <p className="text-slate-300 font-mono mb-3 text-center">No network data found in the vault</p>
            <p className="text-sm text-slate-500 font-mono">Initialize your first audit using Mission Control</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {devices.map((device, idx) => (
                <article
                  key={device.id}
                  className={`device-card rounded-lg p-6 backdrop-blur-sm float-up ${
                    device.risk_level === 'HIGH'
                      ? 'risk-high'
                      : device.risk_level === 'MODERATE'
                      ? 'risk-moderate'
                      : 'risk-low'
                  }`}
                  style={{ animationDelay: `${0.6 + idx * 0.05}s` }}
                >
                  <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-700/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Server className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-cyan-300 font-mono code-text">
                          {device.ip_address}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 font-mono code-text ml-8">
                        MAC: {device.mac_address || '00:00:00:00:00:00'}
                      </p>
                      {device.vendor && (
                        <p className="text-xs text-slate-500 font-mono ml-8 mt-1">
                          {device.vendor}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="inline-block">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm font-black uppercase text-[10px] tracking-widest font-mono border
                          ${
                            device.risk_level === 'HIGH'
                              ? 'bg-red-950/50 text-red-300 border-red-500/50'
                              : device.risk_level === 'MODERATE'
                              ? 'bg-amber-950/50 text-amber-300 border-amber-500/50'
                              : 'bg-green-950/50 text-green-300 border-green-500/50'
                          }`}
                        >
                          {device.risk_level === 'HIGH' && <ShieldX className="w-3 h-3" />}
                          {device.risk_level === 'MODERATE' && <AlertTriangle className="w-3 h-3" />}
                          {device.risk_level === 'LOW' && <CheckCircle2 className="w-3 h-3" />}
                          {device.risk_level}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-2 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" /> {new Date(device.last_seen).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Listening Services
                    </h3>
                    {device.ports.length === 0 ? (
                      <div className="text-xs text-slate-500 font-mono bg-slate-950/50 p-3 rounded border border-slate-700/50">
                        ▶ No active listeners detected
                      </div>
                    ) : (
                      <ul className="space-y-2 max-h-62.5 overflow-y-auto pr-2 custom-scrollbar">
                        {device.ports.map((port) => (
                          <li key={port.id} className="port-item rounded p-3 group">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="text-cyan-400 font-black code-text text-lg w-14">
                                  :{port.port_number}
                                </span>
                                <div>
                                  <p className="text-sm text-slate-200 font-semibold uppercase tracking-tight">
                                    {port.service_name || 'unknown'}
                                  </p>
                                  {(port.service_product || port.service_version) && (
                                    <p className="text-xs text-slate-500 font-mono mt-1">
                                      {port.service_product}
                                      {port.service_product && port.service_version && ' / '}
                                      {port.service_version}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] px-2.5 py-1 rounded font-black uppercase tracking-wider font-mono shrink-0
                                ${
                                  port.state === 'OPEN'
                                    ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                    : port.state === 'FILTERED'
                                    ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                                    : 'bg-slate-700/30 text-slate-400 border border-slate-600/50'
                                }`}
                              >
                                {port.state}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <Pagination 
              hasNext={data.next !== null} 
              hasPrevious={data.previous !== null}
              totalItems={data.count}
            />
          </>
        )}
      </main>
    </div>
  );
}

// Wrap the entire page in a Suspense boundary for Next.js build optimization
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <DashboardContent />
    </Suspense>
  );
}