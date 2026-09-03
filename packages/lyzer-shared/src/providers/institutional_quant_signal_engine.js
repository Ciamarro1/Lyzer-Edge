/**
 * InstitutionalQuantSignalEngine
 * 
 * Production-grade Quantitative Signal Provider engineered according to
 * institutional quantitative asset management principles (e.g., AQR, Renaissance, Citadel).
 * 
 * CORE QUANTITATIVE PILLARS:
 * 1. Stationarity & Continuous Returns:
 *    All models operate strictly on continuous logarithmic returns r_t = ln(C_t / C_{t-1})
 *    rather than non-stationary raw price levels.
 * 
 * 2. Microstructure Variance (Garman-Klass, Parkinson & EWMA):
 *    Employs intraday OHLC micro-variance estimators with ~7.4x higher statistical efficiency
 *    than close-to-close estimators, combined with RiskMetrics EWMA (lambda = 0.94) and
 *    instantaneous volatility shock protection.
 * 
 * 3. Multi-Scale Regime Identification (Lo-MacKinlay Variance Ratio & Hurst Exponent):
 *    Uses the unbiased Variance Ratio Test across multiple scales (k=2, 4) to estimate the Hurst Exponent (H):
 *    - H < 0.45: Sub-diffusive / Mean-Reverting regime.
 *    - 0.45 <= H <= 0.55: Pure Brownian Motion / Random Walk Noise -> STRICTLY SUPPRESSES SIGNALS (Quants do not trade noise).
 *    - H > 0.55: Super-diffusive / Persistent Trend regime.
 * 
 * 4. Dual Regime-Conditioned Hypothesis Engines:
 *    - Mean-Reversion Mode: Fits discrete Ornstein-Uhlenbeck (OU) AR(1) process on spread,
 *      solves for reversion speed theta, half-life t_{1/2} = ln(2)/theta, equilibrium level,
 *      and standardized Z-score. Filters out excessive half-life (stagnation) or tiny half-life (noise bounce).
 *    - Trend Mode: Conducts Student's t-test hypothesis testing directly on stationary log returns
 *      with Newey-West HAC adjustment for autocorrelation: t = Sharpe * sqrt(N) (p < 0.05).
 * 
 * 5. Microstructure & Order Flow Imbalance (OFI) Proxy:
 *    Volume-weighted directional aggression metric confirming institutional order flow and
 *    vetoing trades that collide with aggressive absorption.
 * 
 * 6. Extreme Value Theory (EVT) & Asymmetric Tail Risk:
 *    Calculates higher moments (skewness, excess kurtosis). Evaluates 99% Expected Shortfall (CVaR)
 *    using Cornish-Fisher expansion on loss quantile. Vetoes long setups during fat left-tail crash
 *    hazards and short setups during violent right-tail squeeze regimes.
 * 
 * 7. Continuous Calibrated Confidence & Dynamic Fractional Kelly Sizing:
 *    Confidence is derived continuously from p-value statistical power, regime purity, OFI alignment,
 *    and tail risk discount. Fractional Kelly allocation scales with horizon-adjusted variance and confidence.
 */

export class InstitutionalQuantSignalEngine {
  /**
   * @param {Object} [config={}] Configuration parameters
   */
  constructor(config = {}) {
    this.version = "1.1.0";
    this.source = "INSTITUTIONAL_QUANT";

    // Horizon and sample sizes
    this.lookback = config.lookback || 64; // Primary lookback (power of 2 preferred)
    this.minBars = config.minBars || 30;   // Minimum sample for asymptotic normality

    // Statistical significance & hypothesis testing
    this.significanceLevel = config.significanceLevel !== undefined ? config.significanceLevel : 0.05; // alpha = 5%
    this.zScoreThreshold = config.zScoreThreshold !== undefined ? config.zScoreThreshold : 1.96;       // 95% 2-tail
    this.tStatThreshold = config.tStatThreshold !== undefined ? config.tStatThreshold : 2.00;          // t-test critical

    // Regime boundaries (Hurst Exponent)
    this.hurstMeanReversionMax = config.hurstMeanReversionMax !== undefined ? config.hurstMeanReversionMax : 0.45;
    this.hurstTrendingMin = config.hurstTrendingMin !== undefined ? config.hurstTrendingMin : 0.55;

    // Mean-Reversion OU constraints
    this.minHalfLife = config.minHalfLife !== undefined ? config.minHalfLife : 2.0;   // Bars (avoids bid-ask bounce)
    this.maxHalfLife = config.maxHalfLife !== undefined ? config.maxHalfLife : 35.0;  // Bars (avoids sluggish stagnation)

    // Volatility & Tail Risk constraints
    this.volShockMultiplier = config.volShockMultiplier !== undefined ? config.volShockMultiplier : 2.8;
    this.volShockFloor = config.volShockFloor !== undefined ? config.volShockFloor : 0.005; // 0.5% per-bar minimum shock floor
    this.maxExpectedShortfall = config.maxExpectedShortfall !== undefined ? config.maxExpectedShortfall : 0.06; // 6% 99-ES
    this.maxNegativeSkew = config.maxNegativeSkew !== undefined ? config.maxNegativeSkew : -1.2;
    this.maxPositiveSkew = config.maxPositiveSkew !== undefined ? config.maxPositiveSkew : 1.2;
    this.kurtosisThreshold = config.kurtosisThreshold !== undefined ? config.kurtosisThreshold : 3.0;

    // Order Flow Imbalance constraints
    this.ofiVetoThreshold = config.ofiVetoThreshold !== undefined ? config.ofiVetoThreshold : 0.30;

    // Preferred timeframe mapping
    this.preferredTimeframe = config.preferredTimeframe || 'intermediate';
  }

  /**
   * Primary entry point compliant with Lyzer Edge Provider interface.
   * Accepts multi-timeframe candle dictionary or single array.
   * 
   * @param {Object|Array} mtfCandles - { fast: [], intermediate: [], slow: [] } or Array of candles
   * @returns {Object} Institutional quantitative signal contract
   */
  reconstruct(mtfCandles) {
    if (!mtfCandles) {
      return this._emptyResult('NO_DATA_PROVIDED');
    }

    let candles;
    if (Array.isArray(mtfCandles)) {
      candles = mtfCandles;
    } else {
      // Prioritize intermediate, then slow, then fast, checking specific intervals
      const candidates = [
        mtfCandles.intermediate,
        mtfCandles['15m'],
        mtfCandles['5m'],
        mtfCandles.slow,
        mtfCandles['1h'],
        mtfCandles.fast,
        mtfCandles['1m'],
        mtfCandles.candles
      ];

      for (const cand of candidates) {
        if (Array.isArray(cand) && cand.length >= this.minBars) {
          candles = cand;
          break;
        }
      }

      if (!candles) {
        candles = mtfCandles.intermediate || mtfCandles.slow || mtfCandles.fast || mtfCandles.candles || [];
      }
    }

    return this.analyze(candles);
  }

  /**
   * Direct analysis of a candle series.
   * 
   * @param {Array<Object>} rawCandles - Array of OHLCV candles
   * @returns {Object} Quant signal payload
   */
  analyze(rawCandles) {
    if (!Array.isArray(rawCandles) || rawCandles.length < this.minBars) {
      return this._emptyResult('INSUFFICIENT_STATISTICAL_SAMPLE', {
        availableBars: Array.isArray(rawCandles) ? rawCandles.length : 0,
        requiredBars: this.minBars
      });
    }

    // Slice to analysis window
    const windowLength = Math.min(rawCandles.length, this.lookback);
    const candles = rawCandles.slice(-windowLength);

    // Sanitize candles to prevent NaN/Infinity propagating
    const cleanCandles = this._sanitizeCandles(candles);
    if (cleanCandles.length < this.minBars) {
      return this._emptyResult('DEGENERATE_DATA_REJECTED');
    }

    const currentClose = cleanCandles[cleanCandles.length - 1].close;

    // 1. Compute continuous log returns
    const logReturns = this._calculateLogReturns(cleanCandles);
    if (logReturns.length < this.minBars - 1) {
      return this._emptyResult('INSUFFICIENT_RETURNS');
    }

    // 2. Microstructure & High-Efficiency Volatility Estimators
    const garmanKlassVol = this._calculateGarmanKlassVol(cleanCandles);
    const parkinsonVol = this._calculateParkinsonVol(cleanCandles);
    const ewmaVol = this._calculateEWMAVol(logReturns, 0.94);
    const recentVol = this._calculateGarmanKlassVol(cleanCandles.slice(-5));
    const effectiveVol = Math.max(1e-6, recentVol > 0 ? recentVol : garmanKlassVol, ewmaVol);

    // Volatility Shock / Anomaly Check: compares instantaneous vol (recent 5 bars / EWMA) against baseline rolling median
    const baselineCandles = cleanCandles.length > 25 ? cleanCandles.slice(0, -5) : cleanCandles;
    const rollingMedianVol = this._calculateRollingMedianVol(baselineCandles, 20);
    const instantaneousVol = recentVol > 0 ? recentVol : garmanKlassVol;
    const isVolShock = rollingMedianVol > 0 && 
                       (instantaneousVol >= this.volShockFloor) && 
                       (instantaneousVol / rollingMedianVol >= this.volShockMultiplier);

    // 3. Regime Identification (Multi-Scale Variance Ratio & Hurst Exponent)
    const { hurst, varianceRatio } = this._calculateVarianceRatioAndHurst(logReturns, 4);

    let regime = 'RANDOM_WALK_NOISE';
    if (isVolShock) {
      regime = 'VOLATILITY_SHOCK';
    } else if (hurst < this.hurstMeanReversionMax) {
      regime = 'MEAN_REVERTING';
    } else if (hurst > this.hurstTrendingMin) {
      regime = 'TRENDING_PERSISTENT';
    } else {
      regime = 'RANDOM_WALK_NOISE';
    }

    // 4. Higher Moments & Extreme Value Tail Risk (Cornish-Fisher on Loss Quantile)
    const { skewness, kurtosis, meanReturn, stdReturn } = this._calculateHigherMoments(logReturns);
    const { var99, expectedShortfall } = this._calculateCornishFisherVaR_ES(
      meanReturn,
      stdReturn,
      skewness,
      kurtosis,
      0.99
    );

    // 5. Microstructure Order Flow Imbalance (OFI)
    const orderFlowImbalance = this._calculateOrderFlowImbalance(cleanCandles, 10);

    // 6. Compute OU and Drift features for complete telemetry & observability
    const ouFit = this._fitOrnsteinUhlenbeck(cleanCandles);
    const driftFit = this._fitLinearDrift(logReturns);

    const halfLife = ouFit.halfLife;
    const zScore = ouFit.zScore;
    const tStatistic = driftFit.tStatistic;
    let pValue = 1.0;
    let expectedReturn = 0;

    // 7. Alpha Hypothesis Generation conditioned strictly on Regime
    let candidateSignal = 'flat';
    let narrative = 'NEUTRAL_EPISTEMIC_EQUILIBRIUM';
    let vetoReason = null;

    // Check Volatility Shock first: real quants freeze to preserve capital
    if (regime === 'VOLATILITY_SHOCK') {
      vetoReason = 'VOLATILITY_SHOCK_PROTECTION';
      return this._buildOutput({
        signal: 'flat',
        confidence: 0,
        narrative: `VOLATILITY_SHOCK_ACTIVE: Inst Vol (${(instantaneousVol * 100).toFixed(2)}%) exceeds ${this.volShockMultiplier}x median (${(rollingMedianVol * 100).toFixed(2)}%). Capital preserved.`,
        regime,
        hurst,
        varianceRatio,
        zScore,
        tStatistic,
        pValue: 1.0,
        halfLife,
        expectedReturn: 0,
        expectedShortfall,
        var99,
        garmanKlassVol,
        parkinsonVol,
        ewmaVol,
        skewness,
        kurtosis,
        orderFlowImbalance,
        kellyFraction: 0,
        statisticalQuality: 0,
        vetoReason,
        currentClose
      });
    }

    // Check Random Walk regime: Quants DO NOT trade noise
    if (regime === 'RANDOM_WALK_NOISE') {
      return this._buildOutput({
        signal: 'flat',
        confidence: 0,
        narrative: `RANDOM_WALK_NOISE_REJECTED: Hurst exponent ${hurst.toFixed(3)} indicates Brownian motion noise. No statistical edge.`,
        regime,
        hurst,
        varianceRatio,
        zScore,
        tStatistic,
        pValue: 1.0,
        halfLife,
        expectedReturn: 0,
        expectedShortfall,
        var99,
        garmanKlassVol,
        parkinsonVol,
        ewmaVol,
        skewness,
        kurtosis,
        orderFlowImbalance,
        kellyFraction: 0,
        statisticalQuality: 0,
        vetoReason: 'RANDOM_WALK_NOISE_FILTER',
        currentClose
      });
    }

    // REGIME A: Mean-Reverting (H < 0.45) -> Ornstein-Uhlenbeck Statistical Arbitrage
    if (regime === 'MEAN_REVERTING') {
      pValue = this._twoTailedPValue(zScore);

      // Verify Half-Life bounds
      const halfLifeValid = halfLife >= this.minHalfLife && halfLife <= this.maxHalfLife;

      if (!halfLifeValid) {
        candidateSignal = 'flat';
        vetoReason = `HALF_LIFE_OUT_OF_BOUNDS (${halfLife.toFixed(1)} bars)`;
        narrative = `OU_MEAN_REVERSION_ABORTED: Half-life ${halfLife.toFixed(1)} bars outside optimal execution window [${this.minHalfLife}, ${this.maxHalfLife}].`;
      } else if (zScore <= -this.zScoreThreshold && pValue <= this.significanceLevel) {
        // Statistical discount: Price is dislocated downwards
        candidateSignal = 'long';
        expectedReturn = Math.abs(ouFit.currentSpread) * (1 - Math.exp(-ouFit.theta * halfLife));
        narrative = `STAT_ARB_OVERSOLD: Z-Score ${zScore.toFixed(2)} (p=${pValue.toFixed(4)}), Half-life ${halfLife.toFixed(1)} bars. Expected reversion.`;
      } else if (zScore >= this.zScoreThreshold && pValue <= this.significanceLevel) {
        // Statistical premium: Price is dislocated upwards
        candidateSignal = 'short';
        expectedReturn = Math.abs(ouFit.currentSpread) * (1 - Math.exp(-ouFit.theta * halfLife));
        narrative = `STAT_ARB_OVERBOUGHT: Z-Score ${zScore.toFixed(2)} (p=${pValue.toFixed(4)}), Half-life ${halfLife.toFixed(1)} bars. Expected reversion.`;
      } else {
        candidateSignal = 'flat';
        narrative = `MEAN_REVERTING_EQUILIBRIUM: Z-Score ${zScore.toFixed(2)} within neutral boundary (+-${this.zScoreThreshold}).`;
      }
    }

    // REGIME B: Trending / Persistent (H > 0.55) -> Linear Drift Hypothesis Testing on Stationary Returns
    if (regime === 'TRENDING_PERSISTENT') {
      pValue = driftFit.pValue;
      expectedReturn = driftFit.driftPerBar * 10; // 10-bar forward projection

      if (tStatistic >= this.tStatThreshold && pValue <= this.significanceLevel) {
        candidateSignal = 'long';
        narrative = `MOMENTUM_DRIFT_BULLISH: Drift t-stat ${tStatistic.toFixed(2)} (p=${pValue.toFixed(4)}), persistent upward acceleration.`;
      } else if (tStatistic <= -this.tStatThreshold && pValue <= this.significanceLevel) {
        candidateSignal = 'short';
        narrative = `MOMENTUM_DRIFT_BEARISH: Drift t-stat ${tStatistic.toFixed(2)} (p=${pValue.toFixed(4)}), persistent downward breakdown.`;
      } else {
        candidateSignal = 'flat';
        narrative = `TRENDING_WITHOUT_SIGNIFICANCE: Drift t-stat ${tStatistic.toFixed(2)} fails critical threshold (+-${this.tStatThreshold}).`;
      }
    }

    // 8. Microstructure OFI & Asymmetric Tail Risk Vetoes
    if (candidateSignal !== 'flat') {
      // Veto 1: Order Flow Imbalance opposition
      if (candidateSignal === 'long' && orderFlowImbalance < -this.ofiVetoThreshold) {
        candidateSignal = 'flat';
        vetoReason = 'VETO_ORDER_FLOW_AGGRESSIVE_SELLING';
        narrative = `VETO_OFI: Institutional buying hypothesis contradicted by aggressive sell pressure (OFI=${orderFlowImbalance.toFixed(2)}).`;
      } else if (candidateSignal === 'short' && orderFlowImbalance > this.ofiVetoThreshold) {
        candidateSignal = 'flat';
        vetoReason = 'VETO_ORDER_FLOW_AGGRESSIVE_BUYING';
        narrative = `VETO_OFI: Institutional shorting hypothesis contradicted by aggressive buy absorption (OFI=+${orderFlowImbalance.toFixed(2)}).`;
      }

      // Veto 2: Catastrophic Expected Shortfall
      if (expectedShortfall > this.maxExpectedShortfall) {
        candidateSignal = 'flat';
        vetoReason = 'VETO_CATASTROPHIC_EXPECTED_SHORTFALL';
        narrative = `VETO_TAIL_RISK: Expected Shortfall (${(expectedShortfall * 100).toFixed(2)}%) exceeds safety ceiling (${(this.maxExpectedShortfall * 100).toFixed(1)}%).`;
      }

      // Veto 3: Asymmetric Left-Tail Crash Hazard (Fat Negative Skew + Kurtosis)
      if (candidateSignal === 'long' && skewness < this.maxNegativeSkew && kurtosis > this.kurtosisThreshold) {
        candidateSignal = 'flat';
        vetoReason = 'VETO_FAT_LEFT_TAIL_CRASH_HAZARD';
        narrative = `VETO_ASYMMETRY: Long setup rejected due to severe negative skew (${skewness.toFixed(2)}) and fat kurtosis (${kurtosis.toFixed(2)}). Crash hazard.`;
      }

      // Veto 4: Asymmetric Right-Tail Squeeze Hazard (Fat Positive Skew + Kurtosis)
      if (candidateSignal === 'short' && skewness > this.maxPositiveSkew && kurtosis > this.kurtosisThreshold) {
        candidateSignal = 'flat';
        vetoReason = 'VETO_FAT_RIGHT_TAIL_SQUEEZE_HAZARD';
        narrative = `VETO_ASYMMETRY: Short setup rejected due to severe positive skew (+${skewness.toFixed(2)}) and fat kurtosis (${kurtosis.toFixed(2)}). Squeeze hazard.`;
      }
    }

    // 9. Continuous Statistical Confidence Calibration & Fractional Kelly Sizing
    let confidence = 0;
    let kellyFraction = 0;
    let statisticalQuality = 0;

    if (candidateSignal !== 'flat') {
      // Base statistical power: 1 - pValue
      const statisticalPower = Math.max(0, 1.0 - pValue);

      // Regime purity factor: distance from random walk (0.50)
      const regimePurity = Math.min(1.0, Math.abs(hurst - 0.50) / 0.20);

      // OFI alignment multiplier
      let ofiAlignment = 1.0;
      if (candidateSignal === 'long') {
        ofiAlignment = orderFlowImbalance > 0 ? 1.08 : 0.90;
      } else if (candidateSignal === 'short') {
        ofiAlignment = orderFlowImbalance < 0 ? 1.08 : 0.90;
      }

      // Tail risk discount factor
      const tailRiskFactor = Math.max(0.6, 1.0 - Math.min(0.4, expectedShortfall * 8.0));

      // Composite statistical quality (0.0 to 1.0)
      statisticalQuality = Math.min(1.0, statisticalPower * regimePurity * ofiAlignment * tailRiskFactor);

      // Continuous calibrated confidence in [50, 98]%
      confidence = Math.round(50 + statisticalQuality * 48);

      // Horizon-adjusted fractional Kelly allocation:
      const tradeHorizon = regime === 'MEAN_REVERTING' ? Math.max(1, halfLife) : 10;
      const horizonVariance = tradeHorizon * Math.pow(effectiveVol, 2);
      if (horizonVariance > 0 && Math.abs(expectedReturn) > 0) {
        const fullKelly = Math.abs(expectedReturn) / horizonVariance;
        // Quarter-Kelly modulated by statistical quality
        kellyFraction = Math.min(0.25, Math.max(0, 0.25 * fullKelly * statisticalQuality));
      }
    }

    return this._buildOutput({
      signal: candidateSignal,
      confidence,
      narrative,
      regime,
      hurst,
      varianceRatio,
      zScore,
      tStatistic,
      pValue,
      halfLife: halfLife !== null ? halfLife : 0,
      expectedReturn,
      expectedShortfall,
      var99,
      garmanKlassVol,
      parkinsonVol,
      ewmaVol,
      skewness,
      kurtosis,
      orderFlowImbalance,
      kellyFraction,
      statisticalQuality,
      vetoReason,
      currentClose
    });
  }

  /**
   * Constructs standardized output envelope.
   */
  _buildOutput(metrics) {
    const currentClose = metrics.currentClose || 0;
    let targets = null;
    if (currentClose > 0 && metrics.signal !== 'flat') {
      const expRet = Math.abs(metrics.expectedReturn) || 0.01;
      const varLoss = Math.max(0.005, metrics.var99 || 0.01);
      if (metrics.signal === 'long') {
        targets = {
          tp1: Number((currentClose * Math.exp(expRet)).toFixed(4)),
          tp2: Number((currentClose * Math.exp(expRet * 1.5)).toFixed(4)),
          sl: Number((currentClose * Math.exp(-varLoss)).toFixed(4))
        };
      } else if (metrics.signal === 'short') {
        targets = {
          tp1: Number((currentClose * Math.exp(-expRet)).toFixed(4)),
          tp2: Number((currentClose * Math.exp(-expRet * 1.5)).toFixed(4)),
          sl: Number((currentClose * Math.exp(varLoss)).toFixed(4))
        };
      }
    }

    return {
      source: this.source,
      signal: metrics.signal,
      confidence: metrics.confidence,
      narrative: metrics.narrative,
      targets,
      quantMetrics: {
        regime: metrics.regime,
        hurst: Number(metrics.hurst.toFixed(4)),
        varianceRatio: Number(metrics.varianceRatio.toFixed(4)),
        zScore: Number(metrics.zScore.toFixed(3)),
        tStatistic: Number(metrics.tStatistic.toFixed(3)),
        pValue: Number(metrics.pValue.toFixed(5)),
        halfLife: Number(metrics.halfLife.toFixed(2)),
        expectedReturn: Number(metrics.expectedReturn.toFixed(6)),
        expectedShortfall: Number(metrics.expectedShortfall.toFixed(6)),
        var99: Number(metrics.var99.toFixed(6)),
        garmanKlassVol: Number(metrics.garmanKlassVol.toFixed(6)),
        parkinsonVol: Number(metrics.parkinsonVol.toFixed(6)),
        ewmaVol: Number(metrics.ewmaVol.toFixed(6)),
        skewness: Number(metrics.skewness.toFixed(3)),
        kurtosis: Number(metrics.kurtosis.toFixed(3)),
        orderFlowImbalance: Number(metrics.orderFlowImbalance.toFixed(3)),
        kellyFraction: Number(metrics.kellyFraction.toFixed(4)),
        statisticalQuality: Number(metrics.statisticalQuality.toFixed(3))
      },
      vetoReason: metrics.vetoReason
    };
  }

  /**
   * Safe empty result for error/warmup states.
   */
  _emptyResult(reason, details = {}) {
    return {
      source: this.source,
      signal: 'flat',
      confidence: 0,
      narrative: reason,
      targets: null,
      quantMetrics: {
        regime: 'INSUFFICIENT_DATA',
        hurst: 0.5,
        varianceRatio: 1.0,
        zScore: 0,
        tStatistic: 0,
        pValue: 1.0,
        halfLife: 0,
        expectedReturn: 0,
        expectedShortfall: 0,
        var99: 0,
        garmanKlassVol: 0,
        parkinsonVol: 0,
        ewmaVol: 0,
        skewness: 0,
        kurtosis: 0,
        orderFlowImbalance: 0,
        kellyFraction: 0,
        statisticalQuality: 0,
        ...details
      },
      vetoReason: reason
    };
  }

  // =========================================================================
  // QUANTITATIVE MATHEMATICS & ESTIMATION METHODS
  // =========================================================================

  /**
   * Sanitizes candles, filtering out corrupt or zero entries.
   */
  _sanitizeCandles(candles) {
    const clean = [];
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (!c) continue;
      const o = Number(c.open);
      const h = Number(c.high);
      const l = Number(c.low);
      const cl = Number(c.close);
      const v = Number(c.volume || 0);

      if (Number.isFinite(o) && Number.isFinite(h) && Number.isFinite(l) && Number.isFinite(cl) && o > 0 && cl > 0 && h >= l) {
        clean.push({
          open: o,
          high: Math.max(h, Math.max(o, cl)),
          low: Math.min(l, Math.min(o, cl)),
          close: cl,
          volume: Math.max(0, v)
        });
      }
    }
    return clean;
  }

  /**
   * Continuous log-returns: r_t = ln(C_t / C_{t-1}).
   */
  _calculateLogReturns(candles) {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const currClose = candles[i].close;
      if (prevClose > 0 && currClose > 0) {
        returns.push(Math.log(currClose / prevClose));
      }
    }
    return returns;
  }

  /**
   * Garman-Klass Volatility:
   * sigma^2 = 1/N * sum( 0.5 * ln(H/L)^2 - (2*ln(2) - 1) * ln(C/O)^2 )
   */
  _calculateGarmanKlassVol(candles) {
    if (candles.length === 0) return 0;
    const factor = 2 * Math.log(2) - 1; // ~0.38629436
    let sumVar = 0;
    let validCount = 0;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.high > 0 && c.low > 0 && c.open > 0 && c.close > 0 && c.high >= c.low) {
        const logHL = Math.log(c.high / c.low);
        const logCO = Math.log(c.close / c.open);
        const barVar = 0.5 * logHL * logHL - factor * logCO * logCO;
        sumVar += Math.max(0, barVar);
        validCount++;
      }
    }

    if (validCount === 0) return 0;
    return Math.sqrt(sumVar / validCount);
  }

  /**
   * Parkinson Volatility:
   * sigma^2 = 1/(4*ln(2)*N) * sum( ln(H/L)^2 )
   */
  _calculateParkinsonVol(candles) {
    if (candles.length === 0) return 0;
    const denom = 4 * Math.log(2);
    let sumSq = 0;
    let validCount = 0;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.high > 0 && c.low > 0 && c.high >= c.low) {
        const logHL = Math.log(c.high / c.low);
        sumSq += logHL * logHL;
        validCount++;
      }
    }

    if (validCount === 0) return 0;
    return Math.sqrt(sumSq / (denom * validCount));
  }

  /**
   * RiskMetrics EWMA Volatility Forecast:
   * sigma_t^2 = lambda * sigma_{t-1}^2 + (1 - lambda) * r_t^2
   */
  _calculateEWMAVol(returns, lambda = 0.94) {
    if (returns.length === 0) return 0;
    let variance = returns[0] * returns[0];
    for (let i = 1; i < returns.length; i++) {
      const r = returns[i];
      variance = lambda * variance + (1 - lambda) * r * r;
    }
    return Math.sqrt(variance);
  }

  /**
   * Rolling median volatility for volatility shock detection.
   */
  _calculateRollingMedianVol(candles, window = 20) {
    if (candles.length < window) return 0;
    const vols = [];
    for (let i = window; i <= candles.length; i += 5) {
      const slice = candles.slice(i - window, i);
      const v = this._calculateGarmanKlassVol(slice);
      if (v > 0) vols.push(v);
    }
    if (vols.length === 0) return 0;
    vols.sort((a, b) => a - b);
    return vols[Math.floor(vols.length / 2)];
  }

  /**
   * Multi-scale Lo & MacKinlay Variance Ratio Test & Hurst Exponent (H):
   * Uses unbiased overlapping returns degrees-of-freedom factor m = k(n - k + 1)(1 - k/n)
   * VR(k) = Var(r^(k)) / (k * Var(r^(1)))
   * H = 0.5 + ln(VR(k)) / (2 * ln(k))
   */
  _calculateVarianceRatioAndHurst(returns, primaryK = 4) {
    const scales = [2, 4];
    let hSum = 0;
    let vrSum = 0;
    let validScales = 0;

    const n = returns.length;
    let sum1 = 0;
    for (let i = 0; i < n; i++) sum1 += returns[i];
    const mean1 = sum1 / n;

    let var1Sum = 0;
    for (let i = 0; i < n; i++) {
      const d = returns[i] - mean1;
      var1Sum += d * d;
    }
    const var1 = var1Sum / (n - 1);
    if (var1 <= 1e-14) {
      return { hurst: 0.5, varianceRatio: 1.0 };
    }

    for (const k of scales) {
      if (n < k * 4) continue;

      // Lo & MacKinlay unbiased overlapping returns variance
      const m = k * (n - k + 1) * (1 - k / n);
      if (m <= 0) continue;

      let varKSum = 0;
      for (let i = k - 1; i < n; i++) {
        let rK = 0;
        for (let j = 0; j < k; j++) {
          rK += returns[i - j];
        }
        const d = rK - k * mean1;
        varKSum += d * d;
      }
      const varK = varKSum / m;
      const vr = varK / var1;

      // Hurst exponent: VR(k) = k^(2H - 1) => H = 0.5 + ln(VR) / (2 * ln(k))
      const rawHurst = 0.5 + Math.log(Math.max(1e-4, vr)) / (2 * Math.log(k));
      hSum += Math.max(0.05, Math.min(0.95, rawHurst));
      vrSum += vr;
      validScales++;
    }

    if (validScales === 0) {
      return { hurst: 0.5, varianceRatio: 1.0 };
    }

    return {
      hurst: hSum / validScales,
      varianceRatio: vrSum / validScales
    };
  }

  /**
   * Fits discrete Ornstein-Uhlenbeck (OU) Mean Reversion:
   * x_t = ln(P_t) - ln(SMA_t)
   * dx_t = x_t - x_{t-1} = a + b * x_{t-1} + e_t
   * theta = -ln(1 + b), halfLife = ln(2) / theta
   * zScore = (x_T - mean(x)) / std(x)
   */
  _fitOrnsteinUhlenbeck(candles) {
    const period = Math.min(20, Math.floor(candles.length / 2));
    const closes = candles.map(c => c.close);
    const n = closes.length;

    // Calculate spread x_t = ln(C_t) - ln(SMA_t)
    const x = [];
    for (let i = period - 1; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += closes[i - j];
      const sma = sum / period;
      x.push(Math.log(closes[i]) - Math.log(sma));
    }

    if (x.length < 10) {
      return { theta: 0.1, halfLife: 7, zScore: 0, currentSpread: 0 };
    }

    // Regress dx_t on x_{t-1}: dx_t = a + b * x_{t-1} + e_t
    const m = x.length;
    let sumXPrev = 0;
    let sumDX = 0;
    for (let t = 1; t < m; t++) {
      sumXPrev += x[t - 1];
      sumDX += (x[t] - x[t - 1]);
    }
    const meanXPrev = sumXPrev / (m - 1);
    const meanDX = sumDX / (m - 1);

    let num = 0;
    let den = 0;
    for (let t = 1; t < m; t++) {
      const xDev = x[t - 1] - meanXPrev;
      const dxDev = (x[t] - x[t - 1]) - meanDX;
      num += xDev * dxDev;
      den += xDev * xDev;
    }

    const b = den > 1e-12 ? num / den : 0;
    const a = meanDX - b * meanXPrev;

    // Mean reversion speed theta: if b < 0, process is mean-reverting
    let theta = 0.05;
    let halfLife = 999;
    if (b < 0) {
      theta = -Math.log(Math.max(1e-4, 1 + b));
      halfLife = theta > 1e-5 ? Math.log(2) / theta : 999;
    } else {
      theta = 0.001; // Divergent/non-mean-reverting
      halfLife = 999;
    }

    // Theoretical equilibrium level
    const equilibriumLevel = (b < 0 && Math.abs(b) > 1e-6) ? -a / b : 0;

    // Standardized Z-Score of the current spread
    let sumX = 0;
    for (let i = 0; i < m; i++) sumX += x[i];
    const meanX = sumX / m;

    let sumXDevSq = 0;
    for (let i = 0; i < m; i++) {
      const d = x[i] - meanX;
      sumXDevSq += d * d;
    }
    const stdX = Math.sqrt(sumXDevSq / (m - 1));
    const currentSpread = x[m - 1];
    const zScore = stdX > 1e-8 ? (currentSpread - meanX) / stdX : 0;

    return { theta, halfLife, zScore, currentSpread, equilibriumLevel };
  }

  /**
   * Linear Drift Hypothesis Testing on Stationary Log Returns:
   * H_0: mu = 0 vs H_1: mu != 0
   * Calculates mean return mu, Newey-West HAC standard error SE_HAC(mu),
   * and Student's t-statistic t = mu / SE_HAC(mu).
   * Strictly avoids spurious regression on integrated log-price levels.
   */
  _fitLinearDrift(logReturns) {
    const n = logReturns.length;
    if (n < 4) {
      return { driftPerBar: 0, tStatistic: 0, pValue: 1.0 };
    }

    let sum = 0;
    for (let i = 0; i < n; i++) sum += logReturns[i];
    const meanReturn = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) {
      const d = logReturns[i] - meanReturn;
      varSum += d * d;
    }

    // Autocovariance & Newey-West HAC adjustment for lag L=2
    const L = 2;
    const gamma0 = varSum / n;
    let gammaSum = 0;
    for (let l = 1; l <= L; l++) {
      let cov = 0;
      for (let t = l; t < n; t++) {
        cov += (logReturns[t] - meanReturn) * (logReturns[t - l] - meanReturn);
      }
      cov /= n;
      const weight = 1 - l / (L + 1); // Bartlett kernel
      gammaSum += weight * cov;
    }

    const omega = Math.max(1e-12, gamma0 + 2 * gammaSum);
    const seMu = Math.sqrt(omega / n);

    const tStatistic = seMu > 1e-12 ? meanReturn / seMu : 0;
    const pValue = this._twoTailedPValue(tStatistic);

    return { driftPerBar: meanReturn, tStatistic, pValue };
  }

  /**
   * Higher Moments: Mean, StdDev, Skewness, Excess Kurtosis.
   */
  _calculateHigherMoments(returns) {
    const n = returns.length;
    if (n < 4) {
      return { skewness: 0, kurtosis: 0, meanReturn: 0, stdReturn: 0.01 };
    }

    let sum = 0;
    for (let i = 0; i < n; i++) sum += returns[i];
    const meanReturn = sum / n;

    let m2 = 0;
    let m3 = 0;
    let m4 = 0;

    for (let i = 0; i < n; i++) {
      const diff = returns[i] - meanReturn;
      const d2 = diff * diff;
      m2 += d2;
      m3 += d2 * diff;
      m4 += d2 * d2;
    }

    m2 /= n;
    m3 /= n;
    m4 /= n;

    const stdReturn = Math.sqrt(m2);
    const s3 = stdReturn * stdReturn * stdReturn;
    const s4 = s3 * stdReturn;

    const skewness = s3 > 1e-14 ? m3 / s3 : 0;
    const kurtosis = s4 > 1e-14 ? (m4 / s4) - 3.0 : 0; // Excess kurtosis

    return { skewness, kurtosis, meanReturn, stdReturn };
  }

  /**
   * Cornish-Fisher Expansion for 99% VaR and Expected Shortfall on Loss Distribution:
   * Let S_loss = -skew (loss skewness is negative of return skewness).
   * w = z + (S_loss/6)*(z^2 - 1) + (K/24)*(z^3 - 3z) - (S_loss^2/36)*(2z^3 - 5z)
   * Value at Risk: VaR_99 = max(0, -mean + w * std)
   */
  _calculateCornishFisherVaR_ES(mean, std, skew, kurt, confidenceLevel = 0.99) {
    const z = 2.3263479; // 99% normal quantile

    // S_loss = -skew (loss skewness is the negative of return skewness)
    const sLoss = -skew;
    const zSq = z * z;
    const w = z +
      (sLoss / 6.0) * (zSq - 1.0) +
      (kurt / 24.0) * (zSq * z - 3.0 * z) -
      ((sLoss * sLoss) / 36.0) * (2.0 * zSq * z - 5.0 * z);

    // Safeguard Cornish-Fisher polynomial domain of validity
    const wSafe = Math.max(0.5, Math.min(10.0, w));

    // Value at Risk (Loss threshold as positive percentage)
    const var99 = Math.max(0, -mean + wSafe * std);

    // Expected Shortfall (CVaR) approximation for fat-tailed processes
    const expectedShortfall = var99 * 1.25;

    return { var99, expectedShortfall };
  }

  /**
   * Order Flow Imbalance (OFI) Proxy:
   * Uses tick rule / candle range aggression:
   * Aggression = (2*C - H - L) / (H - L)
   * SignedVolume = Volume * Aggression
   * OFI = Sum(SignedVolume) / Sum(Volume) in [-1, +1]
   */
  _calculateOrderFlowImbalance(candles, period = 10) {
    const slice = candles.slice(-Math.min(candles.length, period));
    let totalVol = 0;
    let directionalVol = 0;

    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      const range = c.high - c.low;
      const vol = c.volume || 0;
      totalVol += vol;

      if (range > 1e-10) {
        const aggression = (2 * c.close - c.high - c.low) / range;
        directionalVol += vol * aggression;
      }
    }

    if (totalVol <= 1e-8) return 0;
    const rawOfi = directionalVol / totalVol;
    return Math.max(-1.0, Math.min(1.0, rawOfi));
  }

  /**
   * Error Function erf(x) via Abramowitz & Stegun 7.1.26 (max error 1.5e-7).
   */
  _erf(x) {
    const sign = x >= 0 ? 1 : -1;
    const absX = Math.abs(x);

    const p = 0.3275911;
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;

    const t = 1.0 / (1.0 + p * absX);
    const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
    const y = 1.0 - poly * Math.exp(-absX * absX);

    return sign * y;
  }

  /**
   * Standard Normal Cumulative Distribution Function: Phi(z)
   */
  _normalCdf(z) {
    return 0.5 * (1.0 + this._erf(z / Math.SQRT2));
  }

  /**
   * Two-tailed p-value from z/t statistic:
   * p = 2 * (1 - Phi(|stat|))
   */
  _twoTailedPValue(stat) {
    const absStat = Math.abs(stat);
    const p = 2.0 * (1.0 - this._normalCdf(absStat));
    return Math.max(0.0, Math.min(1.0, p));
  }
}
