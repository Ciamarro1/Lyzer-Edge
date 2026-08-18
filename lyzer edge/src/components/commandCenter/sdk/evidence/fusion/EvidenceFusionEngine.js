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
      LYZER_NATIVE: 0.40,
      OPENMOBIUS_SMC: 0.30,
      LIQUIDITY_ENGINE: 0.00,
      MACRO_REGIME: 0.00,
      VOLATILITY_ENGINE: 0.00,
      WYCKOFF_VOLUME_ENGINE: 0.30,
      MARKET_PROFILE_ENGINE: 0.00,
      TAPE_READING_ENGINE: 0.00
    };
    this._historicalPerformance = {
      LYZER_NATIVE: 0.65,
      OPENMOBIUS_SMC: 0.85,
      LIQUIDITY_ENGINE: 0.80,
      MACRO_REGIME: 0.60,
      VOLATILITY_ENGINE: 0.55,
      WYCKOFF_VOLUME_ENGINE: 0.80,
      MARKET_PROFILE_ENGINE: 0.20,
      TAPE_READING_ENGINE: 0.25
    };
    this.REGIMES = ['BALANCED', 'HIGH_VOLATILITY', 'RANGING', 'LOW_LIQUIDITY_NIGHT'];
    this._currentRegime = 'BALANCED';
    
    // Performance isolated by regime to eliminate cross-regime contamination (Regime Bleed)
    this._regimePerformance = {};
    for (const r of this.REGIMES) {
      this._regimePerformance[r] = {
        LYZER_NATIVE: 0.70,
        OPENMOBIUS_SMC: 0.75,
        LIQUIDITY_ENGINE: 0.75,
        MACRO_REGIME: 0.60,
        VOLATILITY_ENGINE: 0.65,
        WYCKOFF_VOLUME_ENGINE: 0.75,
        MARKET_PROFILE_ENGINE: 0.65,
        TAPE_READING_ENGINE: 0.70
      };
    }
    this._disposed = false;
  }

  /**
   * Dynamically adapts weights based on market regime and online performance calibration.
   */
  adaptWeightsForRegime(regime, hourUTC = null) {
    const isNight = hourUTC !== null ? (hourUTC >= 21 || hourUTC < 6) : false;
    const targetRegime = isNight ? 'LOW_LIQUIDITY_NIGHT' : regime;

    if (targetRegime === 'LOW_LIQUIDITY_NIGHT') {
      // In night lull, boundary SNR and Wyckoff dominate, momentum is silenced to prevent whipsaws
      this._weights.OPENMOBIUS_SMC = 0.20;
      this._weights.LIQUIDITY_ENGINE = 0.20;
      this._weights.LYZER_NATIVE = 0.35;
      this._weights.MACRO_REGIME = 0.05;
      this._weights.VOLATILITY_ENGINE = 0.02;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.25;
      this._weights.MARKET_PROFILE_ENGINE = 0.15;
      this._weights.TAPE_READING_ENGINE = 0.00;
    } else if (targetRegime === 'RANGING' || targetRegime === 'CONSOLIDATION' || targetRegime === 'CHOPPY') {
      // In ranging markets, SMC structure and Market Profile gain higher weight (OpenMobius 0.24 after normalization)
      this._weights.OPENMOBIUS_SMC = 0.30;
      this._weights.LIQUIDITY_ENGINE = 0.15;
      this._weights.LYZER_NATIVE = 0.05;
      this._weights.MACRO_REGIME = 0.05;
      this._weights.VOLATILITY_ENGINE = 0.05;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.15;
      this._weights.MARKET_PROFILE_ENGINE = 0.40;
      this._weights.TAPE_READING_ENGINE = 0.10;
    } else if (targetRegime === 'HIGH_VOLATILITY') {
      // In volatile markets, Volatility, Momentum & Tape Reading dominate
      this._weights.VOLATILITY_ENGINE = 0.30;
      this._weights.MACRO_REGIME = 0.15;
      this._weights.LYZER_NATIVE = 0.05;
      this._weights.OPENMOBIUS_SMC = 0.15;
      this._weights.LIQUIDITY_ENGINE = 0.15;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.05;
      this._weights.MARKET_PROFILE_ENGINE = 0.05;
      this._weights.TAPE_READING_ENGINE = 0.30;
    } else {
      // Default balanced Bayesian weights
      this._weights.LYZER_NATIVE = 0.25;
      this._weights.OPENMOBIUS_SMC = 0.20;
      this._weights.LIQUIDITY_ENGINE = 0.20;
      this._weights.MACRO_REGIME = 0.10;
      this._weights.VOLATILITY_ENGINE = 0.15;
      this._weights.WYCKOFF_VOLUME_ENGINE = 0.15;
      this._weights.MARKET_PROFILE_ENGINE = 0.10;
      this._weights.TAPE_READING_ENGINE = 0.15;
    }

    this._currentRegime = this.REGIMES.includes(targetRegime) ? targetRegime : 'BALANCED';
    this._normalizeWeights();
    return Object.freeze({ ...this._weights });
  }

  /**
   * Online EWMA performance update step partitioned by regime.
   */
  updateSourcePerformance(sourceKey, accuracyScore, tradeRegime = 'BALANCED') {
    const targetRegime = this.REGIMES.includes(tradeRegime) ? tradeRegime : this._currentRegime;
    const perfMap = this._regimePerformance[targetRegime] || this._regimePerformance.BALANCED;

    if (perfMap[sourceKey] !== undefined) {
      const prev = perfMap[sourceKey];
      perfMap[sourceKey] = (1 - this._alpha) * prev + this._alpha * accuracyScore;

      // Soft quarantine with prior restoration floor (never zero out permanently across all regimes)
      if (perfMap[sourceKey] < 0.30) {
        console.warn(`[CSRL] Engine ${sourceKey} performance degraded in regime ${targetRegime} (Score: ${perfMap[sourceKey].toFixed(2)}). Weight attenuated.`);
      }
    }

    // Also update global fallback
    if (this._historicalPerformance[sourceKey] !== undefined) {
      const prev = this._historicalPerformance[sourceKey];
      this._historicalPerformance[sourceKey] = (1 - this._alpha) * prev + this._alpha * accuracyScore;
    }
  }

  /**
   * Core Bayesian Evidence Fusion step.
   * Computes normalized Posterior Evidence Score.
   */
  fuseEvidence(evidenceArray, activeRegime = 'BALANCED') {
    if (this._disposed) {
      throw new Error('ERR_FUSION_ENGINE_DISPOSED: Engine has been disposed');
    }

    if (!evidenceArray || evidenceArray.length === 0) {
      return this._createDefaultScore();
    }

    this._currentRegime = this.REGIMES.includes(activeRegime) ? activeRegime : this._currentRegime;
    const perfMap = this._regimePerformance[this._currentRegime] || this._regimePerformance.BALANCED;

    let weightedConfidence = 0;
    let weightedProbability = 0;
    let totalWeight = 0;
    let minUncertainty = 1.0;
    let primaryRegime = this._currentRegime;

    for (const ev of evidenceArray) {
      const src = ev.sourceEngine || 'OPENMOBIUS_SMC';
      const weightKey = src.includes('OPENMOBIUS') ? 'OPENMOBIUS_SMC' :
                        src.includes('MARKET_PROFILE') ? 'MARKET_PROFILE_ENGINE' :
                        src.includes('LIQUIDITY') ? 'LIQUIDITY_ENGINE' :
                        src.includes('VOLATILITY') ? 'VOLATILITY_ENGINE' :
                        src.includes('MACRO') ? 'MACRO_REGIME' :
                        src.includes('WYCKOFF') ? 'WYCKOFF_VOLUME_ENGINE' :
                        src.includes('TAPE_READING') ? 'TAPE_READING_ENGINE' : 'LYZER_NATIVE';

      const baseWeight = this._weights[weightKey] !== undefined ? this._weights[weightKey] : 0.15;
      const perf = perfMap[weightKey] !== undefined ? perfMap[weightKey] : (this._historicalPerformance[weightKey] || 0.70);
      const effectiveWeight = Math.max(0.01, baseWeight * perf);

      const metrics = ev.evidenceMetrics || { confidence: 0.5, probability: 0.5, uncertainty: 0.5 };

      weightedConfidence += metrics.confidence * effectiveWeight;
      weightedProbability += metrics.probability * effectiveWeight;
      totalWeight += effectiveWeight;

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
