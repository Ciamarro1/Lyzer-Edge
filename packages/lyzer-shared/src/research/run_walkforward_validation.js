import fs from 'fs';
import path from 'path';
import { ReplayEngine } from './replayEngine.js';
import { StatisticalValidator } from './statisticalValidator.js';
import { classifyRegime } from './regimeClassifier.js';

async function fetchBinanceKlines(symbol = 'BTCUSDT', interval = '1m', limit = 1000) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  console.log(`[VALIDATION] Fetching live OHLCV from Binance: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error ${response.status}`);
  const data = await response.json();
  return data.map(bar => ({
    timestamp: bar[0],
    open: parseFloat(bar[1]),
    high: parseFloat(bar[2]),
    low: parseFloat(bar[3]),
    close: parseFloat(bar[4]),
    volume: parseFloat(bar[5])
  }));
}

async function executeWalkForwardValidation() {
  console.log('=== LYZER EDGE — WALK-FORWARD & OUT-OF-SAMPLE VALIDATION ===');
  const candles = await fetchBinanceKlines('BTCUSDT', '1m', 1000);
  const regimeInfo = classifyRegime(candles);
  console.log(`Detected Market Regime: ${regimeInfo.regime} (Confidence: ${(regimeInfo.confidence * 100).toFixed(1)}%)`);

  // 1. Walk-forward on Baseline Ensemble (All Providers V1-V4)
  const baselineReplay = new ReplayEngine({ disabledProviders: [] });
  const baselineWF = baselineReplay.walkForward(candles, 0.7, 5);

  // 2. Walk-forward on Optimized Causal Engine (SMC + V4, V1 & V3 Disabled)
  const optimizedReplay = new ReplayEngine({ disabledProviders: ['V1', 'V3'] });
  const optimizedWF = optimizedReplay.walkForward(candles, 0.7, 5);

  // 3. Full-dataset Replay Comparison
  const baselineFull = baselineReplay.replay(candles);
  const optimizedFull = optimizedReplay.replay(candles);

  const validator = new StatisticalValidator();
  const comparison = validator.compare(baselineFull.trades || [], optimizedFull.trades || []);

  console.log('\n--- 5-WINDOW WALK-FORWARD OUT-OF-SAMPLE RESULTS ---');
  console.table([
    {
      Pipeline: 'Baseline Ensemble (V1+V2+V3+V4)',
      AvgTestSharpe: (baselineWF.aggregate.avgTestSharpe || 0).toFixed(4),
      AvgTestWinRate: ((baselineWF.aggregate.avgTestWinRate || 0) * 100).toFixed(2) + '%',
      ConsistentWindows: `${baselineWF.aggregate.consistentWindows}/5`,
      FullDatasetSharpe: (baselineFull.stats?.sharpe || 0).toFixed(4),
      FullDatasetMaxDD: ((baselineFull.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%'
    },
    {
      Pipeline: 'Optimized Causal Engine (SMC + V4)',
      AvgTestSharpe: (optimizedWF.aggregate.avgTestSharpe || 0).toFixed(4),
      AvgTestWinRate: ((optimizedWF.aggregate.avgTestWinRate || 0) * 100).toFixed(2) + '%',
      ConsistentWindows: `${optimizedWF.aggregate.consistentWindows}/5`,
      FullDatasetSharpe: (optimizedFull.stats?.sharpe || 0).toFixed(4),
      FullDatasetMaxDD: ((optimizedFull.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%'
    }
  ]);

  const output = {
    timestamp: new Date().toISOString(),
    dataset: {
      source: 'Binance API (Live BTCUSDT 1m)',
      candleCount: candles.length,
      regime: regimeInfo
    },
    walkForward: {
      baseline: baselineWF,
      optimized: optimizedWF
    },
    fullDataset: {
      baselineStats: baselineFull.stats,
      optimizedStats: optimizedFull.stats,
      comparison: comparison.welchTest
    }
  };

  const outputPath = path.resolve('c:/Users/WDAGUtilityAccount/Downloads/projeto/benchmark/results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nSuccessfully exported multi-window validation results to ${outputPath}`);
}

executeWalkForwardValidation().catch(err => {
  console.error('Validation failure:', err);
  process.exit(1);
});
