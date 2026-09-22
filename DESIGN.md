# PRAVAAH 3.0 — Stitch AI Design System Specification (`DESIGN.md`)
*Generated under Google Stitch AI Design System Standards for Indian Railways Dynamic ETA*

## 1. Brand Identity & Design Vibe
- **Vibe:** Mission-Critical Rail Operations Hub meets Sleek AI Copilot (Deep Space Slate, Luminescent Cyan, Emerald Clearance, and Amber Telemetry Alerts).
- **Aesthetic:** High-density glassmorphic operational telemetry (inspired by modern air traffic control, Bloomberg Terminal, and Apple HIG dark mode).
- **Core Philosophy:** Zero visual clutter, instant cognitive readability, spatial hierarchy, sub-millisecond perceived performance.

---

## 2. Design Tokens & Color Palette

### Base Surfaces (Dark Spectrum)
| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `surface-canvas` | `#080D1A` | Deepest atmospheric background |
| `surface-card` | `rgba(18, 27, 46, 0.85)` | Primary card container with backdrop blur |
| `surface-card-hover` | `rgba(24, 36, 61, 0.95)` | Interactive hovered card |
| `surface-elevated` | `#16213A` | Nested micro-containers, pill chips, inner wells |
| `surface-border` | `rgba(79, 216, 230, 0.15)` | Luminescent cyan borders |
| `surface-border-subtle`| `rgba(46, 60, 91, 0.45)` | Structural dividers and gridlines |

### Semantic Indicators
| Token Name | Hex Code | Tailwind Equivalent | Role |
| :--- | :--- | :--- | :--- |
| `brand-cyan` | `#4FD8E6` | `cyan-400` | Primary accent, dynamic ETA, active GPS station |
| `brand-cyan-glow` | `rgba(79, 216, 230, 0.35)` | `shadow-cyan-500/20` | Dynamic pulse halos, focal points |
| `signal-green` | `#34C77B` | `emerald-400` | Punctual status, passed stations, speed clearance |
| `signal-amber` | `#F2A93B` | `amber-400` | Moderate delay (+5m to +15m), caution advisory |
| `signal-red` | `#EA5A5A` | `rose-500` | Severe delay (>20m), emergency TSR order |
| `signal-purple` | `#9B7FE8` | `violet-400` | High-priority express routing & precedence |

### Typography Scale
- **Sans-Serif (Body & Headers):** `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace (Timers, Coordinates, Speeds, ETAs):** `'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace`
- **Scale:**
  - `hero-timer`: `38px` / Line-height `1.05` / Monospace / Bold 700
  - `heading-lg`: `22px` / Letter-spacing `0.03em` / Semi-Bold 600
  - `heading-md`: `16px` / Semi-Bold 600
  - `body-default`: `13px` / Regular 400
  - `caption`: `11px` / Medium 500 / Letter-spacing `0.04em`

---

## 3. Elevation & Glassmorphic Standards
- **Backdrop Filter:** `backdrop-filter: blur(16px) saturate(180%);`
- **Glow Shadows:** `box-shadow: 0 4px 28px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(79, 216, 230, 0.12);`
- **Radius Standards:**
  - Outer Containers: `16px`
  - Inner Cards & Widgets: `12px`
  - Chips & Pills: `9999px` (full pill)
  - Interactive Buttons: `10px`

---

## 4. Micro-Interactions & Animations
- **Live Heartbeat Pulse (`pulseLive`):** 1.8s ease-in-out breathing rhythm for active satellite & RTIS markers.
- **Section Transition (`fadeIn`):** 0.25s ease-out smooth upward entry for tab switches.
- **Flash Refresh (`flashGreen`):** 1s luminous glow when live polling triggers.
- **Timeline Progression:** Color-coded SVG track nodes with passed (emerald), active (cyan glow pulse), and upcoming (slate outline).

---

## 5. Component Registry
1. **Glassmorphic Hero Card:** Floating station-to-destination vector banner with real-time speed, cab signaling aspect, and recovery slack.
2. **Dynamic Progress Ribbon:** Dual-tone gradient progress bar indicating corridor transit percentage with live kilometer markers.
3. **High-Density Multi-Scale Station Timeline:** Micro-nodes for small wayside stations and macro-badges for terminal junctions.
4. **TreeSHAP Attribution Bars:** Visual bar charts for explainable AI delay decomposition.
5. **Jury Diurnal Scrubber:** 24-hour temporal controller with instant slider-reactive state synthesis.
