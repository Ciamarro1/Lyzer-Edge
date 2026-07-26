/**
 * Lyzer Edge — HypothesisGenerator
 * Generates competing probabilistic market hypotheses based on fused posterior evidence.
 * Examples: H_STRUCTURAL_EXPANSION, H_MEAN_REVERSION, H_VOLATILITY_EXPANSION, H_CONSOLIDATION_ACCUMULATION.
 */

export class HypothesisGenerator {
  generateHypotheses(fusedEvidence) {
    const { posteriorScore, fusedProbability, minUncertainty, primaryRegime } = fusedEvidence;
    const hypotheses = [];

    // Hypothesis 1: Structural Expansion
    let probExpansion = fusedProbability;
    if (primaryRegime === 'EXPANSION' || primaryRegime === 'TRENDING_BULL') {
      probExpansion = Math.min(1.0, probExpansion * 1.2);
    }
    hypotheses.push({
      id: 'H_STRUCTURAL_EXPANSION',
      name: 'Structural Momentum Expansion',
      probability: Math.round(probExpansion * 100) / 100,
      posteriorScore: Math.round(posteriorScore * probExpansion * 100) / 100,
      confidence: fusedEvidence.fusedConfidence,
      uncertainty: minUncertainty,
      assumptions: ['High SMC Order Block confluence', 'Volume momentum intact']
    });

    // Hypothesis 2: Mean Reversion
    let probReversion = 1.0 - fusedProbability;
    if (primaryRegime === 'RANGING' || primaryRegime === 'CONSOLIDATION') {
      probReversion = Math.min(1.0, probReversion * 1.3);
    }
    hypotheses.push({
      id: 'H_MEAN_REVERSION',
      name: 'Equilibrium Mean Reversion',
      probability: Math.round(probReversion * 100) / 100,
      posteriorScore: Math.round(posteriorScore * probReversion * 100) / 100,
      confidence: fusedEvidence.fusedConfidence,
      uncertainty: minUncertainty,
      assumptions: ['Price at Dealing Range boundary', 'Unmitigated Fair Value Gap fill target']
    });

    // Hypothesis 3: Volatility Expansion Spike
    let probVol = primaryRegime === 'HIGH_VOLATILITY' ? 0.75 : 0.25;
    hypotheses.push({
      id: 'H_VOLATILITY_EXPANSION',
      name: 'High Volatility Breakout',
      probability: Math.round(probVol * 100) / 100,
      posteriorScore: Math.round(posteriorScore * probVol * 100) / 100,
      confidence: fusedEvidence.fusedConfidence,
      uncertainty: minUncertainty,
      assumptions: ['ATR compression release', 'Liquidity Sweep trigger']
    });

    return Object.freeze(hypotheses);
  }
}
