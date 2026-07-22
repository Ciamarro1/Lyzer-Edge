---
proposito: "Visão geral da arquitetura de 3 processos isolados do Lyzer Edge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "AGENTS.md"
  - "lyzer edge/docs/runtime_topology.md"
  - "lyzer edge/backend/server.js"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Visão Geral da Arquitetura — Lyzer Edge

O Lyzer Edge é projetado em torno do princípio da **isolamento de responsabilidades em 3 processos autônomos**, garantindo que a execução financeira nunca seja corrompida por problemas no event loop de I/O ou no painel de controle.

```mermaid
graph TB
    subgraph P1["Processo 1: Node.js Backend & Dashboard Node"]
        HTTP[Express 5 REST API]
        WS[WebSocket Server / Tick Broadcaster]
        SE[StreamEngine Instances x6]
        ING[LiveDataIngestor Binance WS]
    end

    subgraph P2["Processo 2: ECA Court Node (Rust Hub / JS Court)"]
        TK[TruthKernel - LHDS & TRG]
        CCLIST[Continuous CLIST Stress Oracle]
        MOL[Meta-Observation Layer]
        COURT[Constitutional Court - Sovereign Gate]
        LEDGER[Immutable Event Ledger]
    end

    subgraph P3["Processo 3: Execution Node (Rust / NATS)"]
        NATS[NATS JetStream Spine]
        RG[RiskGateway gRPC Service]
        IR[Intent Registry DB]
        OMS[Exchange Execution Gateway]
    end

    ING -->|Candles| SE
    SE -->|Compute Reality| TK
    TK -->|Evaluate Stress| CCLIST
    CCLIST -->|Status| MOL
    MOL -->|EEF & State| COURT
    COURT -->|Permission Token| SE
    SE -->|Authorize Intent| RG
    RG -->|Publish Intent Event| NATS
    NATS -->|Route Order| OMS
    COURT -->|Append Audit| LEDGER
    SE -->|UI Overlays| WS
```

## Descrição dos 3 Processos

1. **Dashboard Node (`Processo 1`)**: Responsável por manter a API REST (porta 7860), orquestrar as instâncias `StreamEngine`, alimentar o WebSocket do frontend e prover a interface visual.
2. **ECA Court Node (`Processo 2`)**: O oráculo de julgamento constitucional. Avalia a Tail Risk Geometry ($\text{TRG}$) e o estresse de iludibilidade ($\text{C-CLIST}$). Opera com independência para vetar qualquer ordem que viole o axioma constitucional.
3. **Execution Node (`Processo 3`)**: O plano de execução de baixa latência em Rust, impulsionado por NATS JetStream e gRPC (`RiskGateway`, `IntentRegistry`).
