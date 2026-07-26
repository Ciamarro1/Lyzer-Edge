# Lyzer Edge — Complete Architecture & Subsystem Map

## System Topology & Subsystems

```
                               ┌────────────────────────────────┐
                               │   Dashboard Node (SPA Frontend)│
                               └───────────────┬────────────────┘
                                               │ WebSocket / HTTP
                               ┌───────────────▼────────────────┐
                               │  Execution Node (Node.js App)  │
                               └───────────────┬────────────────┘
                                               │ gRPC / Protobuf
                               ┌───────────────▼────────────────┐
                               │ ECA Court Node (Rust Kernel)   │
                               └────────────────────────────────┘
```

### Core Pipeline Layers (In Execution Order)
1. **Providers V1/V2/V3**: Candle signal generation
2. **ResidualizationLayer**: Provider consensus destruction
3. **ExecutionTriggerLayer**: TRG threshold gate (≥ 0.4)
4. **TruthKernel**: LHDS & Ontological Collapse veto
5. **C-CLIST**: Stress oracle & lethal illusion limit
6. **MOL**: Memory & Recovery state machine
7. **Constitutional Court**: Final EEF & constraint engine
