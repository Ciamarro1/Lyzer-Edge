export class ConfidenceDecayEngine {
  constructor(halfLifeDays = 30) {
    this.halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  }

  applyDecay(pattern, currentTimestampMs = Date.now()) {
    const lastUpdated = pattern.updated_at || currentTimestampMs;
    const elapsedMs = currentTimestampMs - lastUpdated;

    if (elapsedMs <= 0) {
      return pattern.confidence_score;
    }

    // Exponential Decay: C(t) = C0 * Math.exp(-lambda * t)
    const lambda = Math.LN2 / this.halfLifeMs;
    const decayedScore = pattern.confidence_score * Math.exp(-lambda * elapsedMs);

    return Number(decayedScore.toFixed(4));
  }
}
