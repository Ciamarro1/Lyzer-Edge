import fs from 'fs';
import path from 'path';
import { ReplayEngine } from './replayEngine.js';
import { StatisticalValidator } from './statisticalValidator.js';
import { classifyRegime } from './regimeClassifier.js';

async function runAdaptiveCalibration() {
  console.log('=== EXPERIMENT: ATR-ADAPTIVE PARAMETER CALIBRATION ON REAL BINANCE DATA ===');

  // Load the real Binance candles saved previously or fetch fresh
  const resultsJsonPath = path.resolve('c:/Users/WDAGUtilityAccount/Downloads/projeto/benchmark/real_binance_results.json');
  let candles;

  if (fs.existsSync(resultsJsonPath)) {
    // Fetch fresh from Binance for maximum accuracy
    const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1000';
    const response = await fetch(url);
    const data = await response.json();
    candles = data.map(bar => ({
      timestamp: bar[0],
      open: parseFloat(bar[1]),
      high: parseFloat(bar[2]),
      low: parseFloat(bar[3]),
      close: parseFloat(bar[4]),
      volume: parseFloat(bar[5])
    }));
  } else {
    console.error('Binance data not available.');
    return;
  }

  const regimeInfo = classifyRegime(candles);
  console.log(`Live Market Regime: ${regimeInfo.regime} (Confidence: ${(regimeInfo.confidence * 100).toFixed(1)}%, ATR Ratio: ${regimeInfo.metrics.atrRatio.toFixed(2)})`);

  // 1. BASELINE: Static SL (0.25%) and Static TP (0.50%) with TRG Threshold 0.4
  const baselineEngine = new ReplayEngine({
    trgThreshold: 0.4,
    trgExponent: 2,
    slDistance: 0.0025,
    tpDistance: 0.005
  });
  const baselineResult = baselineEngine.replay(candles);

  // 2. CALIBRATED CONFIG 1: ATR-Scaled SL/TP (0.8% SL, 1.6% TP for EXPANSION regime) + TRG Threshold 0.25
  const calibratedEngine1 = new ReplayEngine({
    trgThreshold: 0.25,
    trgExponent: 2,
    slDistance: 0.0080, // Scaled to current ATR volatility
    tpDistance: 0.0160
  });
  const calibratedResult1 = calibratedEngine1.replay(candles);

  // 3. CALIBRATED CONFIG 2: Dynamic Trend-Following ATR SL/TP (0.5% SL, 1.5% TP) + TRG Threshold 0.20
  const calibratedEngine2 = new ReplayEngine({
    trgThreshold: 0.20,
    trgExponent: 2,
    slDistance: 0.0050,
    tpDistance: 0.0150
  });
  const calibratedResult2 = calibratedEngine2.replay(candles);

  const validator = new StatisticalValidator();
  const comparison1 = validator.compare(baselineResult.trades || [], calibratedResult1.trades || []);
  const comparison2 = validator.compare(baselineResult.trades || [], calibratedResult2.trades || []);

  console.log('\n--- CALIBRATION RESULTS COMPARISON ---');
  console.table([
    {
      Configuration: 'Baseline Static (0.25% SL, 0.5% TP)',
      Trades: baselineResult.stats?.tradeCount || 0,
      WinRate: ((baselineResult.stats?.winRate || 0) * 100).toFixed(1) + '%',
      ProfitFactor: (baselineResult.stats?.profitFactor || 0).toFixed(2),
      Sharpe: (baselineResult.stats?.sharpe || 0).toFixed(2),
      MaxDD: ((baselineResult.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%',
      pValue: 'N/A'
    },
    {
      Configuration: 'Calibrated 1 (0.8% SL, 1.6% TP, TRG 0.25)',
      Trades: calibratedResult1.stats?.tradeCount || 0,
      WinRate: ((calibratedResult1.stats?.winRate || 0) * 100).toFixed(1) + '%',
      ProfitFactor: (calibratedResult1.stats?.profitFactor || 0).toFixed(2),
      Sharpe: (calibratedResult1.stats?.sharpe || 0).toFixed(2),
      MaxDD: ((calibratedResult1.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%',
      pValue: (comparison1.welchTest?.pValue || 1.0).toFixed(4)
    },
    {
      Configuration: 'Calibrated 2 (0.5% SL, 1.5% TP, TRG 0.20)',
      Trades: calibratedResult2.stats?.tradeCount || 0,
      WinRate: ((calibratedResult2.stats?.winRate || 0) * 100).toFixed(1) + '%',
      ProfitFactor: (calibratedResult2.stats?.profitFactor || 0).toFixed(2),
      Sharpe: (calibratedResult2.stats?.sharpe || 0).toFixed(2),
      MaxDD: ((calibratedResult2.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%',
      pValue: (comparison2.welchTest?.pValue || 1.0).toFixed(4)
    }
  ]);

  const output = {
    timestamp: new Date().toISOString(),
    regime: regimeInfo,
    baseline: baselineResult.stats,
    calibratedConfig1: calibratedResult1.stats,
    calibratedConfig2: calibratedResult2.stats,
    comparison1: comparison1.welchTest,
    comparison2: comparison2.welchTest
  };

  const outputPath = path.resolve('c:/Users/WDAGUtilityAccount/Downloads/projeto/benchmark/calibration_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nCalibration experiment saved to ${outputPath}`);
}

runAdaptiveCalibration().catch(err => {
  console.error('Error during calibration:', err);
});
