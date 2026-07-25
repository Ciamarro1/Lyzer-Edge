# Continuous Improvement Protocol — Alpha Evolution Loop

**Mission**: L4 — Continuous Alpha Evolution  
**Date**: 2026-07-24  
**Owner**: Lyzer Orchestrator

---

## The Darwinian Alpha Loop

```
     ┌──────────┐
     │ OBSERVE  │ ← Collect live tick data + trade results
     └────┬─────┘
          │
     ┌────▼─────┐
     │ DETECT   │ ← RegimeClassifier: classify market state
     │ REGIME   │   DriftDetector: check rolling Sharpe
     └────┬─────┘
          │
     ┌────▼─────────┐
     │ GENERATE     │ ← Propose new hypothesis
     │ HYPOTHESIS   │   e.g., "TRG threshold 0.3 improves Sharpe in TREND_BULLISH"
     └────┬─────────┘
          │
     ┌────▼──────┐
     │ EXPERIMENT│ ← ReplayEngine.replay(candles) with baseline vs experiment config
     └────┬──────┘
          │
     ┌────▼─────────┐
     │ VALIDATE     │ ← StatisticalValidator.compare()
     │ STATISTICALLY│   Require p < 0.05
     └────┬─────────┘
          │
     ┌────▼──────┐         ┌──────────┐
     │ APPROVE/  │──YES──▶ │ DEPLOY   │ ← Update config, write ADR
     │ REJECT    │         └────┬─────┘
     └────┬──────┘              │
          │ NO                  │
          ▼                ┌────▼──────┐
     Archive as            │ MONITOR   │ ← DriftDetector: continuous health
     NOT_SIGNIFICANT       │ DRIFT     │   If degraded → trigger new OBSERVE
                           └───────────┘
```

---

## Evidence Requirements per Stage

| Stage | Input | Output | Evidence Required |
|---|---|---|---|
| OBSERVE | Live ticks | Candle arrays | Raw data timestamp integrity |
| DETECT REGIME | Candles | Regime label + confidence | `classifyRegime()` output |
| GENERATE HYPOTHESIS | Gap analysis / intuition | Hypothesis document | Must specify baseline, experiment, metrics |
| EXPERIMENT | Candles + 2 configs | Trade arrays ×2 | ReplayEngine deterministic replay |
| VALIDATE | Trade arrays ×2 | p-value, t-statistic | Welch's t-test via StatisticalValidator |
| APPROVE | Validation results | DEPLOYED / REJECTED | p < 0.05 AND improvement > 5% |
| DEPLOY | New config | Updated .env | ADR written, ARB approved |
| MONITOR | Live metrics | Drift alert | Rolling Sharpe window comparison |

---

## Hypothesis Lifecycle

```
PROPOSED → RUNNING → SIGNIFICANT → DEPLOYED
                  ↘ NOT_SIGNIFICANT → REJECTED
```

### Registration Template

```javascript
const engine = new AlphaEvolutionEngine();

const id = engine.propose(
  'Hypothesis Name',
  'Description of what we expect and why',
  { /* baseline config */ },
  { /* experiment config */ }
);

// Run with historical data
const result = await engine.runExperiment(id, candles);

// Evaluate (auto-approves if Sharpe improves + p < 0.05)
engine.evaluate(id);

// Check result
console.log(engine.registry.get(id));
```

---

## Drift Detection Protocol

```javascript
// After each live trade batch
const driftStatus = engine.monitor({
  sharpe: currentWindowSharpe,
  winRate: currentWindowWinRate,
  maxDrawdown: currentWindowMaxDD
});

if (driftStatus.drifted) {
  // Alert: Alpha may be degrading
  // Trigger: Re-run experiments with recent data
  // Action: Propose regime-specific parameter adjustment
}
```

### Drift Thresholds

| Metric | Warning | Critical | Action |
|---|:---:|:---:|---|
| Sharpe ratio < 80% of baseline | ⚠️ | — | Investigate |
| Sharpe ratio < 50% of baseline | — | 🔴 | Suspend non-essential signals |
| Win rate drops > 15% | ⚠️ | — | Check regime shift |
| MaxDD increases > 30% | — | 🔴 | Reduce position sizing |

---

## Regime-Adaptive Protocol

When `RegimeClassifier` detects a regime change:

1. **Log** the regime transition
2. **Check** if current config was tested for this regime
3. **If not tested** → flag as HYPOTHESIS ("Config X may not work in COMPRESSION regime")
4. **If tested and negative** → switch to regime-specific config (if approved)
5. **If tested and positive** → continue with current config

### Future Goal: Regime-Config Matrix

```
Regime          → Config A  → Config B  → Config C
TREND_BULLISH   → Sharpe: X → Sharpe: Y → Sharpe: Z  ← pick best
RANGE_NARROW    → Sharpe: X → Sharpe: Y → Sharpe: Z
COMPRESSION     → Sharpe: X → Sharpe: Y → Sharpe: Z
NEWS_SHOCK      → DISABLE   → DISABLE   → DISABLE    ← never trade
```

---

## Quality Gates

### Before Any Code Change
- [ ] Hypothesis registered in experiment_registry.md
- [ ] Baseline benchmark captured
- [ ] Experiment benchmark run with p < 0.05
- [ ] Walk-forward validation (≥ 3/5 windows positive)
- [ ] ADR written
- [ ] ARB review (for structural changes)

### Before Deployment
- [ ] npm test passes
- [ ] Replay parity verified (no regression)
- [ ] Config diff documented
- [ ] Rollback plan defined

### After Deployment
- [ ] DriftDetector monitoring active
- [ ] First 100-tick Sharpe captured
- [ ] Comparison with pre-deployment Sharpe

---

## Anti-Patterns (FORBIDDEN)

| Anti-Pattern | Why | Alternative |
|---|---|---|
| "I think this threshold should be X" | Opinion, not evidence | Run experiment with AlphaContributionBenchmark |
| "Let's add a new filter" | Complexity without proof | First prove the problem exists |
| "Let's optimize parameter Y" | Could be overfitting | Walk-forward validation required |
| "More data sources = better" | Feature bloat | Feature importance analysis first |
| "ML will fix this" | Black box without understanding | Statistical features first, ML only as auxiliary |

---

## Tooling Summary

| Tool | File | Purpose |
|---|---|---|
| `ReplayEngine` | research/replayEngine.js | Historical backtesting |
| `StatisticalValidator` | research/statisticalValidator.js | Significance testing |
| `AlphaContributionBenchmark` | research/alphaContribution.js | Ablation studies |
| `AlphaEvolutionEngine` | research/alphaEvolutionEngine.js | Hypothesis lifecycle |
| `RegimeClassifier` | research/regimeClassifier.js | Market state detection |
