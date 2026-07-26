# LACW — Institutional Design System Specification

## Visual Philosophy
The LACW Design System avoids cookie-cutter component libraries (shadcn default themes, standard Tailwind presets) in favor of a sleek, dark-mode-first institutional aesthetic inspired by deep-space telemetry monitors, high-frequency quant terminals, and cognitive neural interfaces.

---

## Design Tokens

### Color Palette (HSL & Hex)
- **Void Background (`--bg-void`)**: `#040711` (Deep Space Dark)
- **Surface Elevation 1 (`--bg-surface-1`)**: `#0f172a` (Slate Dark)
- **Surface Elevation 2 (`--bg-surface-2`)**: `#1e293b` (Slate Medium)
- **Primary Accent (`--accent-cyan`)**: `#38bdf8` (Cognitive Cyan)
- **Secondary Accent (`--accent-purple`)**: `#a855f7` (Neural Purple)
- **Success / Nominal (`--status-green`)**: `#4ade80` (Nominal Green)
- **Warning / Alert (`--status-yellow`)**: `#facc15` (Warning Yellow)
- **Critical / Veto (`--status-red`)**: `#f87171` (Veto Red)
- **Text Primary (`--text-main`)**: `#f8fafc` (High Contrast White)
- **Text Muted (`--text-muted`)**: `#94a3b8` (Slate Muted)

---

## Typography & Density Modes

### Monospace Protocol
To ensure zero layout jitter during live telemetry streaming, all numbers, tabular metrics, and state badges use monospace typography (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`).

### Density Modes
1. **Compact Density**: 9px–10px font size, 4px padding (Quantitative Terminal Mode)
2. **Standard Density**: 11px–12px font size, 8px padding (Default Focus Mode)
3. **Expanded Density**: 13px–14px font size, 12px padding (Presentation & Executive Mode)

---

## Motion & Micro-Animations
- **State-Driven Only**: Motion communicates state transitions (e.g. preset switch, event publish, regression alert). Purely decorative loops are forbidden.
- **Duration SLA**: Layout transition animations must complete in $\le 150\,\text{ms}$ with `cubic-bezier(0.16, 1, 0.3, 1)` easing.
