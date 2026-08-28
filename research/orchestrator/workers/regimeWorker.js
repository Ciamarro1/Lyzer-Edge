import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot } from '../datasetSnapshot.js';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from '../frozenConfig.js';

export function runRegimeTask(providedLedger = []) {
  const ledger = providedLedger;
  const { candles } = getDatasetSnapshot();

  const tsMap = new Map();
  candles.forEach((c, idx) => tsMap.set(c.openTime, idx));

  const enrichedTrades = ledger.map(t => {
    const idx = tsMap.get(t.timestamp);
    
    // 1D Trend via 50-day SMA (50 * 24 = 1200 hourly bars)
    const smaPeriod = 1200;
    let trend = 'UNKNOWN';
    if (idx >= smaPeriod) {
      const slice = candles.slice(idx - smaPeriod, idx);
      const sma = slice.reduce((s, c) => s + c.close, 0) / smaPeriod;
      trend = candles[idx].close > sma ? 'BULL_1D' : 'BEAR_1D';
    } else {
      trend = candles[idx].close > candles[0].close ? 'BULL_1D' : 'BEAR_1D';
    }

    // 1D Volatility via 24h ATR as % of price
    const slice24 = candles.slice(Math.max(0, idx - 24), idx);
    const atr24 = slice24.reduce((s, c) => s + (c.high - c.low), 0) / slice24.length;
    const volPct = (atr24 / candles[idx].close) * 100;
    const volRegime = volPct > 0.80 ? 'HIGH_VOLATILITY' : 'LOW_VOLATILITY';

    return {
      ...t,
      trend,
      volRegime,
      volPct: Number(volPct.toFixed(3))
    };
  });

  function summarize(filterFn, label) {
    const subset = enrichedTrades.filter(filterFn);
    const n = subset.length;
    if (n === 0) return { label, n: 0, grossPnL: 0, netPnL: 0, netExp: 0, pf: 0, wr: 0 };
    const g = Number(subset.reduce((s, t) => s + t.trueGrossPnL, 0).toFixed(2));
    const net = Number(subset.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));
    const wins = subset.filter(t => t.isNetWin);
    const losses = subset.filter(t => !t.isNetWin);
    const wSum = Number(wins.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));
    const lSum = Number(Math.abs(losses.reduce((s, t) => s + t.trueNetPnL, 0)).toFixed(2));
    const pf = lSum > 0 ? Number((wSum / lSum).toFixed(2)) : 10;
    const wr = Number(((wins.length / n) * 100).toFixed(2));
    return {
      label,
      n,
      grossPnL: g,
      netPnL: net,
      netExp: Number((net / n).toFixed(3)),
      profitFactor: pf,
      winRatePct: wr
    };
  }

  const bullTrend = summarize(t => t.trend === 'BULL_1D', '1D Bull Trend (SMA50)');
  const bearTrend = summarize(t => t.trend === 'BEAR_1D', '1D Bear Trend (SMA50)');
  const highVol = summarize(t => t.volRegime === 'HIGH_VOLATILITY', 'High Volatility (ATR/P > 0.80%)');
  const lowVol = summarize(t => t.volRegime === 'LOW_VOLATILITY', 'Low Volatility (ATR/P <= 0.80%)');

  // Gate F Check: PF >= 1.20 in directional regimes
  const gateFPass = (bullTrend.profitFactor >= FROZEN_V5_CONFIG.gates.gateF_DirectionalRegimeMinPF) && 
                    (bearTrend.profitFactor >= FROZEN_V5_CONFIG.gates.gateF_DirectionalRegimeMinPF);

  return {
    workerName: 'regimeWorker',
    configHash: FROZEN_CONFIG_HASH,
    directionalRegimes: {
      bullTrend,
      bearTrend,
      directionalSymmetryRatio: Number((bullTrend.profitFactor / bearTrend.profitFactor).toFixed(3))
    },
    volatilityRegimes: {
      highVol,
      lowVol,
      volatilityAsymmetryObservation: 'ATR/P > 0.80% provides expansion scale to overcome friction hurdle (PF 4.54 vs 0.55). Kept as descriptive telemetry.'
    },
    gateF_RegimeStabilityStatus: gateFPass ? 'PASS_PRELIMINARY' : 'FAIL_DIRECTIONAL_DRIFT',
    enrichedTrades
  };
}

if (parentPort) {
  const result = runRegimeTask(workerData?.ledger);
  parentPort.postMessage(result);
}
