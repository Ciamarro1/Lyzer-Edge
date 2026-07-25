/**
 * L12 Cross-Asset Regime Engine
 * Sintetiza observações individuais em um único estado macro agregado:
 * RISK_ON | RISK_NEUTRAL | RISK_OFF | SYSTEMIC_STRESS
 */

export class CrossAssetRegimeEngine {
  constructor() {
    this.currentRegime = 'RISK_NEUTRAL';
  }

  evaluateMacroRegime(observations) {
    const btc = observations['BTC'];
    const spy = observations['SPY'];
    const dxy = observations['DXY'];
    const vix = observations['VIX'];

    if (!btc || !spy || !dxy || !vix) {
      // Se não tiver todos os dados fundamentais, mantém o estado ou assume neutro/precaução
      return this.currentRegime;
    }

    // Lógica de SYSTEMIC_STRESS (Contágio e Pânico Macro)
    // Ex: BTC caindo/RISK_OFF + SPY RISK_OFF + DXY alta volatilidade/RISK_OFF + VIX explodindo
    const isCryptoOff = btc.regime === 'RISK_OFF';
    const isEquityOff = spy.regime === 'RISK_OFF';
    const isDollarSpiking = dxy.volatility > 0.30 || dxy.regime === 'RISK_OFF';
    const isVixSpiking = vix.volatility > 0.35 || vix.regime === 'RISK_OFF';

    if ((isCryptoOff && isEquityOff && isVixSpiking) || (isVixSpiking && isDollarSpiking && isEquityOff)) {
      this.currentRegime = 'SYSTEMIC_STRESS';
      return this.currentRegime;
    }

    // Lógica de RISK_OFF
    if (isCryptoOff || isEquityOff || isVixSpiking) {
      this.currentRegime = 'RISK_OFF';
      return this.currentRegime;
    }

    // Lógica de RISK_ON
    if (btc.regime === 'RISK_ON' && spy.regime === 'RISK_ON' && !isVixSpiking) {
      this.currentRegime = 'RISK_ON';
      return this.currentRegime;
    }

    this.currentRegime = 'RISK_NEUTRAL';
    return this.currentRegime;
  }
}
