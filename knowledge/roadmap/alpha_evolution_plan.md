# Alpha Evolution Plan — Prioritized Roadmap

**Mission**: L4 — Alpha Evolution Program  
**Date**: 2026-07-24  
**Owner**: Lyzer Orchestrator

---

## Quick Wins (Alto Impacto, Baixo Risco)

| # | Improvement | Hypothesis | Evidence | Cost | Benefit | Risk | Approval |
|:---:|---|---|---|:---:|:---:|:---:|:---:|
| QW1 | ✅ TRG exponent configurable | TRG² unlocks more signals | Math analysis | LOW | HIGH | LOW | Done |
| QW2 | ✅ Dead code cleanup (V1 memory) | Reduces confusion | Code audit | LOW | LOW | NONE | Done |
| QW3 | Fix V4 hardcoded spread | Use live spread data | Code audit | LOW | MED | NONE | Ready |
| QW4 | Fix slippage model | Use realistic slippage | Code audit | LOW | MED | NONE | Ready |
| QW5 | Fix ETT default (0.8→0.4) | Constructor matches usage | Code audit | LOW | LOW | NONE | Ready |

## Research Experiments (Necessitam Dados Históricos)

| # | Experiment | Hypothesis | Evidence Needed | Cost | Benefit | Risk | Approval |
|:---:|---|---|---|:---:|:---:|:---:|:---:|
| RE1 | Consensus destruction A/B | `consensusLimit=0` improves Sharpe | ReplayEngine + 6mo data | MED | HIGH | MED | p < 0.05 |
| RE2 | TRG exponent sweep | Find optimal exponent (1-4) | ReplayEngine + 6mo data | MED | HIGH | LOW | p < 0.05 |
| RE3 | TRG threshold sensitivity | Find optimal threshold (0.1-0.8) | ReplayEngine + 6mo data | MED | HIGH | LOW | p < 0.05 |
| RE4 | V4 solo vs ensemble | Is V4 alone better? | ReplayEngine + 6mo data | MED | HIGH | MED | p < 0.05 |
| RE5 | RSI threshold calibration | Find optimal RSI levels | ReplayEngine + 6mo data | MED | MED | LOW | p < 0.05 |
| RE6 | LHDS veto sensitivity | Find optimal LHDS limit | ReplayEngine + 6mo data | MED | MED | LOW | p < 0.05 |
| RE7 | Regime-filtered trading | Skip unfavorable regimes | ReplayEngine + regimeClassifier | HIGH | HIGH | MED | p < 0.05 |
| RE8 | ATR-adaptive SL/TP | 1.5×ATR SL vs static % | ReplayEngine + 6mo data | MED | HIGH | LOW | p < 0.05 |

## Architectural Improvements (Mudanças Estruturais)

| # | Improvement | Hypothesis | Evidence Needed | Cost | Benefit | Risk | Approval |
|:---:|---|---|---|:---:|:---:|:---:|:---:|
| AI1 | V1 dedup vs SMC Engine | Remove V1 or merge with SMC | Attribution analysis | MED | MED | MED | ADR |
| AI2 | Ensemble signal combination | Replace priority with weighted ensemble | Feature importance | HIGH | HIGH | HIGH | ADR + ARB |
| AI3 | Dynamic position sizing | Kelly-based or risk-parity | Replay backtests | HIGH | HIGH | HIGH | ADR + ARB |
| AI4 | Cross-asset correlation | Share state between 6 engines | Architecture design | VERY HIGH | MED | HIGH | ADR + ARB |
| AI5 | Historical data loader | Load OHLCV from CSV/Binance | Implementation | MED | CRITICAL | LOW | Direct |

## Future Capabilities

| # | Capability | Hypothesis | Cost | Timeline |
|:---:|---|---|:---:|:---:|
| FC1 | Alpha drift detection | Deployed config degrades over time | MED | ✅ `alphaEvolutionEngine.js` |
| FC2 | Regime-adaptive thresholds | Adjust all params per regime | HIGH | After RE7 |
| FC3 | Feature importance (permutation) | Some features are negative value | HIGH | After AI5 |
| FC4 | ML regime predictor | Predict regime shifts 1-step ahead | VERY HIGH | After FC2 |
| FC5 | Automated A/B testing pipeline | CI/CD for alpha evolution | VERY HIGH | After FC1+FC3 |

---

## Execution Priority Matrix

```
                    HIGH BENEFIT
                        │
         ┌──────────────┼──────────────┐
         │  RE1, RE2,   │  AI2, AI3    │
  LOW    │  RE3, RE4,   │  FC2, FC3    │  HIGH
  COST   │  RE7, RE8    │              │  COST
         │  QW3-5       │              │
         ├──────────────┼──────────────┤
         │  RE5, RE6    │  AI4, FC4    │
         │  AI1         │  FC5         │
         │              │              │
         └──────────────┼──────────────┘
                        │
                    LOW BENEFIT
```

**Recommended execution order**:
1. AI5 (Historical data loader) — unblocks everything
2. QW3-5 (Quick fixes) — immediate quality
3. RE1-RE4 (Core experiments) — evidence gathering
4. RE7 (Regime filter) — likely highest impact
5. AI2 (Ensemble signals) — if feature importance shows need
