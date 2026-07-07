/**
 * evFeatureCausalEngine.js
 * Feature Causal Engine (FCE v1) — 2026.6.3
 * Decomposes market observations into latent causal states and weights.
 */

export class EVFeatureCausalEngine {
  constructor(params = {}) {
    this.params = {
      emaFast: params.emaFast ?? 9,
      emaSlow: params.emaSlow ?? 21,
      entropyWindow: params.entropyWindow ?? 20,
      microWindow: params.microWindow ?? 10,
      lambda: params.lambda ?? 0.01
    };
  }

  // -----------------------------
  // 1. BASIC UTILITIES (Native)
  // -----------------------------

  sma(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  std(values) {
    if (values.length === 0) return 0;
    const meanVal = this.sma(values);
    const varianceVal = values.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / values.length;
    return Math.sqrt(varianceVal);
  }

  entropy(values) {
    if (values.length < 2) return 0;
    const states = [];
    const threshold = 0.0001; // 0.01% return change threshold

    for (let j = 1; j < values.length; j++) {
      const prev = values[j - 1];
      const change = prev === 0 ? 0 : (values[j] - prev) / prev;
      if (change > threshold) {
        states.push('up');
      } else if (change < -threshold) {
        states.push('down');
      } else {
        states.push('flat');
      }
    }

    const freq = { up: 0, down: 0, flat: 0 };
    states.forEach(s => {
      freq[s]++;
    });

    const total = states.length;
    let entropyVal = 0;
    for (const key in freq) {
      if (freq[key] > 0) {
        const p = freq[key] / total;
        entropyVal -= p * Math.log2(p);
      }
    }
    return entropyVal;
  }

  // -----------------------------
  // 2. REGIME ESTIMATOR (Z_t macro proxy)
  // -----------------------------

  computeRegime(candles, i) {
    const slice = candles.slice(Math.max(0, i - 20), i + 1);
    const closes = slice.map(c => c.close);

    const returns = [];
    for (let j = 1; j < closes.length; j++) {
      returns.push((closes[j] - closes[j - 1]) / (closes[j - 1] || 1));
    }

    const meanVal = this.sma(returns);
    const vol = this.std(returns);

    if (vol === 0) return 'choppy';

    const trendStrength = meanVal / vol;

    if (trendStrength > 0.5) return 'trending_up';
    if (trendStrength < -0.5) return 'trending_down';
    return 'choppy';
  }

  // -----------------------------
  // 3. MICROSTRUCTURE ENCODER
  // -----------------------------

  computeMicrostructure(candles, i) {
    const start = Math.max(0, i - this.params.microWindow + 1);
    const slice = candles.slice(start, i + 1);

    const ranges = slice.map(c => Math.abs(c.high - c.low));
    const bodies = slice.map(c => Math.abs(c.close - c.open));
    const wicks = slice.map((c, idx) => ranges[idx] - bodies[idx]);

    const avgRange = this.sma(ranges);
    const avgBody = this.sma(bodies);
    const avgWick = this.sma(wicks);

    const firstOpen = slice[0]?.open || 1;
    const lastClose = slice[slice.length - 1]?.close || 1;
    const imbalance = (lastClose - firstOpen) / (firstOpen || 1);

    return {
      volatilityProxy: avgRange,
      bodyRatio: avgBody / (avgRange + 1e-9),
      wickPressure: avgWick,
      imbalance: imbalance
    };
  }

  // -----------------------------
  // 4. LATENT STATE APPROXIMATION Ẑ_t
  // -----------------------------

  estimateLatentState(candles, i) {
    const micro = this.computeMicrostructure(candles, i);
    const regime = this.computeRegime(candles, i);

    let stateVector = 0;

    if (regime === 'trending_up') stateVector += 1;
    if (regime === 'trending_down') stateVector -= 1;

    stateVector += micro.imbalance * 0.5;

    return {
      z_hat: stateVector,
      regime,
      micro
    };
  }

  // -----------------------------
  // 5. CAUSAL FEATURE SYNTHESIS
  // -----------------------------

  generateFeatures(candles, i) {
    const z = this.estimateLatentState(candles, i);

    const start = Math.max(0, i - this.params.entropyWindow + 1);
    const slice = candles.slice(start, i + 1);
    const closes = slice.map(c => c.close);

    const entropyVal = this.entropy(closes);

    const momentum =
      closes.length > 2
        ? (closes[closes.length - 1] - closes[0]) / (closes[0] || 1)
        : 0;

    const features = {
      // latent state
      z_hat: z.z_hat,

      // regime-aware encoding
      regime: z.regime,

      // microstructure causal signals
      volatility: z.micro.volatilityProxy,
      imbalance: z.micro.imbalance,
      wickPressure: z.micro.wickPressure,

      // entropy (noise estimator)
      entropy: entropyVal,

      // causal momentum (not technical momentum)
      causalMomentum: momentum * (1.0 / (entropyVal + 1e-6)),

      // stability score
      stability: 1.0 / (entropyVal + z.micro.volatilityProxy / (candles[i]?.close || 1) + 1e-6)
    };

    return features;
  }

  // -----------------------------
  // 6. CAUSAL WEIGHT ESTIMATION
  // -----------------------------

  compute(features, returns, regime, entropyVal) {
    const weights = {};
    let Z = 0;

    for (const key in features) {
      const x = features[key];
      if (typeof x !== 'number') continue;

      let w = this.correlationApprox(x, returns);

      w *= Math.exp(-this.params.lambda);
      w *= regime === 'trend' ? 1.3 : 0.8;
      w *= (1 - Math.min(1.0, entropyVal));

      const contribution = w * x;
      weights[key] = contribution;
      Z += contribution;
    }

    return {
      Z_t: Z,
      featureContribution: weights,
      causalConfidence: this.sigmoid(Math.abs(Z)),
      noiseRatio: entropyVal
    };
  }

  correlationApprox(x, returns) {
    return Math.tanh(x * returns); // Streaming-safe correlation proxy
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
}
 