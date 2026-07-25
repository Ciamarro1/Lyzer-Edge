/**
 * evSignalRedesign.js
 * Signal Engine Redesign v2 — Generates ex-post alpha using robust mathematical features.
 * Integrates Multi-Timeframe Belief Fusion and EV Feature Causal Engine (FCE v1).
 */

import { runMTFEngine } from './evMTFEngine.js';
import { EVFeatureCausalEngine } from './evFeatureCausalEngine.js';

export class EvSignalEngine {
  constructor(params = {}) {
    this.PARAMS = {
      featureDecay: params.featureDecay ?? 0.85,       // Memory decay factor
      noiseThreshold: params.noiseThreshold ?? 1.30,   // Entropy limit for noise detection (max ~1.58)
      multiTFWeights: params.multiTFWeights ?? [0.5, 0.3, 0.2], // Timeframe scoring weights (Fast, Medium, Slow)
      regimeInfluence: params.regimeInfluence ?? 0.7,  // Regime-conditioned shift impact
      instabilityThreshold: params.instabilityThreshold ?? 0.40, // MTF instability circuit breaker threshold
      disableMTF: params.disableMTF ?? false,          // Bypass MTF checks if true
      overrideRegimes: params.overrideRegimes ?? null   // Force specific regimes if provided (array/map)
    };
    
    this.memory = {
      featureHistory: {},
      trendScores: {},
      signalCache: {}
    };

    this.fce = new EVFeatureCausalEngine();
  }

  /**
   * Evaluates the candle history and returns signal metrics.
   * @param {Array} candles - Full list of candles.
   * @param {number} index - Current simulation index.
   * @returns {Object} Enriched signal payload.
   */
  evaluate(candles, index) {
    const slowWarmup = 100;
    if (index < slowWarmup) {
      return {
        signal: 'caution',
        confidence: 50,
        reasons: ['Warmup period - insufficient historical data'],
        regime: 'ranging',
        volatility: 'normal',
        trendStrength: 'weak',
        rsi: 50,
        ema20: candles[index].close,
        ema50: candles[index].close,
        volume: candles[index].volume,
        volPct: 0.005,
        Z_t: 0
      };
    }

    const currentCandle = candles[index];

    // 1. Calculate Core Base (1m) Indicators
    const ema9 = this.calculateEMA(candles, index, 9);
    const ema21 = this.calculateEMA(candles, index, 21);
    const ema20 = this.calculateEMA(candles, index, 20);
    const ema50 = this.calculateEMA(candles, index, 50);
    const ema100 = this.calculateEMA(candles, index, 100);
    const rsi = this.calculateRSI(candles, index, 14);
    const volPct = this.calculateVolPct(candles, index);

    // 2. Query EV Feature Causal Engine (FCE v1)
    const fceFeatures = this.fce.generateFeatures(candles, index);
    const zVal = fceFeatures.z_hat;
    const isNoisy = fceFeatures.entropy > this.PARAMS.noiseThreshold;

    // 3. Early Trend Emergence Derivative
    const ema20Fn = (c, idx) => this.calculateEMA(c, idx, 20);
    const ema50Fn = (c, idx) => this.calculateEMA(c, idx, 50);
    const trendDerivative = this.calculateTrendDerivative(candles, index, ema20Fn, ema50Fn);

    // 4. Construct Multi-Timeframe Data Feed via Backward Aggregation
    const historyLength = 30;
    const dataByTF = {
      "1m": this.aggregateCandlesBackward(candles, index, 1, historyLength),
      "5m": this.aggregateCandlesBackward(candles, index, 5, historyLength),
      "15m": this.aggregateCandlesBackward(candles, index, 15, historyLength),
      "1h": this.aggregateCandlesBackward(candles, index, 60, historyLength)
    };

    // Enrich each TF series with indicator states
    const tfs = ["1m", "5m", "15m", "1h"];
    for (const tf of tfs) {
      const series = dataByTF[tf];
      const emas20 = this.calculateEMASeries(series, 20);
      const emas50 = this.calculateEMASeries(series, 50);
      const rsis = this.calculateRSISeries(series, 14);

      for (let j = 0; j < series.length; j++) {
        series[j].ema20 = emas20[j] || series[j].close;
        series[j].ema50 = emas50[j] || series[j].close;
        series[j].rsi = rsis[j] || 50;
      }
    }

    // 5. Run MTF Engine Consensus or bypass if disabled
    let currentMTF;
    if (this.PARAMS.disableMTF) {
      const fastSignal = ema9 > ema21 ? 1 : -1;
      const medSignal = ema20 > ema50 ? 1 : -1;
      const slowSignal = ema50 > ema100 ? 1 : -1;
      const w = this.PARAMS.multiTFWeights;
      const score = w[0] * fastSignal + w[1] * medSignal + w[2] * slowSignal;
      currentMTF = {
        score,
        circuitBreakerTriggered: false,
        agreement: 0.5
      };
    } else {
      const featureExtractor = (c) => {
        const emaBullish = c.ema20 > c.ema50 ? 1 : -1;
        const rsiSignal = c.rsi < 40 ? 1 : (c.rsi > 60 ? -1 : 0);
        const returnVal = c.open > 0 ? (c.close - c.open) / c.open : 0;
        const dir = Math.sign(returnVal);
        return [emaBullish, rsiSignal, dir];
      };

      const regimeExtractor = (c) => {
        if (c.ema20 > c.ema50 * 1.001) return 1;
        if (c.ema20 < c.ema50 * 0.999) return -1;
        return 0;
      };

      const mtfResult = runMTFEngine(dataByTF, featureExtractor, regimeExtractor, {
        instabilityThreshold: this.PARAMS.instabilityThreshold
      });
      currentMTF = mtfResult.signals[mtfResult.signals.length - 1];
    }

    // 6. Volume Confirmation
    const recentVolume = candles.slice(index - 19, index + 1).map(c => c.volume);
    const avgVolume = recentVolume.reduce((sum, v) => sum + v, 0) / 20;
    const isVolumeSpike = currentCandle.volume > 1.2 * avgVolume;

    // 7. Regime Classification (1m base or override)
    const emaDiff = Math.abs(ema20 - ema50) / ema50;
    let trendStrength = 'moderate';
    if (emaDiff > 0.005) trendStrength = 'strong';
    else if (emaDiff < 0.0015) trendStrength = 'weak';

    let regime = 'ranging';
    if (this.PARAMS.overrideRegimes && this.PARAMS.overrideRegimes[index]) {
      regime = this.PARAMS.overrideRegimes[index];
    } else {
      if (trendStrength === 'strong') {
        regime = ema20 > ema50 ? 'trending_up' : 'trending_down';
      } else if (volPct > 0.015) {
        regime = 'volatile_ranging';
      }
    }

    // 8. Update Memory Feature States
    this.updateMemory('consensus', currentMTF.score);
    this.updateMemory('volPct', volPct);
    this.updateMemory('trendDerivative', trendDerivative);

    // 9. Signal Decision Logic (Z_t Driven + Circuit Breaker)
    const reasons = [];
    let signal = 'caution';
    let confidence = 50;

    if (currentMTF.circuitBreakerTriggered) {
      reasons.push('MTF_DIVERGENCE_BLOCKED');
      signal = 'caution';
      confidence = 35;
    } else if (isNoisy) {
      reasons.push('SIGNAL_NOISE_BLOCKED');
      signal = 'caution';
      confidence = 40;
    } else {
      // Base entries on Latent Causal State Z_t
      const bullishEmergence = zVal > 0.15 && fceFeatures.causalMomentum > 0;
      const bearishEmergence = zVal < -0.15 && fceFeatures.causalMomentum < 0;

      if (bullishEmergence) {
        signal = 'go'; // LONG
        confidence = Math.round(72 + Math.min(0.85, zVal) * 20 + (isVolumeSpike ? 8 : 0));
        reasons.push('CAUSAL_STATE_BULLISH_Z');
        if (isVolumeSpike) reasons.push('VOLUME_CONFIRMATION');
        if (currentMTF.agreement > 0.5) reasons.push('MTF_HIERARCHICAL_ALIGNMENT');
      } else if (bearishEmergence) {
        signal = 'no-go'; // SHORT
        confidence = Math.round(72 + Math.min(0.85, Math.abs(zVal)) * 20 + (isVolumeSpike ? 8 : 0));
        reasons.push('CAUSAL_STATE_BEARISH_Z');
        if (isVolumeSpike) reasons.push('VOLUME_CONFIRMATION');
        if (currentMTF.agreement > 0.5) reasons.push('MTF_HIERARCHICAL_ALIGNMENT');
      } else {
        signal = 'caution';
        confidence = 45;
        reasons.push('HOLD_REGIME');
      }
    }

    // Clip confidence
    confidence = Math.max(0, Math.min(100, confidence));

    return {
      signal,
      confidence,
      reasons,
      regime,
      volatility: volPct > 0.015 ? 'high' : (volPct < 0.005 ? 'low' : 'normal'),
      trendStrength,
      rsi: parseFloat(rsi.toFixed(2)),
      ema20: parseFloat(ema20.toFixed(2)),
      ema50: parseFloat(ema50.toFixed(2)),
      volume: currentCandle.volume,
      volPct: parseFloat(volPct.toFixed(4)),
      Z_t: zVal
    };
  }

  /* ----------------------------- DATA HELPERS ----------------------------- */

  aggregateCandlesBackward(candles, index, windowSize, length) {
    const result = [];
    for (let k = length - 1; k >= 0; k--) {
      const end = index - k * windowSize;
      const start = index - (k + 1) * windowSize + 1;
      const safeStart = Math.max(0, start);
      const safeEnd = Math.max(0, end);
      const slice = candles.slice(safeStart, safeEnd + 1);

      if (slice.length === 0) {
        result.push({ open: 0, high: 0, low: 0, close: 0, volume: 0, timestamp: 0, datetime: '' });
      } else {
        result.push({
          open: slice[0].open,
          high: Math.max(...slice.map(c => c.high)),
          low: Math.min(...slice.map(c => c.low)),
          close: slice[slice.length - 1].close,
          volume: slice.reduce((sum, c) => sum + c.volume, 0),
          timestamp: candles[safeEnd].timestamp,
          datetime: candles[safeEnd].datetime
        });
      }
    }
    return result;
  }

  /* ----------------------------- MATH HELPERS ----------------------------- */

  calculateEMA(candles, index, period) {
    const k = 2 / (period + 1);
    let ema = candles[0].close;
    for (let i = 1; i <= index; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    return ema;
  }

  calculateEMASeries(series, period) {
    if (series.length === 0) return [];
    const k = 2 / (period + 1);
    let ema = series[0].close;
    const emas = [ema];
    for (let i = 1; i < series.length; i++) {
      ema = series[i].close * k + ema * (1 - k);
      emas.push(ema);
    }
    return emas;
  }

  calculateRSI(candles, index, period) {
    if (index < period) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = index - period + 1; i <= index; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  calculateRSISeries(series, period) {
    const rsis = new Array(series.length).fill(50);
    if (series.length <= period) return rsis;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = series[i].close - series[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsis[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = period + 1; i < series.length; i++) {
      const diff = series[i].close - series[i - 1].close;
      let currentGain = 0;
      let currentLoss = 0;
      if (diff > 0) currentGain = diff;
      else currentLoss = -diff;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

      if (avgLoss === 0) {
        rsis[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsis[i] = 100 - 100 / (1 + rs);
      }
    }
    return rsis;
  }

  calculateVolPct(candles, index) {
    const recentCloses = candles.slice(index - 19, index + 1).map(c => c.close);
    const mean = recentCloses.reduce((a, b) => a + b, 0) / 20;
    const variance = recentCloses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }

  calculateTrendDerivative(candles, index, ema20Fn, ema50Fn) {
    const diffs = [];
    for (let i = index - 4; i <= index; i++) {
      diffs.push(ema20Fn(candles, i) - ema50Fn(candles, i));
    }
    const yMean = diffs.reduce((a, b) => a + b, 0) / 5;
    let num = 0;
    const den = 10;
    for (let i = 0; i < 5; i++) {
      num += (i - 2) * (diffs[i] - yMean);
    }
    return num / den;
  }

  updateMemory(featureName, value) {
    const decay = this.PARAMS.featureDecay;
    if (this.memory.featureHistory[featureName] === undefined) {
      this.memory.featureHistory[featureName] = value;
    } else {
      this.memory.featureHistory[featureName] = decay * this.memory.featureHistory[featureName] + (1 - decay) * value;
    }
    return this.memory.featureHistory[featureName];
  }
}
 