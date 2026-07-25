export class ContinuousAlphaAuditor {
  constructor(historicalSharpe, historicalWinRate) {
    this.baselineSharpe = historicalSharpe;
    this.baselineWinRate = historicalWinRate;
    
    this.rollingTrades = [];
    this.windowSize = 100; // Audita em lotes de 100 trades
  }

  auditTrade(pnlPercent) {
    this.rollingTrades.push(pnlPercent);
    if (this.rollingTrades.length > this.windowSize) {
      this.rollingTrades.shift();
    }
  }

  calculateRollingMetrics() {
    if (this.rollingTrades.length < 30) {
      return { status: 'WARMUP' };
    }

    const wins = this.rollingTrades.filter(pnl => pnl > 0).length;
    const currentWinRate = wins / this.rollingTrades.length;

    const avgPnl = this.rollingTrades.reduce((a, b) => a + b, 0) / this.rollingTrades.length;
    const stdDev = Math.sqrt(this.rollingTrades.reduce((a, b) => a + Math.pow(b - avgPnl, 2), 0) / this.rollingTrades.length);
    
    // Anualizando um rolling micro
    const currentSharpe = stdDev > 0 ? (avgPnl / stdDev) : 0; 
    
    let classification = 'GREEN';
    let warningFlag = '';

    const sharpeDecay = (this.baselineSharpe - currentSharpe) / this.baselineSharpe;
    const winRateDecay = (this.baselineWinRate - currentWinRate) / this.baselineWinRate;

    if (sharpeDecay > 0.40) {
      classification = 'YELLOW';
      warningFlag = 'HIGH_SHARPE_DECAY';
    }
    
    if (classification === 'YELLOW' && winRateDecay > 0.20) {
       classification = 'RED';
       warningFlag = 'CRITICAL_DECAY_RETIREMENT_CANDIDATE';
    }
    
    if (currentSharpe < 0) {
       classification = 'RED';
       warningFlag = 'NEGATIVE_SHARPE';
    }

    return {
      currentSharpe: parseFloat(currentSharpe.toFixed(2)),
      currentWinRate: parseFloat(currentWinRate.toFixed(2)),
      sharpeDecay: parseFloat(sharpeDecay.toFixed(2)),
      winRateDecay: parseFloat(winRateDecay.toFixed(2)),
      classification,
      warningFlag
    };
  }

  estimateHalfLife() {
    // Estimativa teórica com base no decaimento angular do Sharpe
    const { sharpeDecay } = this.calculateRollingMetrics();
    if (!sharpeDecay || sharpeDecay <= 0) return "Stable";
    
    // Se perde x% em y trades, quantos trades até 0?
    // Exemplo abstrato: se perdeu 10% em 100 trades, metade em 500 trades.
    const tradesToHalf = Math.floor((0.5 / sharpeDecay) * this.rollingTrades.length);
    return `${tradesToHalf} trades remaining in Half-Life`;
  }
}
