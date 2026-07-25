export class CapitalGovernor {
  constructor(config = {}) {
    this.baseAllocation = config.baseAllocation || 0.01; // 1% default
    this.maxAllocation = config.maxAllocation || 0.05;   // 5% max limit
  }

  /**
   * "Quanto risco merece ser alocado?"
   * Decide position sizing dynamically based on systemic and microscopic risks.
   * If the risk is too high, allocation drops to 0 (Veto).
   */
  allocateRisk(metrics) {
    const { 
        lssScore, 
        alphaDecayPercent, 
        regimeProbability, 
        currentDrawdown, 
        liquidityScore, 
        realityGap 
    } = metrics;

    let allocation = this.baseAllocation;
    let riskState = "NEUTRAL";

    // Veto Conditions (Hard Stops)
    if (lssScore < 85) return { allocation: 0, riskState: "VETO_LSS_LOW" };
    if (currentDrawdown > 15) return { allocation: 0, riskState: "VETO_DRAWDOWN_BREACH" };
    if (realityGap > 15) return { allocation: 0, riskState: "VETO_REALITY_GAP" };
    if (liquidityScore < 0.4) return { allocation: 0, riskState: "VETO_ILLIQUID" };

    // Dynamic Scaling
    // 1. Regime Confidence
    if (regimeProbability > 0.8) {
        allocation *= 1.2; // +20%
    } else if (regimeProbability < 0.5) {
        allocation *= 0.5; // -50%
        riskState = "CAUTIOUS";
    }

    // 2. Alpha Decay Check
    if (alphaDecayPercent > 20) {
        allocation *= 0.5; // Cut size in half if alpha is decaying fast
        riskState = "DEFENSIVE";
    }

    // 3. Liquidity Penalty
    if (liquidityScore < 0.7) {
        allocation *= liquidityScore; // Linear penalty based on liquidity
        riskState = "CAUTIOUS";
    }

    // 4. Drawdown Scaling (Anti-Martingale)
    if (currentDrawdown > 5) {
        // Decrease size as drawdown deepens
        const ddPenalty = 1 - (currentDrawdown / 15);
        allocation *= ddPenalty;
        riskState = "DEFENSIVE";
    }

    // Clamp limits
    allocation = Math.min(Math.max(allocation, 0), this.maxAllocation);

    if (allocation > this.baseAllocation && riskState === "NEUTRAL") {
        riskState = "AGGRESSIVE";
    }

    // Retorna com até 4 casas decimais para precisão de sizing
    return {
      allocation: parseFloat(allocation.toFixed(4)),
      risk_state: riskState
    };
  }
}
