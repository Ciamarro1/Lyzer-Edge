# LACW — Layout Engine Architecture & Persistence

## Overview
The `LACWLayoutEngine` governs dynamic docking, multi-panel rearrangement, workspace presets, and serializable layout snapshots.

---

## Docking Regions
```
+-------------------------------------------------------------------------+
|                              TOP BAR                                    |
+-------------------+--------------------------------+--------------------+
|                   |                                |                    |
|   LEFT_PANEL      |         CENTER_CANVAS          |    RIGHT_PANEL     |
|   (Width: 280px)  |         (Flex: 1)              |    (Width: 360px)   |
|                   |                                |                    |
+-------------------+--------------------------------+--------------------+
|                           BOTTOM_DRAWER                                 |
|                           (Height: 180px)                               |
+-------------------------------------------------------------------------+
```

---

## Workspace Presets & Default Widget Mapping

| Preset Name | Left Panel | Center Canvas | Right Panel | Operational Focus |
|---|---|---|---|---|
| **EXECUTIVE** | `reality-status` | `continuous-measurement`, `statistical-rigor` | `court` | Executive oversight & risk vetoes |
| **RESEARCH** | `autonomous-discovery` | `chart-host`, `causal-graph` | `research-lab`, `alpha-discovery` | Quantitative feature & alpha research |
| **REVENUE** | `reality-status` | `chart-host` | `evidence-fusion` | Real-time trading & signal fusion |
| **OBSERVABILITY** | `runtime-inspector` | `observability-dashboard` | `continuous-measurement` | System latency & telemetry metrics |

---

## Snapshot & Restoration API
```javascript
const layout = new LACWLayoutEngine(eventBus);
layout.switchPreset('RESEARCH');
const snapshot = layout.saveSnapshot('my_research_setup');
layout.restoreSnapshot('my_research_setup');
```
