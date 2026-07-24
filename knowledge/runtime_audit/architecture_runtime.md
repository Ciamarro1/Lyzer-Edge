# Etapa 1 & 4 — Mapeamento da Arquitetura Runtime Real e Verificação de Microestrutura

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Data da Auditoria**: 2026-07-24
- **Modo Ativo**: `TESTNET` / `SIMULATION` (Configurado em `lyzer edge/.env`)

---

## 1. Mapeamento da Arquitetura Real em Runtime

Diferente do diagrama conceitual genérico, a inspeção empírica do código executável (`server.js`, `streamEngine.js`, `kernel.js`, `court.js`) revela o fluxo real executado por tick:

```mermaid
flowchart TD
    subgraph INGESTION["1. Ingestão & Escalamento MTF"]
        BinanceWS[Binance WebSocket Live Stream] -->|1m Candles| LiveIngestor[LiveDataIngestor]
        LiveIngestor -->|Accumulate & Aggregate| TFManager[TimeframeManager]
        TFManager -->|Multi-Timeframe Buffers| ScaledBuffers[1m, 5m, 15m, 1h, 4h, 1d]
    end

    subgraph SMC_PIPELINE["2. Pipeline Quantitativo SMC"]
        ScaledBuffers --> TrendEngine[TrendEngine: H4/H1 Bias]
        ScaledBuffers --> StructureEngine[StructureEngine: Fractals, BOS, CHOCH]
        ScaledBuffers --> LiquidityEngine[LiquidityEngine: BSL/SSL Sweeps]
        ScaledBuffers --> TargetEngine[TargetEngine: OB/FVG/Premium-Discount]
        
        TrendEngine & StructureEngine & LiquidityEngine & TargetEngine --> EntryEngine[EntryEngine: Confluence Scoring]
        EntryEngine --> RawSignal[Raw Proposal Signal]
    end

    subgraph GOVERNANCE_7LAYERS["3. Governança e Oráculo Epistêmico em 7 Etapas"]
        RawSignal --> L1[1. Providers: V1 SMC/ICT, V2 SnD, V3 Momentum]
        L1 --> L2[2. ResidualizationLayer: Destruição de Consenso]
        L2 --> L3[3. ExecutionTriggerLayer: TRG >= 0.4]
        L3 --> L4[4. TruthKernel: Validação LHDS & OCL]
        L4 --> L5[5. C-CLIST: Oráculo de Estresse Epistêmico]
        L5 --> L6[6. MOL: Meta-Observation Recovery State]
        L6 --> L7[7. ConstitutionalCourt: Permissão Soberana ECA]
    end

    subgraph EXECUTION["4. Camada de Execução & Riscos"]
        L7 -->|Permission Token: GRANTED| RiskEngine[RiskEngine: Drawdown & Capital Safe]
        RiskEngine -->|Validated Order| OMS[Exchange Execution Gateway / Mock]
        OMS -->|Order Filled| PositionManager[PositionManager: BE, Trailing SL, Partials]

        L7 -.->|Permission Token: VETO| EventLedger[Immutable Event Ledger Audit]
    end
```

---

## 2. Inventário de Componentes e Feature Flags

| Componente | Arquivo de Código | Estado em Runtime | Escopo |
|---|---|---|---|
| **StreamEngine** | `lyzer edge/backend/streamEngine.js` | ATIVO | 6 Instâncias Isoladas (BTC, ETH, SOL, BNB, XRP, ADA) |
| **TimeframeManager** | `packages/lyzer-shared/src/smc/timeframeManager.js` | ATIVO | Timeframes: `1m`, `5m`, `15m`, `1h`, `4h`, `1d` |
| **TrendEngine** | `packages/lyzer-shared/src/smc/trendEngine.js` | ATIVO | Consenso H4/H1 Bias |
| **StructureEngine** | `packages/lyzer-shared/src/smc/structureEngine.js` | ATIVO | Estrutura de Mercado: Swing Highs/Lows, BOS, CHOCH |
| **LiquidityEngine** | `packages/lyzer-shared/src/smc/liquidityEngine.js` | ATIVO | Zonas BSL/SSL, Sweeps, EQH/EQL |
| **TruthKernel** | `packages/lyzer-shared/src/engine/kernel.js` | ATIVO | Instanciado por `StreamEngine` |
| **ConstitutionalCourt** | `packages/lyzer-constitution/src/eca/court.js` | ATIVO | Instanciado por `StreamEngine` |
| **CausalMemoryDB** | `lyzer edge/backend/db.js` | ATIVO | SQLite WAL Mode (`historical_causal_memory.db`) |
| **RiskGateway** | `lyzer edge/src-rust/` (gRPC) | EM MODALIDADE SIMULADA | Chamadas via gateway local/mock |

---

## 3. Resposta de Verificação de Granularidade Temporal (Etapa 4)

- **Pergunta**: *Qual timeframe REAL o sistema utiliza em runtime? Ticks? 5 segundos? 1 minuto?*
- **Evidência do Código (`StreamEngine.js` & `liveDataIngestor.js`)**:
  - O gatilho primário de execução (`processCandle`) é acionado a **cada fechamento de candle de 1 minuto (`1m`)** vindo do WebSocket da Binance (`@kline_1m`).
  - O sistema agrupa dinamicamente os candles de `1m` nos buffers sintéticos de `5m`, `15m`, `1h`, `4h` e `1d` via `TimeframeManager`.
  - **Conclusão**: O sistema opera em **frequência de 1 minuto (`1m`) com análise multi-timeframe sincronizada sem lookahead bias**, e **não em alta frequência sub-segundo (HFT de microsegundos)** na camada JavaScript.
