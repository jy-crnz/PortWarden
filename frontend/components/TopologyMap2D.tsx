'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, ShieldAlert, ShieldX, ShieldCheck, Router as RouterIcon } from 'lucide-react';
import { Device } from '../types/api';

interface TopologyMap2DProps {
  devices: Device[];
  // NEW: Add the click handler prop
  onNodeClick?: (deviceId: string) => void;
}

export default function TopologyMap2D({ devices, onNodeClick }: TopologyMap2DProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const graphData = useMemo(() => {
    const router = devices.find(d => d.ip_address.endsWith('.1')) || devices[0];

    const nodes = devices.map((device) => {
      let color = '#22c55e'; // Green
      if (device.risk_level === 'HIGH') color = '#ef4444'; // Red
      if (device.risk_level === 'MODERATE') color = '#f59e0b'; // Orange
      if (device.ip_address === router?.ip_address) color = '#3b82f6'; // Blue

      return {
        id: device.ip_address,
        name: device.vendor ? `${device.ip_address} (${device.vendor})` : device.ip_address,
        val: device.ip_address === router?.ip_address ? 6 : Math.max(2, (device.ports?.length || 0)),
        color: color,
      };
    });

    const links = devices
      .filter(d => d.ip_address !== router?.ip_address)
      .map(d => ({
        source: router.ip_address,
        target: d.ip_address,
      }));

    return { nodes, links };
  }, [devices]);

  const handleUserInteraction = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(1000, 50); 
      }
    }, 5000); 
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full bg-[#050505] border border-border rounded-xl overflow-hidden shadow-2xl h-125 relative group cursor-move"
      onPointerDown={handleUserInteraction}
      onWheel={handleUserInteraction}
    >
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
          <Network className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xs font-black tracking-widest text-primary uppercase drop-shadow-md">Network Topology</h3>
          <p className="text-[10px] text-textMuted uppercase drop-shadow-md">Real-time Node Relationship (2D)</p>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur-md border border-border p-3 rounded-xl pointer-events-none shadow-lg">
        <h4 className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-2 border-b border-border/50 pb-1">Node Legend</h4>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-xs text-textMain font-medium"><RouterIcon className="w-4 h-4 text-[#3b82f6]" /> Gateway / Router</li>
          <li className="flex items-center gap-2 text-xs text-textMain font-medium"><ShieldX className="w-4 h-4 text-[#ef4444]" /> High Risk Node</li>
          <li className="flex items-center gap-2 text-xs text-textMain font-medium"><ShieldAlert className="w-4 h-4 text-[#f59e0b]" /> Moderate Risk</li>
          <li className="flex items-center gap-2 text-xs text-textMain font-medium"><ShieldCheck className="w-4 h-4 text-[#22c55e]" /> Secure Node</li>
        </ul>
      </div>

      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#050505"
        nodeLabel="name"
        nodeColor={(node: any) => node.color}
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkColor={() => '#262626'}
        
        // NEW: Handle the click event!
        onNodeClick={(node: any) => {
          // 1. Tell the parent wrapper to open the panel
          if (onNodeClick) onNodeClick(node.id);
          
          // 2. Smoothly center and zoom in on the clicked node
          if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 1000); // 1000ms transition
            graphRef.current.zoom(8, 1000); // Zoom in closer
          }
          
          // 3. Trigger the interaction timer so it stays focused for 5 seconds
          handleUserInteraction();
        }}
      />
    </div>
  );
}