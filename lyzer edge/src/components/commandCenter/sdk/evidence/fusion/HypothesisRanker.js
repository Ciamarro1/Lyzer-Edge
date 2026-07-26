/**
 * Lyzer Edge — HypothesisRanker
 * Evaluates and ranks competing market hypotheses based on posterior score, confidence, and entropy.
 */

export class HypothesisRanker {
  rankHypotheses(hypotheses) {
    if (!hypotheses || hypotheses.length === 0) return [];

    const sorted = [...hypotheses].sort((a, b) => b.posteriorScore - a.posteriorScore);

    let entropySum = 0;
    for (const h of sorted) {
      if (h.probability > 0) {
        entropySum -= h.probability * Math.log2(h.probability);
      }
    }

    const topHypothesis = sorted[0];

    return Object.freeze({
      topHypothesis,
      rankedList: sorted,
      entropy: Math.round(entropySum * 100) / 100,
      timestamp: Date.now(),
      status: sorted.length > 0 && topHypothesis.posteriorScore > 0.40 ? 'VALIDATED' : 'INSUFFICIENT_CONVICTION'
    });
  }
}
