import { OperationalChaosEngine } from './operationalChaosEngine.js';

export class InstitutionalChaosEngine extends OperationalChaosEngine {
  constructor(intensity = 0.5) {
    super(intensity);
    this.institutionalIntensity = intensity; 
  }

  // 1. Regime Inversion (Mercado vira 180 graus de repente)
  injectRegimeInversion(regimeAccuracy) {
    if (Math.random() < this.institutionalIntensity * 0.1) {
      console.log(`[RED TEAM] Regime Inversion Attack Triggered!`);
      return 1.0 - regimeAccuracy; // Se o modelo confia em 90%, cai pra 10%
    }
    return regimeAccuracy;
  }

  // 2. Liquidity Disappearance
  injectLiquidityDisappearance(liquidityScore) {
    if (Math.random() < this.institutionalIntensity * 0.15) {
      console.log(`[RED TEAM] Liquidity Disappearance Attack Triggered!`);
      return liquidityScore * 0.1; // Book esvazia 90% repentinamente
    }
    return liquidityScore;
  }

  // 3. Exchange Outage
  injectExchangeOutage() {
    if (Math.random() < this.institutionalIntensity * 0.05) {
      console.log(`[RED TEAM] Exchange Outage Attack Triggered!`);
      throw new Error("EXCHANGE_OUTAGE: WebSocket closed connection.");
    }
  }

  // 4. Extreme Volatility (Whipsaw severo gerando stop no meio do milisegundo)
  injectExtremeVolatility(theoreticalPnl) {
    if (Math.random() < this.institutionalIntensity * 0.2) {
      // Retorna perda severa mesmo em trade que seria ganho
      console.log(`[RED TEAM] Extreme Volatility Flash Crash Triggered!`);
      return -Math.abs(theoreticalPnl) * 3; // 3x pior que o planejado
    }
    return theoreticalPnl;
  }

  // 5. Fake Alpha Detection (Sinal falso emitido maliciosamente)
  injectFakeAlpha(signalConfidence) {
    if (Math.random() < this.institutionalIntensity * 0.1) {
       console.log(`[RED TEAM] Fake Alpha (Mirage) Triggered!`);
       return 0.99; // Força uma confiança cega falsa
    }
    return signalConfidence;
  }

  // 6. Data Corruption & Delayed Execution já vem da classe pai, apenas agrava
  corruptMarketData(payload) {
    let corrupted = super.corruptMarketData(payload);
    corrupted.regimeAccuracy = this.injectRegimeInversion(corrupted.regimeAccuracy);
    corrupted.liquidityScore = this.injectLiquidityDisappearance(corrupted.liquidityScore);
    if (corrupted.confidence) {
       corrupted.confidence = this.injectFakeAlpha(corrupted.confidence);
    }
    return corrupted;
  }
}
