export class InstitutionalRealityEngine {
  constructor() {
    this.history = [];
    this.degradationThresholds = {
      slippageDriftLimit: 0.0010, // 10 BPS máximo de piora além do backtest
      latencyDriftLimit: 250, // ms extra
      liquidityDegradationLimit: 0.30 // 30% de perda de profundidade
    };
  }

  logExecution(theoreticalPnL, actualPnL, latency, actualLiquidity, theoreticalLiquidity) {
    this.history.push({
      slippageDrift: theoreticalPnL - actualPnL,
      latencyDrift: latency,
      liquidityDegradation: theoreticalLiquidity > 0 ? (theoreticalLiquidity - actualLiquidity) / theoreticalLiquidity : 0,
      timestamp: Date.now()
    });

    if (this.history.length > 500) {
      this.history.shift(); // Manter últimos 500
    }
  }

  calculateRealityGap() {
    if (this.history.length === 0) {
      return { status: 'NO_DATA', gapScore: 0 };
    }

    const avgSlippageDrift = this.history.reduce((acc, trade) => acc + trade.slippageDrift, 0) / this.history.length;
    const avgLatencyDrift = this.history.reduce((acc, trade) => acc + trade.latencyDrift, 0) / this.history.length;
    const avgLiquidityDegradation = this.history.reduce((acc, trade) => acc + trade.liquidityDegradation, 0) / this.history.length;

    let gapPenalties = 0;

    if (avgSlippageDrift > this.degradationThresholds.slippageDriftLimit) gapPenalties += 30;
    if (avgLatencyDrift > this.degradationThresholds.latencyDriftLimit) gapPenalties += 30;
    if (avgLiquidityDegradation > this.degradationThresholds.liquidityDegradationLimit) gapPenalties += 40;

    // 0 = Sem divergência. 100 = Fundo cego operando em ambiente totalmente diferente da tese.
    const gapScore = Math.min(100, gapPenalties + (avgSlippageDrift * 1000)); 

    let regimeMismatch = false;
    if (gapScore > 75) {
      regimeMismatch = true;
    }

    return {
      gapScore: parseFloat(gapScore.toFixed(2)),
      avgSlippageDrift: parseFloat(avgSlippageDrift.toFixed(5)),
      avgLatencyDrift: parseFloat(avgLatencyDrift.toFixed(2)),
      avgLiquidityDegradation: parseFloat(avgLiquidityDegradation.toFixed(4)),
      regimeMismatch,
      recommendation: gapScore > 75 ? 'HALT_EXECUTION' : (gapScore > 40 ? 'REDUCE_SIZE' : 'PROCEED')
    };
  }
}
