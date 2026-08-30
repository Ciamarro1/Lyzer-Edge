# 🏛️ LYZER EDGE — BATCH 008A: STRUCTURAL EXITS REPORT
## BATCH_008A_STRUCTURAL_EXITS_REPORT

**Execution Date:** 2026-08-29T23:02:11.651Z
**Target:** `V8.0-DISPLACEMENT-FVG-LONG`
**Best Exit Model Evaluated:** Model B

---

## 1. STRUCTURAL MODELS COMPARISON

| Model | N | Mean Net Ret | Win Rate | Profit Factor |
|---|---|---|---|---|
| A (Fixed 12h) | 63 | 0.90% | 58.7% | 2.70 |
| B (Early Stop) | 63 | 0.95% | 52.4% | 3.05 |
| C (ATR Trailing) | 63 | 0.61% | 46.0% | 2.25 |
| D (Combined) | 63 | 0.64% | 44.4% | 2.41 |

---

## 2. PESSIMISTIC MAE COMPARISON

| Model | PF Optimistic (Close) | PF Pessimistic (Trail) | Diff |
|---|---|---|---|
| C | 2.36 | 2.25 | 0.11 |
| D | 2.50 | 2.41 | 0.09 |

---

## 3. WFA WINDOWS (BEST MODEL: B)

| Window | N | Mean Net | Win Rate | Profit Factor | Status |
|---|---|---|---|---|---|
| 1 | 10 | 3.36% | 80.0% | 8.12 | PASS |
| 2 | 5 | 0.72% | 60.0% | 2.48 | PASS |
| 3 | 6 | 0.55% | 33.3% | 2.11 | PASS |
| 4 | 12 | 1.35% | 75.0% | 23.76 | PASS |
| 5 | 4 | -0.69% | 25.0% | 0.23 | FAIL |
| 6 | 4 | -0.79% | 25.0% | 0.42 | FAIL |
| 7 | 2 | 3.10% | 100.0% | 10.00 | PASS |
| 8 | 5 | -0.12% | 40.0% | 0.82 | FAIL |
| 9 | 7 | -0.34% | 14.3% | 0.11 | FAIL |
| 10 | 8 | 0.72% | 50.0% | 2.73 | PASS |

---

## 4. MULTI-TIER FRICTION LADDER (BEST MODEL)

| Fee Tier | Mean Net | Profit Factor | Status (PF >= 1.2) |
|---|---|---|---|
| 0.00% | 1.03% | 3.42 | 🟢 VIABLE |
| 0.05% | 0.98% | 3.18 | 🟢 VIABLE |
| 0.08% | 0.95% | 3.05 | 🟢 VIABLE |
| 0.10% | 0.93% | 2.96 | 🟢 VIABLE |
| 0.15% | 0.88% | 2.77 | 🟢 VIABLE |
| 0.25% | 0.78% | 2.43 | 🟢 VIABLE |

---

## 5. THRESHOLD STABILITY BAND

| Threshold | N | Mean Net | Profit Factor | Viable |
|---|---|---|---|---|
| >= 1.75 ATR | 96 | 0.78% | 2.69 | 🟢 PASS |
| >= 2.00 ATR | 63 | 0.95% | 3.05 | 🟢 PASS |
| >= 2.25 ATR | 46 | 0.39% | 1.66 | 🟢 PASS |
| >= 2.50 ATR | 30 | 0.74% | 2.45 | 🟢 PASS |
| >= 2.75 ATR | 20 | 0.31% | 1.48 | 🔴 FAIL |

---

## 6. MONTE CARLO PERMUTATION TEST
- Iterations: 10000
- Null Universe: Bull Trend Bars
- Empirical p-value: **0.0013**

---

## 7. EXECUTIVE ACCEPTANCE CRITERIA

| Criterion | Requirement | Result | Status |
|---|---|---|---|
| 10-Window WFA | >= 7/10 Positive | 6/10 | 🔴 FAIL |
| OOS PF | >= 1.20 | 3.05 | 🟢 PASS |
| Permutation Test | p < 0.01 | p = 0.0013 | 🟢 PASS |
| Friction Tolerance | PF >= 1.20 @ 15bps | 2.77 | 🟢 PASS |
| Threshold Stability | >= 3 Viable Thresholds | 4/5 | 🟢 PASS |

**FINAL VERDICT:** ❌ FAILED INSTITUTIONAL CRITERIA
