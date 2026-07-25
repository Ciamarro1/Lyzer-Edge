export class LiquiditySurvivalEngine {
  constructor(config = {}) {
    this.maxAcceptableSpread = config.maxAcceptableSpread || 0.001; // 0.1% max spread
    this.minVolumeRequirement = config.minVolumeRequirement || 1000000; // $1M baseline
  }

  /**
   * Avalia as condições microscópicas do mercado para decidir se um sinal de alfa
   * merece ser operado ou se será engolido pela fricção e falta de profundidade.
   * Não opina sobre a direção, apenas sobre a viabilidade da execução.
   */
  evaluateLiquidityEnvironment(marketState) {
    const { spread, volume, depth, volatility, regime } = marketState;

    let tradeAllowed = true;
    let executionRisk = "LOW";
    let liquidityScore = 1.0;

    // 1. Spread Check
    if (spread > this.maxAcceptableSpread) {
      tradeAllowed = false;
      executionRisk = "CRITICAL_SPREAD";
      liquidityScore = 0.0;
    }

    // 2. Volume Check
    if (volume < this.minVolumeRequirement) {
        tradeAllowed = false;
        executionRisk = "ILLIQUID_VOID";
        liquidityScore = 0.0;
    }

    // 3. Volatility / Depth Penalty
    if (tradeAllowed) {
        // Alta volatilidade e baixa profundidade de book resultam em baixo score
        const depthFactor = Math.min(depth / (this.minVolumeRequirement * 0.1), 1.0); // Ratio of required local depth
        const volatilityPenalty = volatility > 0.05 ? 0.3 : 0.0;
        
        liquidityScore = depthFactor - volatilityPenalty;
        
        if (liquidityScore < 0.4) {
            executionRisk = "HIGH";
        } else if (liquidityScore < 0.7) {
            executionRisk = "MEDIUM";
        }

        // Regime-based veto
        if (regime === "NEWS_SHOCK" || regime === "FLASH_CRASH") {
            tradeAllowed = false;
            executionRisk = "SYSTEMIC_SHOCK";
            liquidityScore = 0.0;
        }
    }

    return {
      trade_allowed: tradeAllowed,
      liquidity_score: Math.max(0, liquidityScore),
      execution_risk: executionRisk
    };
  }
}
