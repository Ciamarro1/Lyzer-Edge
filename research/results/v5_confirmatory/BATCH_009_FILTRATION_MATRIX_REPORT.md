# 🏛️ LYZER EDGE — BATCH 009: V8.2 FILTRATION & HORIZON MATRIX
**Execution Date:** 2026-08-29T23:10:29.177Z  
**Elapsed Time:** 4.6s  
**Total Independent Models Tested:** 24  
**FWER Corrected Alpha (Bonferroni):** 0.00042  

## SUMMARY
To address the low N and WFA failure of V8.0, a matrix of 24 independent experiments was executed concurrently via isolated worker threads. 

**Verdict:** 🟢 FOUND ROBUST SUB-FAMILY

## MATRIX RESULTS

| Trend Filter | FVG Required | Horizon | N | Mean Net | Win Rate | PF | WFA | p-value | Viable |
|---|---|---|---|---|---|---|---|---|---|
| BULL_STRICT | NONE | 48h | 156 | 1.57% | 61.5% | 2.59 | 10/10 | 0.00310 | 🔴 NO |
| BULL_STRICT | NONE | 72h | 156 | 1.98% | 58.3% | 2.86 | 9/10 | 0.00040 | 🟢 YES |
| BULL_SIMPLE | NONE | 72h | 203 | 1.87% | 57.6% | 2.81 | 9/10 | 0.00000 | 🟢 YES |
| BULL_SIMPLE | NONE | 48h | 203 | 1.45% | 58.1% | 2.47 | 9/10 | 0.00040 | 🟢 YES |
| NONE | NONE | 72h | 280 | 1.22% | 52.5% | 2.00 | 9/10 | 0.00330 | 🔴 NO |
| BULL_STRICT | NONE | 24h | 156 | 0.94% | 57.7% | 2.23 | 8/10 | 0.00400 | 🔴 NO |
| BULL_SIMPLE | NONE | 24h | 203 | 0.78% | 53.2% | 1.97 | 8/10 | 0.00390 | 🔴 NO |
| NONE | NONE | 48h | 280 | 0.97% | 52.1% | 1.89 | 8/10 | 0.00330 | 🔴 NO |
| NONE | NONE | 12h | 280 | 0.28% | 48.6% | 1.47 | 8/10 | 0.01250 | 🔴 NO |
| BULL_STRICT | REQUIRED | 72h | 65 | 1.90% | 55.4% | 2.85 | 7/10 | 0.02080 | 🔴 NO |
| BULL_SIMPLE | REQUIRED | 12h | 86 | 0.60% | 53.5% | 2.12 | 7/10 | 0.01350 | 🔴 NO |
| BULL_STRICT | NONE | 12h | 156 | 0.55% | 52.6% | 2.01 | 7/10 | 0.00290 | 🔴 NO |
| BULL_SIMPLE | NONE | 12h | 203 | 0.45% | 51.2% | 1.80 | 7/10 | 0.00370 | 🔴 NO |
| NONE | NONE | 24h | 280 | 0.43% | 47.9% | 1.48 | 7/10 | 0.03350 | 🔴 NO |
| BULL_SIMPLE | REQUIRED | 72h | 86 | 1.82% | 55.8% | 2.87 | 6/10 | 0.00840 | 🔴 NO |
| BULL_STRICT | REQUIRED | 12h | 65 | 0.82% | 58.5% | 2.62 | 6/10 | 0.00560 | 🔴 NO |
| BULL_STRICT | REQUIRED | 24h | 65 | 1.17% | 55.4% | 2.40 | 6/10 | 0.02360 | 🔴 NO |
| BULL_STRICT | REQUIRED | 48h | 65 | 1.37% | 61.5% | 2.22 | 6/10 | 0.08480 | 🔴 NO |
| NONE | REQUIRED | 72h | 102 | 1.37% | 51.0% | 2.21 | 6/10 | 0.02230 | 🔴 NO |
| BULL_SIMPLE | REQUIRED | 48h | 86 | 1.19% | 57.0% | 2.06 | 6/10 | 0.06040 | 🔴 NO |
| BULL_SIMPLE | REQUIRED | 24h | 86 | 0.88% | 50.0% | 2.01 | 6/10 | 0.03720 | 🔴 NO |
| NONE | REQUIRED | 12h | 102 | 0.49% | 51.0% | 1.89 | 6/10 | 0.01320 | 🔴 NO |
| NONE | REQUIRED | 48h | 102 | 0.87% | 53.9% | 1.74 | 6/10 | 0.09010 | 🔴 NO |
| NONE | REQUIRED | 24h | 102 | 0.60% | 46.1% | 1.64 | 6/10 | 0.07270 | 🔴 NO |
