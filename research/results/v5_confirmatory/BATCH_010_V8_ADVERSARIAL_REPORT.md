# 🏛️ LYZER EDGE — BATCH 010: V8.2 ADVERSARIAL VALIDATION
**Execution Date:** 2026-08-29T23:31:36.979Z  
**Elapsed Time:** 2.5s  
**Total Independent Models Tested:** 51  

## SUMMARY
The V8.2-DISPLACEMENT-MOMENTUM candidate was subjected to 6 adversarial suites to evaluate its robustness against friction, slippage, intrabar ambiguity, time horizon, threshold tuning, and temporal overlap.

---

### SUITE A: FRICTION & SLIPPAGE LADDER
Testing tolerance to real-world execution costs (Slippage applied per leg, baseline fee 0.08%).

| Slippage (bps) | N | Mean Net | Win Rate | PF | WFA | MaxDD |
|---|---|---|---|---|---|---|
| 0 | 203 | 1.79% | 56.7% | 2.67 | 9/10 | 39.70% |
| 2 | 203 | 1.75% | 56.7% | 2.61 | 9/10 | 41.26% |
| 5 | 203 | 1.69% | 56.7% | 2.52 | 9/10 | 43.60% |
| 10 | 203 | 1.59% | 55.2% | 2.38 | 9/10 | 47.50% |
| 20 | 203 | 1.39% | 52.7% | 2.11 | 7/10 | 55.30% |
| 30 | 203 | 1.19% | 50.7% | 1.88 | 7/10 | 63.10% |
| 50 | 203 | 0.79% | 47.8% | 1.51 | 6/10 | 81.57% |
| 75 | 203 | 0.29% | 44.3% | 1.16 | 5/10 | 135.57% |
| 100 | 203 | -0.21% | 39.9% | 0.90 | 4/10 | 189.57% |

### SUITE B: INTRABAR ADVERSARIAL MODEL
Testing worst-case execution paths if stop-loss mechanics are added.

| Exit Model | N | Mean Net | Win Rate | PF | WFA | MaxDD |
|---|---|---|---|---|---|---|
| TIME_CLOSE | 203 | 1.79% | 56.7% | 2.67 | 9/10 | 39.70% |
| PESSIMISTIC_TRAILING_ATR | 203 | 0.09% | 36.5% | 1.17 | 5/10 | 23.55% |

### SUITE C: HORIZON ROBUSTNESS
Evaluating if 72h is an overfit artifact or a true maturation peak.

| Horizon | N | Mean Net | Win Rate | PF | WFA | MaxDD |
|---|---|---|---|---|---|---|
| 12h | 203 | 0.37% | 49.3% | 1.61 | 7/10 | 24.84% |
| 24h | 203 | 0.70% | 51.2% | 1.83 | 8/10 | 21.11% |
| 36h | 203 | 0.90% | 54.2% | 1.92 | 8/10 | 29.50% |
| 48h | 203 | 1.37% | 56.7% | 2.34 | 9/10 | 23.82% |
| 60h | 203 | 1.55% | 52.2% | 2.41 | 9/10 | 29.02% |
| 72h | 203 | 1.79% | 56.7% | 2.67 | 9/10 | 39.70% |
| 84h | 203 | 1.94% | 57.1% | 2.63 | 8/10 | 38.16% |
| 96h | 203 | 2.14% | 53.7% | 2.71 | 9/10 | 40.52% |
| 120h | 203 | 2.33% | 56.7% | 2.63 | 8/10 | 49.73% |

### SUITE D: THRESHOLD SURFACE ROBUSTNESS
Mapping the parameter space around V8.2 (ATR: 2.0, Body: 0.65).

| ATR Thresh | Body Thresh | N | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|---|
| 1.75 | 0.55 | 305 | 1.35% | 55.7% | 2.08 | 7/10 |
| 1.75 | 0.6 | 299 | 1.27% | 55.9% | 2.02 | 7/10 |
| 1.75 | 0.65 | 289 | 1.28% | 55.7% | 2.03 | 7/10 |
| 1.75 | 0.7 | 263 | 1.29% | 55.9% | 2.03 | 7/10 |
| 1.75 | 0.75 | 217 | 1.54% | 59.0% | 2.46 | 7/10 |
| 2 | 0.55 | 212 | 1.84% | 57.1% | 2.74 | 9/10 |
| 2 | 0.6 | 209 | 1.78% | 56.9% | 2.66 | 9/10 |
| 2 | 0.65 | 203 | 1.79% | 56.7% | 2.67 | 9/10 *(Baseline)*|
| 2 | 0.7 | 189 | 1.69% | 56.6% | 2.54 | 8/10 |
| 2 | 0.75 | 163 | 1.77% | 58.3% | 2.77 | 8/10 |
| 2.25 | 0.55 | 150 | 1.56% | 57.3% | 2.46 | 8/10 |
| 2.25 | 0.6 | 149 | 1.58% | 57.7% | 2.49 | 8/10 |
| 2.25 | 0.65 | 146 | 1.62% | 57.5% | 2.54 | 8/10 |
| 2.25 | 0.7 | 137 | 1.56% | 56.9% | 2.45 | 8/10 |
| 2.25 | 0.75 | 119 | 1.74% | 58.0% | 2.79 | 8/10 |
| 2.5 | 0.55 | 106 | 1.85% | 57.5% | 2.68 | 7/10 |
| 2.5 | 0.6 | 106 | 1.85% | 57.5% | 2.68 | 7/10 |
| 2.5 | 0.65 | 104 | 1.92% | 57.7% | 2.79 | 7/10 |
| 2.5 | 0.7 | 99 | 1.81% | 57.6% | 2.62 | 6/10 |
| 2.5 | 0.75 | 88 | 1.85% | 56.8% | 2.73 | 7/10 |
| 2.75 | 0.55 | 69 | 2.57% | 63.8% | 4.12 | 7/10 |
| 2.75 | 0.6 | 69 | 2.57% | 63.8% | 4.12 | 7/10 |
| 2.75 | 0.65 | 68 | 2.59% | 63.2% | 4.11 | 7/10 |
| 2.75 | 0.7 | 65 | 2.50% | 63.1% | 3.88 | 7/10 |
| 2.75 | 0.75 | 62 | 2.28% | 61.3% | 3.51 | 7/10 |

### SUITE E: TREND FILTER ROBUSTNESS

| Trend Filter | N | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|
| NONE | 280 | 1.14% | 51.4% | 1.91 | 8/10 |
| BULL_SIMPLE | 203 | 1.79% | 56.7% | 2.67 | 9/10 |
| BULL_STRICT | 156 | 1.90% | 57.1% | 2.73 | 9/10 |
| BULL_SLOPE | 192 | 1.74% | 56.8% | 2.60 | 8/10 |

### SUITE F: OVERLAP AUDIT & CAPITAL MODEL
Testing if the N=203 is a statistical illusion caused by holding multiple simultaneous overlapping positions.

| Overlap Mode | N | Mean Net | Win Rate | PF | WFA | MaxDD | Permutation p-val |
|---|---|---|---|---|---|---|---|
| INDEPENDENT | 203 | 1.79% | 56.7% | 2.67 | 9/10 | 39.70% | 0.00000 |
| ONE_POSITION | 114 | 1.13% | 49.1% | 2.01 | 8/10 | 27.39% | 0.04970 |

## FINAL CTO VERDICT
**🔴 REJECT: V8.2 edge was an illusion caused by Overlapping Trades. Independent event WFA collapsed.**
