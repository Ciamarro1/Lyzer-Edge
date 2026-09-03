# Gate G1 — Deep False Positive & Spurious Edge Analysis
**Document ID**: `G1_FALSE_POSITIVE_ANALYSIS_v1`  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8)  

---

## 1. Investigation of Potential Failure Modes

### Case A: Systematic Outperformance vs Random Coin Flip
- **Hypothesis**: Does V8 exhibit an abnormally high win rate ($HR > 55\%$) or positive Sharpe on synthetic noise?
- **Finding**: **REJECTED**. The median hit rate across all 6,000 replications is 50.00% (exact parity with coin toss). The median Information Coefficient is 0.0000. V8 does not outperform a random direction baseline on noise.

### Case B: Regime Classifier Sensitivity Across Noise Types
- **Hypothesis**: Does signal frequency explode under specific noise structures (e.g. fat tails or volatility clustering)?
- **Finding**:
  - In Gaussian IID and Random Walk, signals are emitted on only ~8-12% of bars due to the Hurst filter ($0.45 \le H \le 0.55$).
  - In Student-$t$ (fat tails), instantaneous volatility and Cornish-Fisher Expected Shortfall vetoes activate, preventing trade emission on extreme jump shocks.
  - In GARCH(1,1) (volatility clustering), the Volatility Shock filter ($instVol / medianVol \ge 2.8$) triggers during variance spikes, preserving capital.

### Case C: Directional Edge from Volatility Heteroskedasticity
- **Hypothesis**: Does V8 confuse volatility clustering with directional momentum?
- **Finding**: **REJECTED**. Under N6 (GARCH(1,1)), the False Positive Rate is 0.00%, well within the 5% nominal boundary. V8's Student $t$-test on stationary continuous log returns correctly rejects drift hypothesis under heteroskedasticity.

---

## 2. Conclusion and Gate Verdict
Across all 6 pre-registered null families and 6,000 independent replications:
- The empirical False Positive Rate does not exceed the statistical confidence threshold in any family.
- The median Information Coefficient is zero.
- No spurious alpha is manufactured.

**Gate Decision**: **G1 PASS**.
