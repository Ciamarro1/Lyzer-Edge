# LACW — High-Level System Architecture

## Architecture Layers & System Decomposition

```
+-----------------------------------------------------------------------------------+
|                        LYZER ADAPTIVE COGNITIVE WORKSPACE                         |
|                                    (LACW OS)                                      |
+-----------------------------------------------------------------------------------+
|                               UI / INTERACTION LAYER                              |
|  [LACWWorkspaceWidget]  [Ctrl+K Command Palette]  [Explainability Lineage Modal]  |
+-----------------------------------------------------------------------------------+
|                                CORE ENGINE LAYER                                  |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
|   |  LACWLayoutEngine     | |  LACWWidgetRegistry   | |  LACWCommandPalette   |   |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
|   |  LACWVisualizationEng | |  LACWExplainabilityEng| |  ContinuousMeasurement|   |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
+-----------------------------------------------------------------------------------+
|                              EVENT & MESSAGING LAYER                              |
|                     [LACWEventBus] — Priority Queue & Topic Stream                 |
+-----------------------------------------------------------------------------------+
|                           LYZER EDGE CORE & PIPELINE                              |
|  EvidenceFusion -> HypothesisEngine -> TruthKernel -> C-CLIST -> ECA Court -> Ledger |
+-----------------------------------------------------------------------------------+
```

---

## Key Subsystems

### 1. LACWEventBus
Pub/sub event streaming backbone. Implements priority queuing (`HIGH`, `NORMAL`, `LOW`), wildcard topic filtering (`agent:*`, `layout:*`), backpressure management, and event replay buffers.

### 2. LACWLayoutEngine
Manages workspace docking regions (`LEFT_PANEL`, `CENTER_CANVAS`, `RIGHT_PANEL`, `BOTTOM_DRAWER`, `FLOATING_OVERLAY`). Handles 10 dynamic workspace presets and serializable layout snapshots.

### 3. LACWWidgetRegistry
Manages widget plugin lifecycles, capability declarations (`market_data:read`, `telemetry:read`), permission verification, hot-swapping, and certification levels (`GOLD`, `PLATINUM`).

### 4. LACWCommandPalette
Universal Ctrl+K command execution engine. Supports fuzzy-matched keyword searches, keyboard shortcuts, and direct execution of system actions, workspace presets, and diagnostic queries.

### 5. LACWVisualizationEngine
Framework-agnostic mathematical contract generator for 20+ chart and graph types (Knowledge Graph, Decision Tree, Time-Series, Heatmap, Sankey).

### 6. LACWExplainabilityEngine
Evaluates causal lineage for any system entity, providing Bayesian evidence weight attributions, participating agents, matched memory vectors, and ECA Court approval certificates.
