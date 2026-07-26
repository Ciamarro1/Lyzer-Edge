/**
 * Lyzer Edge — OpenMobiusRegimeDetector
 * Probabilistic market regime state classifier.
 * Estimates probability distribution over EXPANSION, CONTRACTION, CONSOLIDATION, and HIGH_VOLATILITY states.
 */

export class OpenMobiusRegimeDetector {
  constructor() {
    this._lastDistribution = {
      EXPANSION: 0.25,
      CONTRACTION: 0.25,
      CONSOLIDATION: 0.25,
      HIGH_VOLATILITY: 0.25
    };
  }

  detectRegime(volatility, trendDirection, fvgCount) {
    let pExpansion = 0.25;
    let pContraction = 0.25;
    let pConsolidation = 0.25;
    let pHighVol = 0.25;

    if (volatility > 0.03) {
      pHighVol = 0.60;
      pExpansion = 0.20;
      pContraction = 0.10;
      pConsolidation = 0.10;
    } else if (Math.abs(trendDirection) === 1 && fvgCount > 0) {
      pExpansion = 0.65;
      pHighVol = 0.15;
      pConsolidation = 0.10;
      pContraction = 0.10;
    } else if (volatility < 0.005) {
      pConsolidation = 0.70;
      pContraction = 0.15;
      pExpansion = 0.10;
      pHighVol = 0.05;
    }

    const sum = pExpansion + pContraction + pConsolidation + pHighVol;
    this._lastDistribution = {
      EXPANSION: Math.round((pExpansion / sum) * 100) / 100,
      CONTRACTION: Math.round((pContraction / sum) * 100) / 100,
      CONSOLIDATION: Math.round((pConsolidation / sum) * 100) / 100,
      HIGH_VOLATILITY: Math.round((pHighVol / sum) * 100) / 100
    };

    return Object.freeze({ ...this._lastDistribution });
  }

  getDistribution() {
    return Object.freeze({ ...this._lastDistribution });
  }
}
