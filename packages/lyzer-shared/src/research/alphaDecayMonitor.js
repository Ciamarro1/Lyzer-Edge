export class AlphaDecayMonitor {
  constructor(windowSize = 100) {
    this.windowSize = windowSize;
    this.tradeHistory = [];
    this.decayThreshold = 0.2; // 20% drop in expected value signals decay
  }

  logTrade(trade) {
    this.tradeHistory.push({
      timestamp: Date.now(),
      pnl: trade.pnl,
      confidence: trade.confidence || 0.5,
    });
  }

  getMetrics() {
    if (this.tradeHistory.length < this.windowSize) {
      return { status: 'INSUFFICIENT_DATA', isDecaying: false };
    }

    const recent = this.tradeHistory.slice(-this.windowSize);
    const early = recent.slice(0, Math.floor(this.windowSize / 2));
    const late = recent.slice(Math.floor(this.windowSize / 2));

    const earlyEV = early.reduce((acc, t) => acc + t.pnl, 0) / early.length;
    const lateEV = late.reduce((acc, t) => acc + t.pnl, 0) / late.length;
    
    const earlyWinRate = early.filter(t => t.pnl > 0).length / early.length;
    const lateWinRate = late.filter(t => t.pnl > 0).length / late.length;

    const evDrop = earlyEV > 0 ? (earlyEV - lateEV) / earlyEV : 0;
    const isDecaying = evDrop > this.decayThreshold || lateWinRate < 0.35;

    return {
      status: isDecaying ? 'DECAY_DETECTED' : 'HEALTHY',
      isDecaying,
      earlyEV,
      lateEV,
      evDrop,
      earlyWinRate,
      lateWinRate
    };
  }
}
