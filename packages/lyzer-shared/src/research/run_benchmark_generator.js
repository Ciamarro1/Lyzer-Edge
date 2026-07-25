import { AlphaContributionBenchmark } from './alphaContribution.js';
import { StatisticalValidator } from './statisticalValidator.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate 1,000 synthetic OHLCV candles simulating realistic market dynamics
 */
function generateCandles(count = 1000) {
  const candles = [];
  let price = 50000;
  let timestamp = Date.now() - count * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Regime simulation: alternating trend, range, and volatility spikes
    const regimeCycle = i % 300;
    let drift = 0;
    let volatility = 15;

    if (regimeCycle < 100) {
      // Bullish trend
      drift = 8;
      volatility = 12;
    } else if (regimeCycle < 200) {
      // Range / Compression
      drift = (Math.random() - 0.5) * 4;
      volatility = 6;
    } else {
      // High Volatility / Stop Hunt
      drift = (Math.random() - 0.5) * 15;
      volatility = 35;
    }

    const open = price;
    const change = drift + (Math.random() - 0.5) * volatility;
    const close = Math.max(100, open + change);
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    const volume = 10 + Math.random() * 50;

    candles.push({ open, high, low, close, volume, timestamp });
    price = close;
    timestamp += 60 * 1000;
  }
  return candles;
}

async function run() {
  console.log('--- Executing Alpha Contribution Benchmark ---');
  const candles = generateCandles(1000);
  console.log(`Generated ${candles.length} synthetic OHLCV candles.`);

  const benchmark = new AlphaContributionBenchmark();
  const benchmarkResult = await benchmark.runBenchmark(candles);

  const validator = new StatisticalValidator();
  const baselineStats = benchmarkResult.results[0]?.baseline || {};

  const jsonOutput = {
    timestamp: new Date().toISOString(),
    dataset: {
      type: 'SYNTHETIC_OHLCV_MULTI_REGIME',
      candleCount: candles.length,
      timeframe: '1m',
      startPrice: candles[0].open,
      endPrice: candles[candles.length - 1].close
    },
    baselineMetrics: baselineStats,
    results: benchmarkResult.results
  };

  const outputPath = path.resolve('c:/Users/WDAGUtilityAccount/Downloads/projeto/benchmark/results.json');
  fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');
  console.log(`Successfully written benchmark results to ${outputPath}`);
}

run().catch(err => {
  console.error('Error running benchmark:', err);
  process.exit(1);
});
