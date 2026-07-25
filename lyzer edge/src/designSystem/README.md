# Lyzer Edge — Institutional Design System

## Purpose

Visual identity layer for the Lyzer Edge Institutional Command Center v2.
This is not a styling library. It is a **visual governance system** that ensures
every pixel communicates operational truth, not aesthetic preference.

## Architecture

```
src/designSystem/
├── tokens/           ← Atomic design decisions
│   ├── colors.js     ← Backgrounds, borders, text, status semaphores
│   ├── typography.js ← Families, sizes, weights, spacing
│   ├── spacing.js    ← 4px grid, semantic aliases, border radius
│   ├── status.js     ← Fiduciary state definitions (GREEN→RED)
│   └── index.js      ← Barrel export
│
├── theme/            ← Assembled theme with style generators
│   ├── institutionalTheme.js
│   └── index.js
│
├── primitives/       ← Reusable presentational building blocks
│   └── index.js      ← InstitutionalCard, StatusIndicator, MetricCell,
│                        HashDisplay, EvidenceBadge, ReadOnlyBadge,
│                        SecurityBanner, TimelineEvent
│
├── index.js          ← Single entry point for all imports
└── README.md         ← This file
```

## Usage

```javascript
import {
  institutionalTheme,
  InstitutionalCard,
  StatusIndicator,
  MetricCell,
  HashDisplay,
  resolveStatus,
  colors,
  typography,
} from '../designSystem/index.js';
```

## Visual Constitution

See `knowledge/dashboard/design_system_constitution.md` for permanent visual rules.

## Key Principles

1. **Color is a consequence of state.** GREEN/YELLOW/ORANGE/RED — nothing else.
2. **Purple Ban absolute.** No violet, lilac, or magenta anywhere.
3. **Monospace for data.** Hashes, timestamps, metrics use `JetBrains Mono`.
4. **High density.** Maximize information per pixel without sacrificing legibility.
5. **Zero business logic.** Primitives render HTML — they don't know about L15.
6. **Fail-closed.** Unknown status resolves to RED, not a graceful fallback.
