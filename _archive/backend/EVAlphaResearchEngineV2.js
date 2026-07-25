/**
 * ARL v2 Core Research Engine
 * Coordinates historical testing, regime conditioning, overfitting audits, and clustering.
 */

import { signals } from './alphaSignals.js';
import { runAlphaTests } from './alphaTestRunner.js';
import { AlphaClusterEngine } from './alphaClusterEngine.js';
import { RegimeConditioner } from './regimeConditioner.js';
import { OverfitDetector } from './overfitDetector.js';

export class EVAlphaResearchEngineV2 {
  constructor() {
    this.clusterEngine = new AlphaClusterEngine();
    this.regimeConditioner = new RegimeConditioner();
    this.overfitDetector = new OverfitDetector();
    this.history = {}; // Cache of raw trades returns over time
  }

  splitRegimes(candles) {
    const regimes = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < 20) {
        regimes.push("chop");
        continue;
      }
      
      const slice = candles.slice(i - 20, i);
      const returns = slice.map((c, idx) =>
        idx === 0 ? 0 : (c.close - slice[idx - 1].close) / slice[idx - 1].close
      );

      const m = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - m, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      
      const trend = (slice[slice.length - 1].close - slice[0].close) / slice[0].close;

      let regime = "chop";
      // Volatility and trend thresholds
      if (volatility > 0.0008 && trend > 0.0004) {
        regime = "trend_up";
      } else if (volatility > 0.0008 && trend < -0.0004) {
        regime = "trend_down";
      } else if (volatility < 0.0003) {
        regime = "low_vol";
      }

      regimes.push(regime);
    }
    return regimes;
  }

  evaluateSignal(signal, candles, regimes) {
    const trades = runAlphaTests(signal, candles, regimes);
    const returns = trades.map(t => t.netPnl);

    if (returns.length === 0) {
      return { ev: 0, sharpe: 0, drawdown: 0, stability: 0, decay: 0, trades: [] };
    }

    const ev = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Sharpe Ratio
    const mean = ev;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    const sharpe = std !== 0 ? mean / std : 0;

    // Drawdown Calculation
    let peak = 0;
    let balance = 0;
    let maxDrawdown = 0;
    returns.forEach(r => {
      balance += r;
      if (balance > peak) peak = balance;
      const dd = peak - balance;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // Stability Score (linearity of cumulative returns)
    const cumReturns = [];
    let cur = 0;
    returns.forEach(r => {
      cur += r;
      cumReturns.push(cur);
    });
    const avgCum = cumReturns.reduce((a, b) => a + b, 0) / (cumReturns.length || 1);
    const cumVar = cumReturns.reduce((a, b) => a + Math.pow(b - avgCum, 2), 0) / (cumReturns.length || 1);
    const stability = Math.max(0, 1 - Math.sqrt(cumVar));

    // Decay Slope (recent - older average EV)
    const name = signal.name;
    if (!this.history[name]) {
      this.history[name] = [];
    }
    // Sync latest returns
    this.history[name] = returns;

    const values = this.history[name];
    const recent = values.slice(-20);
    const older = values.slice(-60, -20);
    const recentAvg = recent.reduce((a, v) => a + v, 0) / (recent.length || 1);
    const olderAvg = older.reduce((a, v) => a + v, 0) / (older.length || 1);
    const decay = recentAvg - olderAvg;

    return {
      ev,
      sharpe,
      drawdown: maxDrawdown,
      stability,
      decay,
      trades
    };
  }

  alphaSurvivalScore(r) {
    const normalizedSharpe = Math.min(2.5, Math.max(0, r.sharpe)) / 2.5;
    const normalizedDrawdown = Math.max(0, 1 - r.drawdown);
    const normalizedDecay = Math.max(0, Math.min(2, r.decay + 1)) / 2;

    // ASS formula
    return (
      r.ev * 100 * 0.4 +
      normalizedSharpe * 0.2 +
      normalizedDrawdown * 0.2 +
      r.stability * 0.1 +
      normalizedDecay * 0.1
    );
  }

  run(candles) {
    const regimes = this.splitRegimes(candles);
    const report = {};

    for (const signal of signals) {
      const signalResults = this.evaluateSignal(signal, candles, regimes);

      const regimeConditioning = this.regimeConditioner.analyze(signalResults.trades);
      const overfitResult = this.overfitDetector.detect(signalResults.trades);
      const ass = this.alphaSurvivalScore(signalResults);

      report[signal.name] = {
        name: signal.name,
        description: signal.description,
        ev: Number(signalResults.ev.toFixed(6)),
        sharpe: Number(signalResults.sharpe.toFixed(2)),
        drawdown: Number(signalResults.drawdown.toFixed(6)),
        stability: Number(signalResults.stability.toFixed(4)),
        decay: Number(signalResults.decay.toFixed(6)),
        ass: Number(ass.toFixed(4)),
        regimeConditioning,
        overfit: overfitResult,
        status: (ass > 0.1 && overfitResult.status === "CLEAN" && signalResults.ev > 0) ? "STABLE" : "DEGRADING",
        trades: signalResults.trades.length,
        cumulativeEV: this.getCumulativeEVHistory(signalResults.trades)
      };
    }

    const clusters = this.clusterEngine.analyzeClusters(report);

    return {
      alphas: report,
      clusters
    };
  }

  getCumulativeEVHistory(trades) {
    let sum = 0;
    return trades.map(t => {
      sum += t.netPnl;
      return sum;
    }).slice(-50); // limit to last 50 points
  }
}
