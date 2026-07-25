/**
 * L12 Macro Stress Lab
 * Simula 3 cenários severos contra a carteira:
 * 1. Crise Crypto (BTC -40%)
 * 2. Inflação/Juros (DXY +15%, TLT -15%)
 * 3. Black Swan (Tudo correlaciona para baixo)
 */

export class MacroStressEngine {
  constructor(portfolioManager) {
    this.portfolio = portfolioManager;
  }

  runStressTest(scenarioId) {
    console.log(`[STRESS LAB] Executing Macro Stress Scenario: ${scenarioId}`);
    let simulatedDrawdown = 0;
    let recoveryTimeDays = 0;
    let capitalPreserved = true;

    switch (scenarioId) {
      case 'CRYPTO_CRISIS':
        // BTC -40%, ETH -50%, SOL -60%
        const btcImpact = this.portfolio.calculateMarginalVaR('BTC', 0.40, 1.0);
        simulatedDrawdown = btcImpact.systemicImpactPerc;
        recoveryTimeDays = 45;
        capitalPreserved = simulatedDrawdown < 10.0; // Hard stop in policy is 10%
        break;

      case 'INFLATION_SHOCK':
        // DXY +15%, SPY -15%, QQQ -25%
        simulatedDrawdown = (this.portfolio.assetWeights['SPY'] || 0) * 15 + (this.portfolio.assetWeights['QQQ'] || 0) * 25;
        recoveryTimeDays = 90;
        capitalPreserved = simulatedDrawdown < 10.0;
        break;

      case 'BLACK_SWAN':
        // Todos os ativos de risco caem 30% juntos com correlação 1.0
        const riskExposure = this.portfolio.exposures.CRYPTO + this.portfolio.exposures.MACRO;
        simulatedDrawdown = (riskExposure / this.portfolio.aum) * 30;
        recoveryTimeDays = 180;
        capitalPreserved = simulatedDrawdown < 10.0;
        break;

      default:
        throw new Error(`[STRESS ERROR] Unknown scenario ${scenarioId}`);
    }

    return {
      scenario: scenarioId,
      simulatedDrawdownPerc: simulatedDrawdown,
      estimatedRecoveryDays: recoveryTimeDays,
      capitalPreservedWithinPolicy: capitalPreserved
    };
  }
}
