// evidenceToConfidence.js
/**
 * Convert an EvidencePayload into a confidence object.
 *
 * The conversion is a weighted sum of positive factors (edge survival,
 * hit rate, persistence) and negative factors (performance and structural decay).
 * All input values are expected to be in the range 0‑1 (or null which is
 * treated as 0). The resulting confidence is clamped to the range [0, 1].
 *
 * @param {import('../microstructure/contracts').EvidencePayload} payload
 * @returns {{ confidence: number, confidence_components: { hit_rate: number, persistence: number, survival: number, decay_penalty: number } }}
 */
export function evidenceToConfidence(payload) {
  const evidence = payload?.evidence ?? {};
 
  const edgeSurvival = evidence.edge_survival_score ?? 0;
  const hitRate = evidence.hit_rate ?? 0;
  const persistence = evidence.persistence_score ?? 0;
  const perfDecay = evidence.performance_decay ?? 0;
  const structDecay = evidence.structural_decay ?? 0;
 
  // Positive contribution weights
  const EDGE_WEIGHT = 0.4;
  const HIT_WEIGHT = 0.2;
  const PERSIST_WEIGHT = 0.2;
 
  // Negative contribution weight (shared for both decay metrics)
  const DECAY_WEIGHT = 0.15;
 
  const positive =
    edgeSurvival * EDGE_WEIGHT +
    hitRate * HIT_WEIGHT +
    persistence * PERSIST_WEIGHT;
 
  const negative = (perfDecay + structDecay) * DECAY_WEIGHT;
 
  const rawConfidence = positive - negative;
  const confidence = Math.min(1, Math.max(0, rawConfidence));
 
  const decayPenalty = (perfDecay + structDecay) * DECAY_WEIGHT;
 
  return {
    confidence,
    confidence_components: {
      hit_rate: hitRate,
      persistence,
      survival: edgeSurvival,
      decay_penalty: decayPenalty,
    },
  };
}
 