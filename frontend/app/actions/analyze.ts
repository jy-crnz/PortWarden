'use server';

import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { Device } from '../../types/api';

// 1. Configure OpenRouter (Mirroring your Express setup)
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'PortWarden Security',
  }
});

// 2. Define the Strict Data Contract (Zod Schema)
const analysisSchema = z.object({
  network_health_score: z.number().describe("A score from 0 to 100 representing overall network security."),
  executive_summary: z.string().describe("A professional, 2-sentence summary of the network state."),
  critical_threats: z.array(
    z.object({
      ip_address: z.string(),
      vulnerability: z.string().describe("What is the actual risk?"),
      immediate_action: z.string().describe("Actionable fix (e.g., 'Disable Telnet')"),
    })
  ).describe("List of high-risk nodes. Return an empty array if none exist."),
  general_recommendations: z.array(z.string()).describe("3 to 5 general network hardening tips."),
});

// 3. The Server Action
export async function analyzeNetworkState(devices: Device[]) {
  try {
    // Strip out unnecessary heavy data
    const simplifiedData = devices.map(d => ({
      ip: d.ip_address,
      risk: d.risk_level,
      vendor: d.vendor,
      open_ports: d.ports.map(p => `${p.port_number} (${p.service_name}) - ${p.state}`)
    }));

    // Use the exact model that worked in your Express app
    const { object } = await generateObject({
      model: openrouter('google/gemini-2.0-flash-001'), 
      schema: analysisSchema,
      prompt: `
        You are an elite cybersecurity architect analyzing a network scan.
        Analyze this JSON network state and provide a strict security assessment.
        Do not invent vulnerabilities. Only analyze the provided data.

        Network Data:
        ${JSON.stringify(simplifiedData, null, 2)}
      `,
    });

    return { success: true, data: object };

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    return { success: false, error: "Failed to generate AI analysis using OpenRouter. Please try again." };
  }
}