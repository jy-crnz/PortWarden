'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// 1. NEW: Define the Props interface
interface ScanConsoleProps {
  onScanComplete?: () => void;
}

// 2. NEW: Accept the prop in the component declaration
export default function ScanConsole({ onScanComplete }: ScanConsoleProps) {
    const [scanType, setScanType] = useState<'quick' | 'advanced'>('quick');
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const router = useRouter();

    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const startScan = () => {
        setLogs([]);
        setIsScanning(true);
        setProgress(0);

        const estimatedTime = scanType === 'quick' ? 20 : 180;
        setTimeLeft(estimatedTime);

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const eventSource = new EventSource(`${API_BASE_URL}/api/v1/stream/?type=${scanType}`);

        eventSource.onmessage = (event) => {
            const message = event.data;
            setLogs((prev) => [...prev, message]);

            if (message.includes('[DONE]')) {
                eventSource.close();
                setIsScanning(false);
                setProgress(100);
                setTimeLeft(0);

                localStorage.setItem('portwarden_last_scan', scanType.toUpperCase());

                // 3. NEW: Trigger the parent refresh callback if it exists
                if (onScanComplete) {
                    // Small delay to let the user see the [DONE] message before UI shifts
                    setTimeout(() => {
                        onScanComplete();
                    }, 1500);
                } else {
                    // Fallback to router.refresh if the prop wasn't passed
                    router.refresh(); 
                }
            }
        };

        eventSource.onerror = () => {
            setLogs((prev) => [...prev, 'CRITICAL ERROR: Connection to scanner lost.']);
            eventSource.close();
            setIsScanning(false);
        };
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isScanning && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
                const total = scanType === 'quick' ? 20 : 180;
                setProgress(Math.min(95, Math.round(((total - (timeLeft - 1)) / total) * 100)));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isScanning, timeLeft, scanType]);

    return (
        <div className="w-full bg-surface border border-border rounded-xl overflow-hidden shadow-2xl mb-8">
            <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-background/50">
                <div className="flex gap-2 p-1 bg-background rounded-lg border border-border">
                    <button
                        onClick={() => setScanType('quick')}
                        disabled={isScanning}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${scanType === 'quick' ? 'bg-primary text-background' : 'text-textMuted hover:text-textMain'}`}
                    >
                        QUICK SCAN
                    </button>
                    <button
                        onClick={() => setScanType('advanced')}
                        disabled={isScanning}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${scanType === 'advanced' ? 'bg-danger text-white' : 'text-textMuted hover:text-textMain'}`}
                    >
                        ADVANCED SCAN
                    </button>
                </div>

                <button
                    onClick={startScan}
                    disabled={isScanning}
                    className={`px-8 py-2 rounded-lg font-black tracking-tighter transition-all shadow-lg active:scale-95 ${isScanning ? 'bg-border text-textMuted cursor-not-allowed' : 'bg-primary text-background hover:brightness-110'}`}
                >
                    {isScanning ? 'SYSTEM BUSY...' : 'INITIALIZE AUDIT'}
                </button>
            </div>

            {isScanning && (
                <div className="px-4 py-3 bg-background/30 border-b border-border">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                        <span className="text-primary">Progress: {progress}%</span>
                        <span className={timeLeft < 10 ? 'text-danger animate-pulse' : 'text-textMuted'}>
                            Est. Time Remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <div
                ref={terminalRef}
                className="bg-[#050505] p-4 h-64 overflow-y-auto font-mono text-sm border-t border-border scroll-smooth"
            >
                {logs.length === 0 && !isScanning && (
                    <p className="text-textMuted/30 italic">System idle. Select scan mode and initialize...</p>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 mb-1 group">
                        <span className="text-textMuted/40 select-none text-[10px] pt-1">{i + 1}</span>
                        <p className={`
              ${log.includes('[INIT]') ? 'text-primary font-bold' : ''}
              ${log.includes('[DONE]') ? 'text-success font-bold underline' : ''}
              ${log.includes('Stats:') ? 'text-warning' : 'text-textMuted group-hover:text-textMain transition-colors'}
            `}>
                            <span className="text-primary/50 mr-2">›</span>{log}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}