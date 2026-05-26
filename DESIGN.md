# PortWarden Design System & Visual Strategy

This document outlines the visual identity and user experience (UX) strategy for PortWarden. The goal is to move beyond generic, out-of-the-box UI templates and establish a cohesive, modern, and highly engaging interface that reflects the project's identity as an advanced network auditing tool.

## 1. Core Aesthetic Vision
**"Cyber-Tactical yet Accessible"**

PortWarden should feel like a sophisticated piece of security software—reminiscent of mission control interfaces or cyberpunk aesthetics, but polished, clean, and highly usable for everyday IT professionals. It should balance dark-mode intensity with vibrant, purposeful accents.

### Keywords
- Technical, Precise, Immersive, Dynamic, Authoritative, Sleek.

## 2. Color Palette & Theming
To avoid looking generic, the color palette must be deeply integrated into the data visualization, not just the background and text.

*   **Background (The Canvas):** Deep, rich darks. Avoid pure black (`#000000`). Instead, use deep navy/charcoals (e.g., `#0A0E17`, `#0F172A`) to provide a sense of depth and reduce eye strain.
*   **Surfaces (Cards/Panels):** Slightly lighter shades with subtle transparency and background blurs (frosted glass/glassmorphism effects) to create a layered interface. (e.g., `rgba(15, 23, 42, 0.6)` with `backdrop-filter: blur(10px)`).
*   **Accents (The "Cyber" Element):**
    *   **Primary (Brand):** Electric Cyan or Neon Blue (e.g., `#06B6D4` or `#3B82F6`) for active states, primary buttons, and gateway nodes.
    *   **Success/Secure:** Vibrant Emerald Green (`#10B981` or `#22C55E`) for low-risk status.
    *   **Warning/Moderate:** Amber/Gold (`#F59E0B`) for moderate risks.
    *   **Danger/Critical:** Crimson Red or Neon Pink (`#EF4444` or `#E11D48`) for severe vulnerabilities.

## 3. Typography
A strong typographic hierarchy immediately elevates a design from generic to custom.

*   **Primary Font (UI & Headers):** A clean, geometric sans-serif like *Inter*, *Geist*, or *Outfit*. This provides a modern, readable foundation.
*   **Secondary Font (Data & Terminals):** A highly legible monospace font for IP addresses, MAC addresses, port numbers, and the Scan Console. Examples: *JetBrains Mono*, *Fira Code*, or *Space Mono*.
*   **Styling Strategy:**
    *   Use heavy font weights (ExtraBold, Black) for main headers and critical data points.
    *   Use wide tracking (letter-spacing) and uppercase for small utility labels (e.g., `LAST SEEN`, `RISK LEVEL`).

## 4. UI/UX Elements & Details (Breaking the Mold)

Generic designs often rely on flat rectangles and standard drop shadows. Here is how PortWarden differentiates itself:

### A. Borders and Glows
*   Instead of standard gray borders, use low-opacity accent colors (e.g., `border-blue-500/20`).
*   On hover or focus, transition to a brighter border with a subtle outer glow (`box-shadow: 0 0 15px rgba(59, 130, 246, 0.3)`) to make elements feel "active."

### B. Micro-interactions and Animation
*   **Data Loading:** Avoid generic spinners. Use skeleton loaders with a sweeping highlight, or animate a "scanning" laser line across the screen.
*   **State Changes:** Use smooth transitions for color changes. If a device's risk level changes, the card should pulse its new color briefly.
*   **Scan Console:** The terminal output should type out smoothly or scroll with a slight easing effect, simulating a real high-tech terminal.

### C. Depth and Layering (Glassmorphism)
*   The Topology Map should sit on the base background. Overlay controls, legends, and status panels on top of the map using semi-transparent, blurred backgrounds (backdrop-blur). This makes the app feel like a single, cohesive dashboard rather than a collection of distinct blocks.

### D. Data Visualization (The Topology Map)
*   **Interactive Nodes:** Nodes should have subtle pulsing animations, especially the gateway or high-risk nodes.
*   **Links/Edges:** Instead of static lines, the lines connecting nodes should have flowing particles (which is already configured via `linkDirectionalParticles` in ForceGraph2D) to simulate network traffic.
*   **Gradients:** Use gradients on critical UI elements (like the overall risk score) rather than flat colors to add richness.

### E. Iconography
*   Use a consistent, sharp icon set (like the current *Lucide React* icons).
*   Pair icons with text labels wherever possible to enhance readability and reinforce the technical theme. Encase icons in small, subtly colored background squares (`bg-primary/10`) to give them more presence.

## 5. Layout & Composition
*   **Asymmetry:** Break away from rigid grids where possible. A large, prominent Topology Map paired with a dense, vertically scrolling list of devices creates visual interest.
*   **Information Density:** Technical tools need high information density, but they shouldn't be cluttered. Group related data tightly, but leave generous margins between major sections (Map, Stats, Device Grid) to let the interface breathe.
*   **Data "Tags":** Present metadata (like "OPEN", "FILTERED", "HIGH RISK") as small, pill-shaped tags with stark background/text contrast rather than plain text.

## 6. Implementation Checklist
To implement this vision in Tailwind CSS:

1.  [ ] Define custom colors in `tailwind.config.ts` matching the palette above.
2.  [ ] Import and configure the chosen sans-serif and monospace fonts.
3.  [ ] Implement a global background color (deep navy/charcoal) in `globals.css`.
4.  [ ] Update device cards to use glassmorphism (`bg-surface/80 backdrop-blur-md border border-white/5`).
5.  [ ] Add subtle glow effects to critical buttons and status tags.
6.  [ ] Ensure all text has adequate contrast against the dark backgrounds.
