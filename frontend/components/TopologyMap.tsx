'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Box, LayoutGrid, Map } from 'lucide-react';
import { Device } from '../types/api';
import DeviceDetailsPanel from './DeviceDetailsPanel';

// NEW IMPORTS
import ThreatMatrix from './ThreatMatrix';
import { calculateThreatMatrix } from '../utils/scoring';

const LoadingScreen = ({ mode }: { mode: string }) => (
  <div className="w-full h-125 bg-[#050505] rounded-xl border border-border flex flex-col items-center justify-center shadow-inner">
    <Activity className="w-8 h-8 text-cyan-500/50 animate-spin mb-4" />
    <p className="text-textMuted font-mono text-sm tracking-widest uppercase animate-pulse">
      Initializing {mode} Engine...
    </p>
  </div>
);

const Map3D = dynamic(() => import('./TopologyMap3D'), {
  ssr: false,
  loading: () => <LoadingScreen mode="3D" />
});

const Map2D = dynamic(() => import('./TopologyMap2D'), {
  ssr: false,
  loading: () => <LoadingScreen mode="2D" />
});

interface TopologyMapProps {
  devices: Device[];
}

export default function TopologyMap({ devices }: TopologyMapProps) {
  // UPDATED: Added MATRIX to the state type
  const [viewMode, setViewMode] = useState<'2D' | '3D' | 'MATRIX'>('3D');
  
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // NEW: Calculate scores on the fly, cached for performance
  const scoredDevices = useMemo(() => calculateThreatMatrix(devices), [devices]);

  if (!devices || devices.length === 0) return null;

  // Find the full device object based on the clicked ID (checks both IP and ID for safety)
  const selectedDevice = selectedDeviceId 
    ? devices.find(d => d.ip_address === selectedDeviceId || d.id === selectedDeviceId) 
    : null;

  return (
    // Added 'isolate' to ensure the side panel respects the rounded-xl container bounds
    <section className="mb-8 relative isolate overflow-hidden rounded-xl">
      
      {/* The Toggle Switch UI */}
      <div className="absolute top-4 right-4 z-20 flex bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg p-1 shadow-xl">
        <button
          onClick={() => setViewMode('2D')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
            viewMode === '2D' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Map className="w-4 h-4" /> 2D
        </button>
        
        <button
          onClick={() => setViewMode('3D')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
            viewMode === '3D' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Box className="w-4 h-4" /> 3D
        </button>

        {/* NEW: Threat Matrix Button */}
        <button
          onClick={() => setViewMode('MATRIX')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
            viewMode === 'MATRIX' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> MATRIX
        </button>
      </div>

      {/* The Slide-Out Panel */}
      {selectedDevice && (
        <DeviceDetailsPanel 
          device={selectedDevice} 
          onClose={() => setSelectedDeviceId(null)} 
        />
      )}

      {/* Render the selected component and pass down the click handler */}
      {viewMode === '3D' && (
        <Map3D devices={devices} onNodeClick={(id) => setSelectedDeviceId(id)} />
      )}
      
      {viewMode === '2D' && (
        <Map2D devices={devices} onNodeClick={(id) => setSelectedDeviceId(id)} /> 
      )}

      {/* NEW: Render the Matrix */}
      {viewMode === 'MATRIX' && (
        <ThreatMatrix devices={scoredDevices} onNodeClick={(id) => setSelectedDeviceId(id)} />
      )}
    </section>
  );
}