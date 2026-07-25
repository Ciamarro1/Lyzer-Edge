---
titulo: "Lyzer Edge — Arquitetura de Sistemas"
versao: "3.4.0-institutional"
data: "2026-07-25"
---

# 🏗️ Lyzer Edge — Arquitetura de Sistemas

A arquitetura do Lyzer Edge é estruturada em monorepo com workspaces desacoplados em Node.js (ESM), Rust (Edition 2024), Protobuf gRPC e NATS Event Bus.

---

## 📐 Camadas Arquiteturais

1. **Ingestão & Telemetria**: `liveDataIngestor.js` conecta via WebSocket à Binance para emitir klines de 1m, 5m, 15m.
2. **Provider Ensemble (V1--V4)**:
   - **V1**: `v1_smc_ict.js` (Smart Money Concepts / ICT FVG & Liquidity Sweeps).
   - **V2**: `v2_snd_snr.js` (Supply & Demand Structural Boundaries).
   - **V3**: `v3_momentum_rsi.js` (Momentum RSI Divergence).
   - **V4**: `v4_imce.js` (Institutional Microstructure Causality Engine).
3. **ResidualizationLayer**: Calcula a distância par-a-par máxima (DVF) e destrói o consenso (`isConsensus`).
4. **ExecutionTriggerLayer**: Mede o *Tail Risk Geometry* (TRG) contra o limiar de gatilho (`TRG_THRESHOLD >= 0.4`).
5. **TruthKernel**: Avalia LHDS e OCL para determinar a Autoridade Epistêmica (`OBSERVED`, `INFERRED`, `VETO`).
6. **ECA Court & Stress Oracle**:
   - **C-CLIST**: Acumula estresse estrutural quando DVF é plano. Bloqueia a `lethalIllusionLimit` (0.9).
   - **MOL**: Gerencia a transição de estado `EXECUTE -> VETO -> RECOVERY` (requer `sclThreshold` ticks estáveis).
7. **gRPC RiskGateway & IntentRegistry**:
   - Valida autorização final em Rust via gRPC (`RiskGateway.Authorize`) com rastreabilidade por **UUIDv7**.

---

## 🔗 Links Relacionados
- 🌐 [Overview](overview.md)
- 🗺️ [Mapa Arquitetural](architecture-map.md)
- 🧩 [Módulos](modules.md)
