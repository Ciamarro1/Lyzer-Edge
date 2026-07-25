---
titulo: "Lyzer Edge — Mapa Arquitetural"
versao: "3.4.0-institutional"
---

# 🗺️ Lyzer Edge — Mapa Arquitetural

```mermaid
graph LR
    Binance[Binance WS/REST] --> Ingestor[LiveDataIngestor]
    Ingestor --> Providers[V1 SMC | V2 SnD | V3 RSI | V4 IMCE]
    Providers --> RL[ResidualizationLayer DVF]
    RL --> ETT[ExecutionTriggerLayer TRG]
    ETT --> TK[TruthKernel LHDS]
    TK --> Court[Constitutional Court]
    Court --> CCLIST[C-CLIST Stress Oracle]
    Court --> MOL[MOL Recovery State]
    Court --> RiskGateway[gRPC RiskGateway :50051]
    RiskGateway --> IntentRegistry[IntentRegistry :50052]
    IntentRegistry --> NATS[NATS Event Bus :4222]
    NATS --> OMS[Rust Shadow OMS]
```

---

## 🔗 Links Relacionados
- 🏗️ [Arquitetura](architecture.md)
- 🧩 [Componentes](components.md)
