# Lyzer Edge — Call Graph & Execution Path Analysis

## Primary Call Graph
```
HTTP Request / WS Event
  └─► server.js
        └─► StreamEngine.tick()
              ├─► Providers (V1, V2, V3)
              ├─► ResidualizationLayer
              ├─► ExecutionTriggerLayer
              ├─► TruthKernel
              ├─► C-CLIST & MOL
              └─► ConstitutionalCourt
                    └─► ExchangeExecution (Simulated / Live)
```

## Orphan Analysis
- Zero orphaned core service modules detected in production path.
