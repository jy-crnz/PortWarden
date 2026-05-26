'use client';

import React from 'react';
import { Server } from 'lucide-react';

// We will use this interface until we write the actual scoring algorithm
export interface ScoredDevice {
  id: string;
  ip_address: string;
  impact: number;     // 1 (Low) to 5 (Critical)
  likelihood: number; // 1 (Low) to 5 (Certain)
  risk_level: 'HIGH' | 'MODERATE' | 'LOW';
}

interface ThreatMatrixProps {
  devices: ScoredDevice[];
  onNodeClick?: (deviceId: string) => void;
}

export default function ThreatMatrix({ devices, onNodeClick }: ThreatMatrixProps) {
  // A standard 5x5 risk matrix structure.
  // We define the "zones" to color-code the background cells.
  const getCellZone = (x: number, y: number) => {
    const score = x * y;
    if (score >= 15) return 'bg-red-950/20 border-red-900/30';     // Kill Zone (High Risk)
    if (score >= 8) return 'bg-amber-950/20 border-amber-900/30';  // Warning Zone (Moderate Risk)
    return 'bg-green-950/20 border-green-900/30';                  // Safe Zone (Low Risk)
  };

  return (
    <div className="w-full bg-[#050505] border border-border rounded-xl overflow-hidden shadow-2xl min-h-150 relative flex flex-col p-6">

      {/* Header */}
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h3 className="text-xs font-black tracking-widest text-primary uppercase drop-shadow-md">Threat Landscape</h3>
          <p className="text-[10px] text-textMuted uppercase drop-shadow-md">Likelihood vs. Impact Matrix</p>
        </div>
        
        {/* FIX: Added 'mr-52' to push the legend out from under the absolute toggle buttons */}
        <div className="flex gap-4 text-[9px] font-bold tracking-widest uppercase text-textMuted mr-62">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div> Critical
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div> Moderate
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div> Low
          </span>
        </div>
      </div>

      {/* Matrix Container with Axes */}
      <div className="flex-1 flex relative">
        
        {/* Y-Axis Label (Impact) */}
        <div className="w-8 flex items-center justify-center -rotate-180" style={{ writingMode: 'vertical-rl' }}>
          <span className="text-xs font-bold tracking-widest text-textMuted uppercase">Impact (Severity) &rarr;</span>
        </div>

        {/* The 5x5 Grid */}
        <div className="flex-1 grid grid-cols-5 grid-rows-5 gap-1 relative">
          {/* We iterate through 5 rows and 5 columns. 
            Because CSS Grid starts Row 1 at the top, we map Row 1 to Impact 5, Row 2 to Impact 4, etc.
          */}
          {[5, 4, 3, 2, 1].map((impactY) => (
            [1, 2, 3, 4, 5].map((likelihoodX) => {
              
              // Find all devices that scored exactly in this cell
              const cellDevices = devices.filter(
                (d) => d.impact === impactY && d.likelihood === likelihoodX
              );

              return (
                <div 
                  key={`${likelihoodX}-${impactY}`}
                  className={`relative border rounded-md p-2 flex flex-wrap gap-2 content-start transition-colors ${getCellZone(likelihoodX, impactY)}`}
                >
                  {/* Subtle coordinate marker for the empty state */}
                  <span className="absolute bottom-1 right-1 text-[8px] text-slate-800 font-mono font-bold">
                    {likelihoodX},{impactY}
                  </span>

                  {/* Render the devices in this cell */}
                  {cellDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => onNodeClick && onNodeClick(device.ip_address)}
                      className={`group relative w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#050505] z-10 ${
                        device.risk_level === 'HIGH' ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white' :
                        device.risk_level === 'MODERATE' ? 'bg-amber-500/20 border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white' :
                        'bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white'
                      }`}
                    >
                      <Server className="w-3 h-3" />
                      
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                        {device.ip_address}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* X-Axis Label (Likelihood) */}
      <div className="h-8 ml-8 flex items-center justify-center">
        <span className="text-xs font-bold tracking-widest text-textMuted uppercase">Likelihood (Exposure) &rarr;</span>
      </div>
      
    </div>
  );
}