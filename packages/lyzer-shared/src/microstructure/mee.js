// mee.js
/**
 * Microstructure Evidence Engine (MEE)
 * Pure functions that compute an EvidencePayload from a window of observations.
 * No exceptions are thrown – an empty window yields a zeroed payload.
 */
import { EvidencePayload } from "./contracts.ts"; // TypeScript types for IDE only, ignored at runtime
 
/** Helper to create a zeroed EvidencePayload */
function zeroPayload(context = {}) {
  return {
    score: 0,
    evidence: {
      hit_rate: 0,
      expectancy: 0,
      sample_size: 0,
      regime_stability: 0,
      causal_contribution: 0,
      persistence_score: 0,
      edge_survival_score: 0,
      degradation_rate: 0,
      performance_decay: 0,
      structural_decay: 0,
    },
    evidence_source: "internal",
    metadata: context,
  };
}
 
/**
 * Calculate evidence from a window of observations.
 * @param {Array} observationsWindow - array of Observation objects (may be empty).
 * @param {object} context - any extra metadata (e.g., horizons) to embed in the payload.
 * @returns {object} EvidencePayload adhering to contracts.ts.
 */
export function calcEvidence(observationsWindow, context = {}) {
  if (!Array.isArray(observationsWindow) || observationsWindow.length === 0) {
    return zeroPayload(context);
  }
 
  const sampleSize = observationsWindow.length;
  // Placeholder calculations – all metrics are set to 0 for now.
  // Real formulas will be added in later sprints.
  return {
    score: 0,
    evidence: {
      hit_rate: 0,
      expectancy: 0,
      sample_size: sampleSize,
      regime_stability: 0,
      causal_contribution: 0,
      persistence_score: 0,
      edge_survival_score: 0,
      degradation_rate: 0,
      performance_decay: 0,
      structural_decay: 0,
    },
    evidence_source: "internal",
    metadata: context,
  };
}
 
/**
 * Update an existing evidence payload with a new observation.
 * This stub simply returns the previous evidence unchanged – real smoothing will be added later.
 * @param {object} previousEvidence - EvidencePayload from a prior call.
 * @param {object} observation - single Observation object.
 * @param {number} decayFactor - placeholder for future half‑life smoothing.
 * @returns {object} Updated EvidencePayload (currently unchanged).
 */
export function updateEvidence(previousEvidence, observation, decayFactor = 0.5) {
  // No-op for now – keep contract stable.
  return previousEvidence;
}
 