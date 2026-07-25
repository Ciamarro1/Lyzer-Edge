// src/microstructure/microstructure.js
/**
 * Microstructure orchestrator – pure function pipeline.
 * It records the incoming observation, builds the current window,
 * computes the evidence payload (MEE) and decay metrics (MDD),
 * then merges the decay information into the payload.
 *
 * The merge is performed **outside** of MEE to keep MEE and MDD
 * decoupled, as requested.
 */
import { evidenceHistory } from './evidenceHistory.js';
import { calcEvidence } from './mee.js';
import { detectDecay } from './mdd.js';
 
/**
 * Run the microstructure pipeline for a single observation.
 * @param {object} observation - Observation object adhering to the contracts.
 * @returns {object} EvidencePayload enriched with decay fields.
 */
export function runMicrostructure(observation) {
  // 1. Record the observation
  evidenceHistory.addRecord(observation);

  // 2. Retrieve the current window (rolling buffer)
  const window = evidenceHistory.getWindow();

  // 3. Compute the base evidence payload (MEE)
  const payload = calcEvidence(window, { horizon_fast: 5 }); // context placeholder

  // 4. Compute decay metrics (MDD)
  const decay = detectDecay(window);

  // 5. Merge decay information into the payload – **outside** MEE
  return {
    ...payload,
    evidence: {
      ...payload.evidence,
      performance_decay: decay.performance_decay,
      structural_decay: decay.structural_decay,
    },
  };
}
 