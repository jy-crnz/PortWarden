'use client'; // This tells Next.js this is interactive

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanButton() {
    const [isScanning, setIsScanning] = useState(false);
    const router = useRouter();

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/v1/scans/trigger/', {
                method: 'POST',
            });

            if (res.ok) {
                // Refresh the page data without a full reload
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to trigger scan", error);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <button
            onClick={handleScan}
            disabled={isScanning}
            className={`px-4 py-2 rounded-md font-bold text-sm transition-all shadow-sm
        ${isScanning
                    ? 'bg-surface text-textMuted cursor-not-allowed border border-border animate-pulse'
                    : 'bg-primary text-background hover:bg-opacity-90 active:scale-95'
                }`}
        >
            {isScanning ? 'SCANNING NETWORK...' : 'TRIGGER NEW SCAN'}
        </button>
    );
}