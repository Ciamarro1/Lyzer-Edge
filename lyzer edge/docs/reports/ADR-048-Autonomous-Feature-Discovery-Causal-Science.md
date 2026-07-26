# ADR-048: Autonomous Feature Discovery & Causal Science Architecture

## Status
**APPROVED / RATIFIED** — M1.9 / Phase 8 Implementation

## Context & Problem Statement
Prior to Phase 8, signal providers relied on static indicators and manual feature engineering. To achieve institutional self-supervised discovery, Lyzer Edge requires engines capable of autonomously discovering high-information features, inferring true causal DAGs (PC algorithm, DirectLiNGAM), embedding multi-asset microstructures, and running multi-agent scientific falsification cycles.

## Decision Drivers
1. **Auto Feature Discovery**: Non-parametric information gain & Kraskov k-NN mutual information.
2. **Causal Discovery**: DirectLiNGAM kernel causality testing eliminating spurious correlation.
3. **Symbol Embeddings**: Multi-asset metric vector space (BTC, ETH, SOL, EURUSD, NASDAQ, Gold, Oil) for analog retrieval.
4. **Self-Supervised & Foundation Models**: TS2Vec / Contrastive InfoNCE representations and TimeGPT/Moirai neural forecasting.
5. **Multi-Agent Science Lab**: 6-agent cognitive loop (`ResearchAgent` -> `StatisticianAgent` -> `QuantAgent` -> `BayesianAgent` -> `GuardianAgent` -> `RegistryAgent`).

## Consequences
- **Positive**: Complete transition from static indicator engineering to autonomous multi-agent quantitative science.
- **Verification**: Certified Platinum via `scripts/architectureCertification.js`. Vitest suite passed 8/8 tests.
