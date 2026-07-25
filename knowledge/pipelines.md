---
titulo: "Lyzer Edge — Pipelines Quantitativos"
versao: "3.4.0-institutional"
---

# ⛓️ Lyzer Edge — Pipelines Quantitativos

1. **Pipeline de Ingestão de Dados**: WebSocket Binance -> `LiveDataIngestor` -> Velas Multi-Timeframe (1m, 5m, 15m).
2. **Pipeline de Avaliação de Sinais**: `V1 SMC` + `V2 SnD` + `V3 RSI` + `V4 IMCE` -> `ResidualizationLayer`.
3. **Pipeline de Decisão e Governança**: `TruthKernel` -> `C-CLIST` -> `MOL` -> `ConstitutionalCourt` -> `RiskGateway`.

---

## 🔗 Links Relacionados
- ⚡ [Fluxo de Execução](execution-flow.md)
- 🏗️ [Arquitetura](architecture.md)
