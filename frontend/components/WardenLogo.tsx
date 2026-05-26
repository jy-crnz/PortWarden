'use client';

import React from 'react';

export default function WardenLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* ViewBox remains 0 0 100 100.
        Drop-shadow ensures the neon cyberpunk glow hits every new element.
      */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        {/* 1. LAYERED HEXAGON BOUNDARY (Creates depth) */}
        {/* Outer solid wall */}
        <polygon 
          points="50,2 93,25 93,75 50,98 7,75 7,25" 
          className="stroke-cyan-800/60"
          strokeWidth="1.5"
        />
        {/* Inner dashed firewall */}
        <polygon 
          points="50,10 84,29 84,71 50,90 16,71 16,29" 
          className="stroke-cyan-700/40"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* 2. NETWORK CIRCUIT TRACES (Data flowing to the eye) */}
        <path 
          d="M 50 50 L 75 25 L 93 35 M 50 50 L 25 75 L 7 65 M 50 50 L 20 30 L 7 35" 
          className="stroke-cyan-600/30" 
          strokeWidth="1" 
        />

        {/* 3. RADAR RINGS & CROSSHAIRS */}
        <circle cx="50" cy="50" r="42" className="stroke-cyan-500/30" strokeWidth="1" />
        <circle cx="50" cy="50" r="28" className="stroke-cyan-500/40" strokeWidth="1" strokeDasharray="4 2" />
        <line x1="8" y1="50" x2="92" y2="50" className="stroke-cyan-500/30" strokeWidth="1" />
        <line x1="50" y1="8" x2="50" y2="92" className="stroke-cyan-500/30" strokeWidth="1" />

        {/* 4. THE CYBERNETIC EYE & IRIS */}
        {/* Outer Eye Shape */}
        <path 
          d="M 15 50 Q 50 20 85 50 Q 50 80 15 50 Z" 
          className="stroke-cyan-400" 
          strokeWidth="2.5" 
        />
        {/* Mechanical Iris (Dashed) */}
        <circle cx="50" cy="50" r="12" className="stroke-cyan-400/50" strokeWidth="1" strokeDasharray="2 2" />
        {/* The Pupil */}
        <circle cx="50" cy="50" r="8" className="fill-cyan-400/20 stroke-cyan-400" strokeWidth="2" />
        {/* The Core (Pulsing) */}
        <circle cx="50" cy="50" r="2.5" className="fill-cyan-200 animate-pulse" />

        {/* 5. ENHANCED DATA NODES (Varied shapes with asynchronous pulsing) */}
        {/* High-priority node */}
        <circle cx="75" cy="25" r="2.5" className="fill-cyan-300 animate-pulse" style={{ animationDuration: '2s' }} />
        {/* Terminal/Server node (Square) */}
        <rect x="23" y="73" width="4" height="4" className="fill-cyan-400 animate-pulse" style={{ animationDuration: '3s' }} />
        {/* Standard node */}
        <circle cx="20" cy="30" r="2" className="fill-cyan-500" />
        {/* Gateway node (Diamond) */}
        <polygon points="85,58 88,61 85,64 82,61" className="fill-cyan-300 animate-pulse" style={{ animationDuration: '1.5s' }} />

        {/* 6. THE ANIMATED RADAR SWEEP (Smooth continuous rotation) */}
        <g className="origin-center animate-[spin_4s_linear_infinite]">
          {/* The solid sweeping arm */}
          <line x1="50" y1="50" x2="85" y2="15" className="stroke-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,1)]" strokeWidth="2.5" />
          
          {/* The radar "trail" effect using a semi-transparent filled slice */}
          <path 
            d="M 50 50 L 85 15 A 50 50 0 0 0 50 0 Z" 
            className="fill-cyan-400/20 mix-blend-screen"
            stroke="none"
          />
        </g>
      </svg>
    </div>
  );
}