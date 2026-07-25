export class RealityGapScore {
  /**
   * Compares the ideal Backtest PnL against Shadow PnL and Live PnL.
   */
  
  constructor() {
    this.maxAcceptableGap = 0.25; // 25% max deviation
    this.excellentGap = 0.10;     // 10% deviation is excellent
  }

  calculateGap(backtestPnL, shadowPnL, livePnL = null) {
    if (backtestPnL === 0) return { error: "Backtest PnL cannot be zero." };

    // Primary gap is between idealized backtest and shadow execution (which includes realistic simulated slippage)
    const shadowGap = Math.abs((backtestPnL - shadowPnL) / backtestPnL);
    
    // If live data exists, compare shadow (simulated reality) vs actual reality
    let liveGap = 0;
    if (livePnL !== null) {
        liveGap = Math.abs((shadowPnL - livePnL) / shadowPnL);
    }

    const totalGap = (shadowGap + liveGap) / (livePnL !== null ? 2 : 1);

    let grade = "REJECTED";
    if (totalGap <= this.excellentGap) grade = "EXCELLENT";
    else if (totalGap <= this.maxAcceptableGap) grade = "ACCEPTABLE";

    return {
      gapPercentage: parseFloat((totalGap * 100).toFixed(2)),
      grade: grade,
      approved: totalGap <= this.maxAcceptableGap
    };
  }
}
