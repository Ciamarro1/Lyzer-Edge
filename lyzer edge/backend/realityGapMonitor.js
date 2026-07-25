import fs from 'fs';
import path from 'path';

/**
 * Reality Gap Monitor
 * Operates in SHADOW_TRADING mode.
 * Records hypothetical trade executions and PnL, allowing the Quant team to 
 * measure the divergence (Drift) between simulated Alpha and real market microstructure.
 */
export class RealityGapMonitor {
  constructor(symbol) {
    this.symbol = symbol;
    this.shadowHistory = [];
    this.logDir = path.resolve(process.cwd(), 'benchmark', 'shadow_logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  logHypotheticalTrade(tradeObj) {
    const shadowTrade = {
      timestamp: new Date(tradeObj.timestamp * 1000).toISOString(),
      symbol: this.symbol,
      direction: tradeObj.direction,
      entryPrice: tradeObj.entryPrice,
      exitPrice: tradeObj.exitPrice,
      hypotheticalPnlPct: tradeObj.pnl * 100,
      confidence: tradeObj.signal ? tradeObj.signal.confidence : 0,
      regime: tradeObj.regime || 'UNKNOWN',
      exitReason: tradeObj.reasonCodes ? tradeObj.reasonCodes[0] : 'UNKNOWN'
    };

    this.shadowHistory.push(shadowTrade);
    this.flushToDisk();
    
    console.log(`[SHADOW MONITOR] Recorded Hypothetical ${shadowTrade.direction} Trade on ${this.symbol}. PnL: ${shadowTrade.hypotheticalPnlPct.toFixed(2)}% | Regime: ${shadowTrade.regime}`);
  }

  flushToDisk() {
    const filename = path.join(this.logDir, `shadow_history_${this.symbol}_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(filename, JSON.stringify(this.shadowHistory, null, 2));
  }
}
