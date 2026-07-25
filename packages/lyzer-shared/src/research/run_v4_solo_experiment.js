import fs from 'fs';
import path from 'path';
import { ReplayEngine } from './replayEngine.js';
import { StatisticalValidator } from './statisticalValidator.js';
import { classifyRegime } from './regimeClassifier.js';

async function runV4SoloExperiment() {
  console.log('=== EXPERIMENT E3: V4 (IMCE) SOLO VS ENSEMBLE ON REAL BINANCE DATA ===');

  const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1000';
  const response = await fetch(url);
  const data = await response.json();
  const candles = data.map(bar => ({
    timestamp: bar[0],
    open: parseFloat(bar[1]),
    high: parseFloat(bar[2]),
    low: parseFloat(bar[3]),
    close: parseFloat(bar[4]),
    volume: parseFloat(bar[5])
  }));

  const regimeInfo = classifyRegime(candles);
  console.log(`Market Regime: ${regimeInfo.regime} (Confidence: ${(regimeInfo.confidence * 100).toFixed(1)}%)`);

  // 1. All Providers (V1 + V2 + V3 + V4)
  const ensembleEngine = new ReplayEngine({ disabledProviders: [] });
  const ensembleResult = ensembleEngine.replay(candles);

  // 2. Disable V1, V2, V3 (V4 IMCE Solo)
  const v4SoloEngine = new ReplayEngine({ disabledProviders: ['V1', 'V2', 'V3'] });
  const v4SoloResult = v4SoloEngine.replay(candles);

  // 3. Disable V1, V3 (SMC + V4 Causality)
  const smcV4Engine = new ReplayEngine({ disabledProviders: ['V1', 'V3'] });
  const smcV4Result = smcV4Engine.replay(candles);

  const validator = new StatisticalValidator();
  const compV4Solo = validator.compare(ensembleResult.trades || [], v4SoloResult.trades || []);
  const compSmcV4 = validator.compare(ensembleResult.trades || [], smcV4Result.trades || []);

  console.log('\n--- V4 SOLO VS ENSEMBLE COMPARISON ---');
  console.table([
    {
      Configuration: 'All Providers (V1+V2+V3+V4)',
      Trades: ensembleResult.stats?.tradeCount || 0,
      WinRate: ((ensembleResult.stats?.winRate || 0) * 100).toFixed(1) + '%',
      ProfitFactor: (ensembleResult.stats?.profitFactor || 0).toFixed(2),
      Sharpe: (ensembleResult.stats?.sharpe || 0).toFixed(2),
      MaxDD: ((ensembleResult.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%'
    },
    {
      Configuration: 'V4 IMCE Solo (Disable V1,V2,V3)',
      Trades: v4SoloResult.stats?.tradeCount || 0,
      WinRate: ((v4SoloResult.stats?.winRate || 0) * 100).toFixed(1) + '%',
      ProfitFactor: (v4SoloResult.stats?.profitFactor || 0).toFixed(2),
      Sharpe: (v4SoloResult.stats?.sharpe || 0).toFixed(2),
      MaxDD: ((v4SoloResult.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%'
    },
    {
      Configuration: 'SMC + V4 Causality (Disable V1,V3)',
      Trades: smcV4Result.stats?.tradeCount || 0,
      WinRate: ((smcV4Result.stats?.winRate || 0) * 100).toFixed(1) + '%',
      ProfitFactor: (smcV4Result.stats?.profitFactor || 0).toFixed(2),
      Sharpe: (smcV4Result.stats?.sharpe || 0).toFixed(2),
      MaxDD: ((smcV4Result.stats?.maxDrawdown || 0) * 100).toFixed(2) + '%'
    }
  ]);

  const outputPath = path.resolve('c:/Users/WDAGUtilityAccount/Downloads/projeto/benchmark/v4_solo_experiment.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    regime: regimeInfo,
    ensemble: ensembleResult.stats,
    v4Solo: v4SoloResult.stats,
    smcV4: smcV4Result.stats,
    compV4Solo: compV4Solo.welchTest,
    compSmcV4: compSmcV4.welchTest
  }, null, 2), 'utf-8');

  console.log(`Saved V4 Solo experiment results to ${outputPath}`);
}

runV4SoloExperiment().catch(err => {
  console.error('Error during V4 solo experiment:', err);
});
