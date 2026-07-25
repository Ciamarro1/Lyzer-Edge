---
titulo: "Lyzer Edge — Fluxo de Execução"
versao: "3.4.0-institutional"
---

# ⚡ Lyzer Edge — Fluxo de Execução

## 🔄 Ciclo de Vida do Tick ao Sinal de Execução

```mermaid
sequenceDiagram
    autonumber
    actor Market as Binance WebSocket
    participant Ingestor as LiveDataIngestor
    participant Engine as StreamEngine
    participant Providers as Providers (V1-V4)
    participant RL as ResidualizationLayer
    participant TK as TruthKernel
    participant Court as ECA Court
    participant RG as RiskGateway (Rust)

    Market->>Ingestor: Tick Data (Price/Volume)
    Ingestor->>Engine: emit('tick', candle)
    Engine->>Engine: checkTickPositionExit(candle)
    Note over Engine: Valida SL/TP por Tick em Tempo Real
    Engine->>Providers: evaluate(mtfCandles)
    Providers-->>Engine: signals (v1, v2, v3, v4)
    Engine->>RL: extractDivergence(v1, v2, v3, v4)
    RL-->>Engine: DVF & TRG
    Engine->>TK: evaluate(providers, micro)
    TK-->>Engine: EEF, LHDS, EpistemicAuthority
    Engine->>Court: evaluate(eef, trg, dvf, micro)
    Court-->>Engine: ALLOW / REJECT
    alt Status == ALLOW
        Engine->>RG: Authorize(UUIDv7, Symbol, Side, Size)
        RG-->>Engine: Granted / Denied
    end
```

---

## 🔗 Links Relacionados
- 🏗️ [Arquitetura](architecture.md)
- 🔄 [Ciclo de Vida do Sistema](system-lifecycle.md)
