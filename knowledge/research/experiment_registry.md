# Experiment Registry — Alpha Evolution Lab v2

All experiments use: `ReplayEngine` + `StatisticalValidator` + `AlphaContributionBenchmark`

## Ready to Run (Requires Historical OHLCV Data Only)

| ID | Hypothesis | Baseline | Experiment | Metrics | Priority |
|:---:|---|---|---|---|:---:|
| E1 | Consensus destruction harms alpha | `consensusLimit: 0.1` | `consensusLimit: 0` | Sharpe, WR, PF, MaxDD | 🔴 P0 |
| E2 | TRG² outperforms TRG⁴ | `trgExponent: 4` | `trgExponent: 2` | Signal count, Sharpe | 🟠 P1 |
| E3 | V4 alone outperforms ensemble | All providers | V4 only | Sharpe, Sortino, MaxDD | 🔴 P0 |
| E4 | RSI 30/70 outperforms 35/65 | V3: 35/65 | V3: 30/70 | WR, PF | 🟡 P2 |
| E5 | ATR-adaptive SL outperforms static % | 0.15-0.4% SL | 1.5×ATR SL | MaxDD, RecoveryFactor | 🟠 P1 |
| E6 | Regime filter improves expectancy | No regime filter | Skip COMPRESSION/NEWS_SHOCK | Sharpe/regime, PF | 🔴 P0 |
| E7 | Lower TRG threshold increases opportunity | `trgThreshold: 0.4` | `trgThreshold: 0.2` | Trade count, WR, Sharpe | 🟠 P1 |
| E8 | LHDS veto at 0.6 reduces false entries | `lhdsVetoLimit: 0.8` | `lhdsVetoLimit: 0.6` | Veto rate, WR | 🟡 P2 |
| E9 | V1 removal (redundant with SMC) | All providers | V1 disabled | Sharpe delta | 🟠 P1 |
| E10 | TRG threshold sensitivity sweep | baseline | 0.1, 0.2, ..., 0.8 | Trade count, Sharpe curve | 🔴 P0 |

## Automated Runner

```javascript
import { AlphaContributionBenchmark } from './packages/lyzer-shared/src/research/alphaContribution.js';
import { AlphaEvolutionEngine } from './packages/lyzer-shared/src/research/alphaEvolutionEngine.js';

const candles = /* load historical OHLCV */;

// Option 1: Full ablation study
const benchmark = new AlphaContributionBenchmark();
const results = await benchmark.runBenchmark(candles);
console.table(results.results.map(r => ({
  component: r.component,
  classification: r.classification,
  sharpeDelta: r.delta.sharpe.toFixed(4),
  pValue: r.pValue.toFixed(4)
})));

// Option 2: Individual hypothesis
const engine = new AlphaEvolutionEngine();
const id = engine.propose(
  'Consensus Destruction Test',
  'Does removing consensus destruction improve Sharpe?',
  { consensusLimit: 0.1 },  // baseline
  { consensusLimit: 0 }      // experiment
);
const result = await engine.runExperiment(id, candles);
engine.evaluate(id);
console.log(engine.registry.get(id));

// Option 3: Walk-forward
import { ReplayEngine } from './packages/lyzer-shared/src/research/replayEngine.js';
const replay = new ReplayEngine({ trgExponent: 2, trgThreshold: 0.4 });
const wf = replay.walkForward(candles, 0.7, 5);
console.log('Walk-forward:', wf.aggregate);
```

## Acceptance Criteria

For any experiment to be DEPLOYED:
1. `pValue < 0.05` (statistically significant)
2. `Sharpe improvement > 5%` OR `MaxDD reduction > 10%`
3. Walk-forward validation consistent (≥ 3/5 windows positive)
4. ADR written and approved by ARB
5. Replay parity verified (no regression on other metrics)
