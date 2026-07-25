export class InstitutionalRealityScore {
  constructor() {}

  /**
   * Calcula o Institutional Reality Score (IRS) com base em métricas estritas.
   * IRS = Alpha Survival + Execution Quality + Liquidity Health + Regime Accuracy - Operational Risk
   * Range Máximo Teórico: 0 a 100
   */
  calculateIRS(metrics) {
    const {
      alphaSurvivalScore, // 0-25
      executionQuality,   // 0-25
      liquidityHealth,    // 0-25
      regimeAccuracy,     // 0-25
      operationalRiskPenalty // 0-100 (Subtraído)
    } = metrics;

    let irs = (alphaSurvivalScore + executionQuality + liquidityHealth + regimeAccuracy) - operationalRiskPenalty;
    
    // Clamping
    irs = Math.max(0, Math.min(irs, 100));

    let state = "HALT";
    if (irs > 90) {
      state = "READY";
    } else if (irs >= 75) {
      state = "SHADOW ONLY";
    }

    // L8.5 False Negative Prevention
    // Se a saúde de liquidez ou qualidade de execução despencar, trava o sistema
    // impedindo que o alpha compense a falha operacional.
    if (liquidityHealth < 10 || executionQuality < 10) {
      state = "HALT";
    } else if (liquidityHealth < 18 || executionQuality < 18) {
      if (state === "READY") state = "SHADOW ONLY";
    }

    return {
      score: parseFloat(irs.toFixed(2)),
      state: state,
      breakdown: {
        alphaSurvivalScore,
        executionQuality,
        liquidityHealth,
        regimeAccuracy,
        operationalRiskPenalty
      }
    };
  }

  evaluateDailyShadowMetrics(telemetryDB) {
    // Integração teórica com o banco de telemetria para recalcular dinamicamente.
    // Lê os trades do shadow_execution_database nas últimas 24h.
    
    // Dummy metrics (para testes isolados do motor de pontuação)
    return this.calculateIRS({
      alphaSurvivalScore: 23.5,
      executionQuality: 20.0,
      liquidityHealth: 22.0,
      regimeAccuracy: 24.5,
      operationalRiskPenalty: 5.0
    });
  }
}
