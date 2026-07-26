# ADR-049: Empirical Alpha Discovery & Autonomous Scheduler Architecture

## Status
**APPROVED / RATIFIED** — Phase 9 Implementation

## Context & Problem Statement
Prior to Phase 9, system evolution relied on feature discovery and capacity expansion. However, quantitative institutional systems require proving **true descorrelated Net Alpha** ($\alpha_{\text{net}}$) after transaction fees, slippage friction, and market beta. To avoid data mining biases and overfitting, candidate hypotheses must advance through an immutable 8-stage graduation pipeline, backed by 24/7 autonomous research scheduling and aggressive hypothesis falsification.

## Decision Drivers
1. **Empirical Net Alpha Metric**: Calculates Net Alpha after friction costs:
   $$\alpha_{\text{net}} = R_i - R_f - \beta (R_m - R_f) - \text{Slippage} - \text{Commissions}$$
2. **t-Statistic Significance ($t_\alpha \ge 2.0$)**: Uses Newey-West HAC standard errors to reject false discoveries.
3. **8-Stage Alpha Graduation State Machine**: `Discovery -> Stat Verification -> OOS Validation -> Walk-Forward -> Shadow Mode -> Paper Trading -> Micro Capital -> Scale`.
4. **24/7 Autonomous Research Scheduler**: Continuous background loop generating hypotheses, running experiments, measuring net alpha, and publishing automated pull requests.
5. **Hypothesis Falsification Machine**: Machine specifically built to aggressively measure, stress-test, and **discard weak hypotheses**.

## Consequences
- **Positive**: Complete transition from feature discovery to true empirical Alpha discovery and continuous background research.
- **Verification**: Certified Platinum via `scripts/architectureCertification.js`. Vitest suite passed 4/4 tests.
