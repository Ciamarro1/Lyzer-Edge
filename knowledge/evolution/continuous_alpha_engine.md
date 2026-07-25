# Continuous Alpha Engine Architecture

**Mission**: L4 — Autonomous Alpha Evolution Program  
**Date**: 2026-07-25  
**Core Modules**: `AlphaEvolutionEngine`, `ReplayEngine`, `StatisticalValidator`, `DriftDetector`

---

## 1. The Autonomous Evolution Cycle

```
                      ┌──────────────────┐
                      │   1. OBSERVE     │
                      │ Real-Time Ticks  │
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │ 2. IDENTIFY GAP  │
                      │ Regime shift /   │
                      │ Performance drop │
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │  3. HYPOTHESIZE  │
                      │ Register in      │
                      │ HypothesisRegistry│
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │ 4. EXPERIMENT    │
                      │ ReplayEngine.    │
                      │ replay(candles)  │
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │  5. STATISTICALLY│
                      │    VALIDATE      │
                      │ Welch's t-test   │
                      │  (p < 0.05)      │
                      └────────┬─────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
      [p < 0.05 & Sharpe ↑]            [p ≥ 0.05 or Sharpe ↓]
              │                                 │
              ▼                                 ▼
       6. APPROVE & DEPLOY             7. REJECT HYPOTHESIS
     Update Config + Log ADR           Archive as NOT_SIGNIFICANT
              │
              ▼
       8. MONITOR DRIFT
     Rolling Sharpe Window
```

---

## 2. Statistical Acceptance Protocol

To promote any proposed parameter change or module refactor to `DEPLOYED` status:

1. **Dataset Requirement**: Minimum 1,000 candles or 30 trading days of historical data.
2. **Statistical Significance**: `pValue < 0.05` via Welch's unequal variances t-test.
3. **Performance Threshold**: Delta Sharpe Ratio `ΔSharpe ≥ +0.10` OR Delta Max Drawdown `ΔMaxDD ≤ -0.05`.
4. **Walk-Forward Consistency**: Must pass out-of-sample testing across at least 3 of 5 walk-forward windows.
5. **No Regression**: Primary risk filters (TruthKernel, MOL, ECA Court) must maintain zero false allowances.

---

## 3. Drift Monitoring Protocol (`DriftDetector`)

- **Window Size**: Rolling 100 trades.
- **Trigger Condition**: If recent window Sharpe drops below 80% of historical baseline:
  - System logs `WARNING_ALPHA_DRIFT_DETECTED`.
  - System automatically schedules a re-run of `AlphaContributionBenchmark`.
  - If recent window Sharpe drops below 50%, system enters `SAFE_MODE` (reduced sizing).
