# Improvement Roadmap — Prioritized by Impact / Complexity

## Tier 1: Foundation (Done)

| # | Improvement | Score | Status |
|:---:|---|:---:|:---:|
| 1 | Historical Replay Engine | 1.25 | ✅ `replayEngine.js` |
| 2 | Statistical Validation Framework | 2.00 | ✅ `statisticalValidator.js` |
| 3 | TRG exponent configurable (env: TRG_EXPONENT) | 2.00 | ✅ Default changed from 4→2 |

## Tier 2: Alpha Quality (Next)

| # | Improvement | Score | Status |
|:---:|---|:---:|:---:|
| 4 | Feature importance via replay permutation | 1.40 | ⏳ Ready (requires historical data) |
| 5 | Calibrate confidence values from replay data | 1.20 | ⏳ Ready (requires historical data) |
| 6 | Regime-adaptive thresholds | 1.00 | ⏳ Design needed |

## Tier 3: Robustness

| # | Improvement | Score | Status |
|:---:|---|:---:|:---:|
| 7 | Realistic slippage/spread model | 2.00 | ⏳ Easy fix |
| 8 | Dynamic position sizing (Kelly-based) | 1.00 | ⏳ Design needed |
| 9 | Cross-asset correlation | 0.71 | ⏳ Complex |

## How to Run Next Steps

```javascript
import { ReplayEngine } from './packages/lyzer-shared/src/research/replayEngine.js';

// 1. Load historical OHLCV data (you need to provide this)
const candles = loadCandlesFromCSV('data/BTCUSDT_1m_2024.csv');

// 2. Run baseline replay
const engine = new ReplayEngine({ trgThreshold: 0.4, trgExponent: 2 });
const baseline = engine.replay(candles, { collectSignals: true });

// 3. Run experiment (e.g., no consensus destruction)
const experiment = new ReplayEngine({ trgThreshold: 0.4, trgExponent: 2, consensusLimit: 0 });
const expResult = experiment.replay(candles);

// 4. Compare statistically
import { StatisticalValidator } from './packages/lyzer-shared/src/research/statisticalValidator.js';
const validator = new StatisticalValidator();
const comparison = validator.compare(baseline.trades, expResult.trades);
console.log(comparison.welchTest); // { tStatistic, pValue, isSignificant }

// 5. Walk-forward validation
const wf = engine.walkForward(candles, 0.7, 5);
console.log(wf.aggregate); // { avgTestSharpe, consistentWindows }
```
