'use client';

import React, { useState } from 'react';
import { BrainCircuit, ShieldAlert, CheckCircle2, Loader2, Activity, ShieldCheck } from 'lucide-react';
import { Device } from '../types/api';

interface AIAdvisorProps {
  devices: Device[];
}

interface AIResponse {
  network_health_score: number;
  executive_summary: string;
  critical_threats: Array<{
    ip_address: string;
    vulnerability: string;
    immediate_action: string;
  }>;
  general_recommendations: string[];
}

export default function AIAdvisor({ devices }: AIAdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIResponse | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/ai-assessment/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices }),
      });

      if (res.status === 429) throw new Error("Rate limit exceeded. Please wait 60 seconds.");
      if (!res.ok) throw new Error("Failed to generate AI report.");
      
      const json = await res.json();
      
      // --- HARDENED PARSER ---
      // 1. Get the string content
      let rawContent = typeof json.report === 'string' ? json.report : JSON.stringify(json.report);
      
      // 2. Extract ONLY the JSON part (find first '{' and last '}')
      const startIndex = rawContent.indexOf('{');
      const endIndex = rawContent.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("AI returned invalid data format.");
      }
      
      const jsonString = rawContent.substring(startIndex, endIndex + 1);
      const parsedAnalysis: AIResponse = JSON.parse(jsonString);
      
      setAnalysis(parsedAnalysis);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (devices.length === 0) return null;

  return (
    <section className="mb-8">
      {!analysis && !loading && (
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-3 py-4 bg-surface border border-border rounded-xl text-textMain font-bold hover:border-primary hover:bg-primary/5 transition-all focus:ring-2 focus:ring-primary shadow-sm"
        >
          <BrainCircuit className="w-5 h-5 text-primary" />
          Request AI Security Assessment
        </button>
      )}

      {loading && (
        <div className="w-full flex flex-col items-center justify-center py-10 bg-surface border border-border border-dashed rounded-xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-sm font-bold text-textMain tracking-widest uppercase">Consulting Security AI...</p>
        </div>
      )}

      {error && (
        <div className="w-full p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center justify-between mb-4">
          <p className="text-sm text-danger font-medium">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-danger font-bold uppercase hover:underline">Dismiss</button>
        </div>
      )}

      {analysis && !loading && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <BrainCircuit className="absolute -top-10 -right-10 w-48 h-48 text-primary/5 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-border/50 pb-6">
            <div>
              <h2 className="text-xl font-bold text-textMain flex items-center gap-2 mb-2">
                <BrainCircuit className="w-5 h-5 text-primary" /> AI Intelligence Report
              </h2>
              <p className="text-sm text-textMuted italic border-l-2 border-primary/50 pl-3">
                "{analysis.executive_summary}"
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-background px-4 py-3 rounded-lg border border-border">
              <div className="text-right">
                <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest">Network Health</p>
                <p className={`text-3xl font-black ${
                  analysis.network_health_score >= 80 ? 'text-primary' : 
                  analysis.network_health_score >= 50 ? 'text-warning' : 'text-danger'
                }`}>
                  {analysis.network_health_score}<span className="text-sm text-textMuted font-normal">/100</span>
                </p>
              </div>
            </div>
          </div>

          {(analysis?.critical_threats ?? []).length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-danger uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Immediate Action Required
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(analysis?.critical_threats ?? []).map((threat, idx) => (
                  <div key={idx} className="bg-danger/5 border border-danger/20 p-4 rounded-lg">
                    <p className="font-mono text-sm font-bold text-textMain mb-1">{threat.ip_address}</p>
                    <p className="text-xs text-textMuted mb-3 pb-3 border-b border-danger/10">{threat.vulnerability}</p>
                    <p className="text-xs font-bold text-danger flex items-start gap-1.5">
                      <Activity className="w-4 h-4 shrink-0" /> {threat.immediate_action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Hardening Recommendations
            </h3>
            <ul className="space-y-2">
              {(analysis?.general_recommendations ?? []).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-textMuted bg-background p-3 rounded-md border border-border/50">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={handleAnalyze}
            className="mt-6 text-xs text-textMuted font-bold uppercase hover:text-primary transition-colors flex items-center gap-1"
          >
            Refresh Analysis
          </button>
        </div>
      )}
    </section>
  );
}