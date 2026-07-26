# LACW — Decoupled Event Bus Specification

## Overview
The `LACWEventBus` provides a high-throughput, decoupled event streaming backbone. Direct component-to-component references are forbidden.

---

## Event Schema & Priority Structure
```typescript
export interface LACWEvent<T = Record<string, unknown>> {
  readonly id: string;
  readonly topic: string;
  readonly payload: T;
  readonly priority: 'HIGH' | 'NORMAL' | 'LOW';
  readonly sender: string;
  readonly timestamp: number;
  readonly isoTime: string;
}
```

---

## Key Core Topics
- `agent:state:changed`: Agent execution state transitions
- `layout:preset:switched`: Layout engine preset changes
- `plugin:registered`: Plugin SDK registration events
- `command:executed`: Ctrl+K command execution telemetry
- `evidence:fusion:updated`: Live Bayesian evidence posterior scores
