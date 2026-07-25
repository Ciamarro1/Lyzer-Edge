/**
 * ARL v3.2 Regime Permutation Lab
 * Permutes strategy parameters against all possible regimes to audit sensitivity.
 */

export class RegimePermutationLab {
  permute(strategyMetrics) {
    const regimes = ['trend_up','trend_down','low_vol','chop'];
    const permuted = regimes.map(r => ({ ...strategyMetrics, regime: r }));
    return permuted;
  }
}
