/**
 * Lyzer Edge — EvidenceFusionEngine
 * Bayesian Evidence Fusion Engine with Online Weight Updating (BMA & EWMA).
 * Fuses multi-source evidence payloads (LyzerNative, OpenMobius, LiquidityEngine, MacroRegime, Volatility)
 * into a dynamically weighted Posterior Evidence Score.
 */

export class EvidenceFusionEngine {
  constructor(alpha = 0.15) {
    this._alpha = alpha; // EWMA smoothing factor for online performance updates
    this._weights = {
      LYZER_NATIVE: 0.05,
      OPENMOBIUS_SMC: 0.40,
      LIQUIDITY_ENGINE: 0.15,
      MACRO_REGIME: 0.05,
      VOLATILITY_ENGINE: 0.05,
      WYCKOFF_VOLUME_ENGINE: 0.30,
      MARKET_PROFILE_ENGINE: 0.20
    };
    this._historicalPerformance = {
      LYZER_NATIVE: 0.65,
      OPENMOBIUS_SMC: 0.85,
      LIQUIDITY_ENGINE: 0.80,
      MACRO_REGIME: 0.60,
      VOLATILITY_ENGINE: 0.55,
      WYCKOFF_VOLUME_ENGINE: 0.80,
      MARKET_PROFILE_ENGINE: 0.20
    };
    this._disposed = false;
  }

  /**
   * Dynamically adapts weights based on market regime and online performance calibration.
   */
  adaptWeightsForRegime(regime) {
    if (regime === 'RANGING' || regime === 'CONSOLIDATION' || regime === 'CHOPPY') {
      // In ranging markets, SMC structure (OpenMobius) and Liquidity pools gain higher weight
      this._weights.OPENMOBIUS_SMC = 0.40;
      this._weights.LIQUIDITY_ENGINE = 0.30;
      this._weights.LYZER_NATIVE = 0.15;
      this._weights.MACRO_REGIME = 0.10;
      this._weights.VOLATILITY_ENGINE = 0.05;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.15;
      this._weights.MARKET_PROFILE_ENGINE = 0.40;
    } else if (regime === 'HIGH_VOLATILITY') {
      // In volatile markets, Volatility & Macro Regime take precedence
      this._weights.VOLATILITY_ENGINE = 0.35;
      this._weights.MACRO_REGIME = 0.30;
      this._weights.LYZER_NATIVE = 0.15;
      this._weights.OPENMOBIUS_SMC = 0.10;
      this._weights.LIQUIDITY_ENGINE = 0.10;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.15;
      this._weights.MARKET_PROFILE_ENGINE = 0.10;
    } else {
      // Default balanced Bayesian weights
      this._weights.LYZER_NATIVE = 0.30;
      this._weights.OPENMOBIUS_SMC = 0.25;
      this._weights.LIQUIDITY_ENGINE = 0.20;
      this._weights.MACRO_REGIME = 0.15;
      this._weights.VOLATILITY_ENGINE = 0.10;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.15;
      this._weights.MARKET_PROFILE_ENGINE = 0.20;
    }

    this._normalizeWeights();
    return Object.freeze({ ...this._weights });
  }

  /**
   * Online EWMA performance update step.
   */
  updateSourcePerformance(sourceKey, accuracyScore) {
    if (this._historicalPerformance[sourceKey] !== undefined) {
      const prev = this._historicalPerformance[sourceKey];
      this._historicalPerformance[sourceKey] = (1 - this._alpha) * prev + this._alpha * accuracyScore;

      // Dynamic Kill-Switch
      if (this._historicalPerformance[sourceKey] < 0.30) {
        this._weights[sourceKey] = 0;
        console.warn(`KILL-SWITCH TRIGGERED: ${sourceKey} quarantined due to toxic win rate.`);
      }
    }
  }

  /**
   * Core Bayesian Evidence Fusion step.
   * Computes normalized Posterior Evidence Score.
   */
  fuseEvidence(evidenceArray) {
    if (this._disposed) {
      throw new Error('ERR_FUSION_ENGINE_DISPOSED: Engine has been disposed');
    }

    if (!evidenceArray || evidenceArray.length === 0) {
      return this._createDefaultScore();
    }

    let weightedConfidence = 0;
    let weightedProbability = 0;
    let totalWeight = 0;
    let minUncertainty = 1.0;
    let primaryRegime = 'BALANCED';

    for (const ev of evidenceArray) {
      const src = ev.sourceEngine || 'OPENMOBIUS_SMC';
      const weightKey = src.includes('OPENMOBIUS') ? 'OPENMOBIUS_SMC' :
                        src.includes('MARKET_PROFILE') ? 'MARKET_PROFILE_ENGINE' :
                        src.includes('LIQUIDITY') ? 'LIQUIDITY_ENGINE' :
                        src.includes('VOLATILITY') ? 'VOLATILITY_ENGINE' :
                        src.includes('MACRO') ? 'MACRO_REGIME' :
                        src.includes('WYCKOFF') ? 'WYCKOFF_VOLUME_ENGINE' : 'LYZER_NATIVE';

      const weight = (this._weights[weightKey] || 0.20) * (this._historicalPerformance[weightKey] || 0.70);
      const metrics = ev.evidenceMetrics || { confidence: 0.5, probability: 0.5, uncertainty: 0.5 };

      weightedConfidence += metrics.confidence * weight;
      weightedProbability += metrics.probability * weight;
      totalWeight += weight;

      if (metrics.uncertainty < minUncertainty) {
        minUncertainty = metrics.uncertainty;
      }
      if (ev.regimeState && typeof ev.regimeState === 'object') {
        const topRegime = Object.keys(ev.regimeState).reduce((a, b) => ev.regimeState[a] > ev.regimeState[b] ? a : b, 'BALANCED');
        primaryRegime = topRegime;
      }
    }

    const normFactor = totalWeight > 0 ? totalWeight : 1.0;
    const fusedConfidence = Math.round((weightedConfidence / normFactor) * 100) / 100;
    const fusedProbability = Math.round((weightedProbability / normFactor) * 100) / 100;
    const posteriorScore = Math.round((fusedConfidence * (1.0 - minUncertainty)) * 100) / 100;

    return Object.freeze({
      timestamp: Date.now(),
      posteriorScore,
      fusedConfidence,
      fusedProbability,
      minUncertainty,
      primaryRegime,
      activeWeights: { ...this._weights },
      provenance: {
        engine: 'EVIDENCE_FUSION_ENGINE',
        realityTag: 'INFERRED_REALITY',
        minRuntimeVersion: '3.5.0'
      }
    });
  }

  _normalizeWeights() {
    const sum = Object.values(this._weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const k of Object.keys(this._weights)) {
        this._weights[k] = Math.round((this._weights[k] / sum) * 100) / 100;
      }
    }
  }

  _createDefaultScore() {
    return Object.freeze({
      timestamp: Date.now(),
      posteriorScore: 0.50,
      fusedConfidence: 0.50,
      fusedProbability: 0.50,
      minUncertainty: 0.50,
      primaryRegime: 'BALANCED',
      activeWeights: { ...this._weights },
      provenance: {
        engine: 'EVIDENCE_FUSION_ENGINE',
        realityTag: 'INFERRED_REALITY',
        minRuntimeVersion: '3.5.0'
      }
    });
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
