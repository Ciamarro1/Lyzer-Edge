# 🏛️ LYZER EDGE — BATCH 011: FINAL EXECUTIVE REPORT
**Execution Date:** 2026-08-29T23:40:19.869Z  
**Elapsed Time:** 1.8s  

## H1: REGIME IGNITION (Cluster Gap Analysis)
Does defining a "Cluster" logically group dependent trades and restore permutation significance?

| Gap (hours) | N Clusters | Mean Net | Win Rate | PF | WFA | MaxDD | Permutation p-val |
|---|---|---|---|---|---|---|---|
| 1 | 114 | 1.11% | 49.1% | 1.99 | 8/10 | 27.39% | 0.05380 |
| 2 | 114 | 1.11% | 49.1% | 1.99 | 8/10 | 27.39% | 0.04900 |
| 4 | 114 | 1.11% | 49.1% | 1.99 | 8/10 | 27.39% | 0.04860 |
| 8 | 114 | 1.11% | 49.1% | 1.99 | 8/10 | 27.39% | 0.05090 |
| 12 | 114 | 1.11% | 49.1% | 1.99 | 8/10 | 27.39% | 0.05410 |
| 24 | 112 | 0.99% | 48.2% | 1.84 | 7/10 | 27.39% | 0.09470 |
| 48 | 107 | 0.97% | 48.6% | 1.81 | 7/10 | 25.50% | 0.10570 |

## H2: HORIZON SATURATION FOR CLUSTERS

| Horizon | N Clusters | Mean Net | Win Rate | PF | WFA | MaxDD |
|---|---|---|---|---|---|---|
| 12h | 142 | 0.25% | 48.6% | 1.45 | 6/10 | 14.33% |
| 24h | 142 | 0.37% | 49.3% | 1.45 | 7/10 | 14.38% |
| 36h | 130 | 0.63% | 51.5% | 1.63 | 7/10 | 21.45% |
| 48h | 125 | 0.93% | 51.2% | 1.90 | 9/10 | 19.92% |
| 60h | 117 | 0.87% | 44.4% | 1.71 | 7/10 | 19.04% |
| 72h | 112 | 0.99% | 48.2% | 1.84 | 7/10 | 27.39% |
| 84h | 107 | 1.13% | 51.4% | 1.88 | 9/10 | 29.51% |
| 96h | 103 | 1.29% | 47.6% | 1.95 | 8/10 | 21.79% |
| 120h | 98 | 1.31% | 51.0% | 1.77 | 6/10 | 28.69% |

## H3: STRUCTURAL PYRAMIDING vs BASELINES
Testing if Pyramiding provides better Return per base unit without destroying WFA.

| Execution Mode | N Clusters | Total Equity | Win Rate | PF | WFA | MaxDD | p-val |
|---|---|---|---|---|---|---|---|
| ONE_POSITION | 112 | 110.43% | 48.2% | 1.84 | 7/10 | 27.39% | 0.08490 |
| INDEPENDENT | 114 | 241.46% | 45.6% | 2.42 | 9/10 | 34.42% | 0.00940 |
| PYRAMID_1_05_025 | 114 | 177.50% | 47.4% | 2.20 | 9/10 | 30.91% | 0.02180 |
| PYRAMID_1_05_05_05 | 114 | 188.86% | 47.4% | 2.27 | 9/10 | 30.91% | 0.01750 |
| PYRAMID_1_075_05 | 114 | 207.48% | 46.5% | 2.31 | 9/10 | 32.66% | 0.01450 |

## ADVERSARIAL VALIDATION (Pyramiding Friction)

| Slippage (bps) | N Clusters | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|
| 0 | 114 | 1.82% | 46.5% | 2.31 | 9/10 |
| 5 | 114 | 1.69% | 45.6% | 2.16 | 8/10 |
| 10 | 114 | 1.56% | 43.9% | 2.03 | 8/10 |
| 20 | 114 | 1.31% | 41.2% | 1.79 | 8/10 |
| 30 | 114 | 1.05% | 38.6% | 1.59 | 7/10 |
| 50 | 114 | 0.54% | 36.8% | 1.26 | 4/10 |
