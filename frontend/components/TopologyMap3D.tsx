'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Network, ShieldAlert, ShieldX, ShieldCheck, Router as RouterIcon } from 'lucide-react';
import { Device } from '../types/api';

interface TopologyMap3DProps {
  devices: Device[];
  onNodeClick?: (deviceId: string) => void;
}

export default function TopologyMap3D({ devices, onNodeClick }: TopologyMap3DProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  const userTookControl = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive Canvas Sizing
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

  // Auto-Rotating Camera Orbit with Seamless Zoom & Resume
  useEffect(() => {
    if (!graphRef.current) return;
    
    let angle = 0;
    
    const orbit = setInterval(() => {
      if (!graphRef.current) return;

      // Read the live camera position on every single frame
      const camPos = graphRef.current.cameraPosition();

      if (userTookControl.current) {
        // Track the angle while the user drags so it doesn't snap when they let go
        angle = Math.atan2(camPos.x, camPos.z);
        return; 
      }

      // Calculate the current distance (zoom level) using the Pythagorean theorem
      const currentDistance = Math.sqrt(camPos.x * camPos.x + camPos.z * camPos.z);

      graphRef.current.cameraPosition({
        x: currentDistance * Math.sin(angle),
        z: currentDistance * Math.cos(angle),
        y: camPos.y // Preserve the user's up/down tilt!
      });
      
      angle += Math.PI / 800; // Speed of rotation
    }, 30);
    
    return () => clearInterval(orbit);
  }, [dimensions]);

  // Transform Data for 3D Engine
  const graphData = useMemo(() => {
    const router = devices.find(d => d.ip_address.endsWith('.1')) || devices[0];

    const nodes = devices.map((device) => {
      let color = '#22c55e'; // Green (Secure)
      if (device.risk_level === 'HIGH') color = '#ef4444'; // Red
      if (device.risk_level === 'MODERATE') color = '#f59e0b'; // Orange
      if (device.ip_address === router?.ip_address) color = '#3b82f6'; // Blue (Gateway)

      return {
        id: device.ip_address,
        name: device.vendor ? `${device.ip_address} (${device.vendor})` : device.ip_address,
        val: device.ip_address === router?.ip_address ? 8 : Math.max(2, (device.ports?.length || 0) * 1.5),
        color: color,
        risk: device.risk_level
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

  // The Idle Timeout Handler
  const handleUserInteraction = () => {
    userTookControl.current = true;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      userTookControl.current = false;
    }, 3000); 
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full bg-[#050505] border border-border rounded-xl overflow-hidden shadow-2xl h-125 relative group cursor-move"
      // FIX: Removed onPointerMove so simply hovering no longer pauses the rotation!
      onPointerDown={handleUserInteraction}
      onWheel={handleUserInteraction}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
          <Network className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xs font-black tracking-widest text-primary uppercase drop-shadow-md">Network Topology</h3>
          <p className="text-[10px] text-textMuted uppercase drop-shadow-md">Real-time Node Relationship (3D)</p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur-md border border-border p-3 rounded-xl pointer-events-none shadow-lg">
        <h4 className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-2 border-b border-border/50 pb-1">Node Legend</h4>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-xs text-textMain font-medium">
            <RouterIcon className="w-4 h-4 text-[#3b82f6]" /> Gateway / Router
          </li>
          <li className="flex items-center gap-2 text-xs text-textMain font-medium">
            <ShieldX className="w-4 h-4 text-[#ef4444]" /> High Risk Node
          </li>
          <li className="flex items-center gap-2 text-xs text-textMain font-medium">
            <ShieldAlert className="w-4 h-4 text-[#f59e0b]" /> Moderate Risk
          </li>
          <li className="flex items-center gap-2 text-xs text-textMain font-medium">
            <ShieldCheck className="w-4 h-4 text-[#22c55e]" /> Secure Node
          </li>
        </ul>
      </div>

      {/* 3D Canvas */}
      <ForceGraph3D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#050505"
        nodeLabel={(node: any) => `
          <div style="background: rgba(10, 10, 10, 0.9); padding: 8px 12px; border: 1px solid #262626; border-radius: 6px; font-family: monospace;">
            <strong style="color: ${node.color}; display: block; font-size: 13px;">${node.name}</strong>
          </div>
        `}
        nodeColor={(node: any) => node.color}
        nodeRelSize={4}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkColor={() => 'rgba(38, 38, 38, 0.8)'}
        linkWidth={1}
        onNodeClick={(node: any) => {
          // 1. Tell the parent component which device was clicked
          if (onNodeClick) onNodeClick(node.id);
          
          // 2. Smoothly fly the camera to the node
          const distance = 100; // How close to zoom in
          const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
          
          if (graphRef.current) {
            graphRef.current.cameraPosition(
              { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
              node, // lookAt this node
              1500  // transition duration in ms
            );
          }
          
          // 3. Pause the auto-rotation so the user can inspect it
          handleUserInteraction();
        }}
      />
    </div>
  );
}