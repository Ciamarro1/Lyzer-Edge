# 🏛️ LYZER EDGE — BATCH 013: DISCOVERY REPORT
**Execution Date:** 2026-08-30T00:16:59.578Z  
**Elapsed Time:** 1.3s  
**Hypothesis:** H009 (Wyckoff Spring / Volume Rejection)  
**Status:** EXPLORATORY  

## H009-A & D: SIGNAL VS NEGATIVE CONTROLS
Does the specific structure (Pierce + High Volume Rejection) contain more information than Continuation or Random Placebo?

| Mode | N Events | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|
| SPRING | 70 | 0.53% | 64.3% | 1.64 | 7/10 |
| CONTROL_CONT | 15 | -0.26% | 53.3% | 0.76 | 4/10 |
| PLACEBO (Avg of 5) | 277 | 0.03% | 47.8% | 1.04 | 6/10 |

## H009-B: DOSE-RESPONSE (Volume Z-Score)
Does higher volume rejection predict higher future return? (OLS Regression against Net Return)

| Z-Score >= | N Events | Mean Net | Win Rate | PF | OLS Slope | R² |
|---|---|---|---|---|---|---|
| 1.0 | 89 | 0.37% | 60.7% | 1.43 | -0.000330 | 0.0020 |
| 1.5 | 82 | 0.40% | 61.0% | 1.44 | -0.000399 | 0.0028 |
| 2.0 | 76 | 0.47% | 63.2% | 1.55 | -0.000590 | 0.0059 |
| 2.5 | 70 | 0.53% | 64.3% | 1.64 | -0.000776 | 0.0106 |
| 3.0 | 56 | 0.25% | 58.9% | 1.27 | -0.000290 | 0.0016 |
| 3.5 | 48 | 0.29% | 58.3% | 1.30 | -0.000381 | 0.0026 |

## H009-F: HORIZON SWEEP
At what horizon does the Reversion edge decay?

| Horizon | N Events | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|
| 12h | 70 | 0.43% | 55.7% | 1.74 | 7/10 |
| 24h | 70 | 0.53% | 64.3% | 1.64 | 7/10 |
| 36h | 70 | 0.18% | 61.4% | 1.14 | 4/10 |
| 48h | 70 | 0.32% | 54.3% | 1.26 | 6/10 |
| 72h | 70 | 0.54% | 55.7% | 1.36 | 6/10 |

## H009-E: FRICTION TOLERANCE

| Slippage (bps) | N Events | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|
| 0 | 70 | 0.53% | 64.3% | 1.64 | 7/10 |
| 5 | 70 | 0.43% | 61.4% | 1.50 | 6/10 |
| 15 | 70 | 0.23% | 55.7% | 1.25 | 6/10 |
| 30 | 70 | -0.07% | 48.6% | 0.94 | 5/10 |
