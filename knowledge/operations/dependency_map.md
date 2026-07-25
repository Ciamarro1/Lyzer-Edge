# 🗺️ L10 Dependency Map (Data to Execution)
**Date:** Julho 2026
**Layer:** Institutional Observability

A força do Lyzer não reside em suas partes isoladas, mas na inflexibilidade do seu pipeline. Nenhuma ordem pula etapas.

## PIPELINE INSTITUCIONAL ABSOLUTO

```mermaid
graph TD
    A[DATA: Market Tick/Candle] --> B[SIGNAL: SMC/V4 Engine]
    B --> C[VALIDATION: Truth Kernel / C-CLIST]
    C --> D[GOVERNANCE: Institutional Reality Score]
    D --> E[MACRO ALLOCATION: Capital Allocation Governor L10]
    E --> F[MICRO RISK: Capital Governor L8.5]
    F --> G[SIZING: Portfolio Manager L9]
    G --> H[EXECUTION: Order Routing]
    H --> I[TELEMETRY: Shadow Trading Telemetry L8]
    I --> J[AUDIT: Continuous Alpha Auditor L10]
    J -.->|Feedback Loop (Decay)| E
```

## DESCRIÇÃO DAS CAMADAS

1. **DATA:** Alimentação primária corrompível. Injetada por caos em simulação.
2. **SIGNAL:** A proposição pura do Edge.
3. **VALIDATION:** Vetos ontológicos e perda de Causalidade.
4. **GOVERNANCE (IRS):** Medição da qualidade operacional da corretora e da latência.
5. **MACRO ALLOCATION (L10):** Define o regime total do Fundo (Defensivo, Alocação Total).
6. **MICRO RISK (L8.5):** Regula a velocidade da perda (Loss Velocity) trade-a-trade.
7. **SIZING (L9):** Impede a auto-fricção Logarítmica do lote.
8. **EXECUTION:** Disparo.
9. **TELEMETRY (L8):** Gravação SQLite assíncrona.
10. **AUDIT (L10):** Verificação estatística do modelo com retroalimentação ao MACRO.
