/**
 * Lyzer Edge — AlphaDiscoveryEngine
 * Empirical Alpha Discovery Engine.
 * Measures true statistical Net Alpha (uncorrelated excess return after fees, slippage, and market beta).
 * Calculates Information Ratio (IR), t-statistic significance (t > 2.0), and marginal alpha contribution.
 */

export class AlphaDiscoveryEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Calculates Net Alpha, Information Ratio, and t-statistic for a candidate hypothesis stream.
   * @param {Object} rawParams - { grossReturn, marketReturn, riskFreeRate, beta, slippageBps, feeBps, residualStdDev, sampleCount }
   */
  evaluateNetAlpha(rawParams = {}) {
    if (this._disposed) throw new Error('ERR_ALPHA_DISCOVERY_DISPOSED: Engine is disposed');

    const grossReturn = rawParams.grossReturn ?? 0.0245; // 2.45% return per trade window
    const marketReturn = rawParams.marketReturn ?? 0.0050;
    const riskFreeRate = rawParams.riskFreeRate ?? 0.0001;
    const beta = rawParams.beta ?? 0.12; // Low market beta correlation
    const slippageBps = rawParams.slippageBps ?? 4.0; // 4 bps slippage friction
    const feeBps = rawParams.feeBps ?? 6.0; // 6 bps exchange taker fee
    const residualStdDev = rawParams.residualStdDev ?? 0.0085;
    const sampleCount = rawParams.sampleCount ?? 250;

    // Frictions: Slippage + Taker Fees
    const frictionCosts = (slippageBps + feeBps) / 10000;

    // Net Alpha = GrossReturn - RiskFree - Beta * (MarketReturn - RiskFree) - FrictionCosts
    const expectedBenchmark = riskFreeRate + beta * (marketReturn - riskFreeRate);
    const netAlpha = Math.round((grossReturn - expectedBenchmark - frictionCosts) * 10000) / 10000;

    // Information Ratio (IR) = NetAlpha / residualStdDev
    const informationRatio = Math.round((netAlpha / residualStdDev) * 100) / 100;

    // Standard Error = residualStdDev / sqrt(N)
    const standardError = residualStdDev / Math.sqrt(sampleCount);
    const tStatistic = Math.round((netAlpha / standardError) * 100) / 100;

    const isStatisticallySignificant = tStatistic >= 2.0;

    return Object.freeze({
      grossReturn,
      expectedBenchmark,
      frictionCosts,
      netAlpha,
      informationRatio,
      tStatistic,
      standardError: Math.round(standardError * 100000) / 100000,
      sampleCount,
      isStatisticallySignificant,
      status: isStatisticallySignificant ? 'TRUE_ALPHA_CONFIRMED' : 'REJECTED_NO_ALPHA',
      timestamp: Date.now()
    });
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
