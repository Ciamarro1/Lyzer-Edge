# LACW — Adaptive Workspace State Engine

## Overview
The Workspace State Engine monitors systemic state transitions (e.g. regime shifts, threat level increases, anomalous latency spikes) and automatically adapts workspace priorities.

---

## State Transition Flow

```
[System Event / Market Anomaly]
               |
               v
       [LACWEventBus]
               |
               v
 [Workspace State Engine]
               |
  +------------+------------+
  |                         |
  v                         v
(High Risk Spike)    (Alpha Discovery)
  |                         |
  v                         v
Switch Preset:       Switch Preset:
INCIDENT_RESPONSE     RESEARCH
```

---

## Automatic Preset Trigger Policies
- **Tail Risk Geometry Spike ($\text{TRG} < 0.20$)**: Triggers auto-switch to `INCIDENT_RESPONSE`.
- **ECA Court Veto Triggered**: Triggers auto-switch to `GOVERNANCE`.
- **High Volatility Drift Event**: Triggers auto-switch to `OBSERVABILITY`.
