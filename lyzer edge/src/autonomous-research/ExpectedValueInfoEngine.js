/**
 * @fileoverview ExpectedValueInfoEngine (EVI Engine) — Phase 15 (ADR-032)
 *
 * Calculates the Expected Value of Information (EVI) for proposed research experiments.
 * Evaluates estimated alpha improvement vs estimated compute cost (CPU/Time units).
 *
 * Formula:
 *   EVI = (Potential Alpha Gain * Uncertainty Reduction) / Estimated Compute Cost Units
 */
export class ExpectedValueInfoEngine {
  /**
   * Calculates Expected Value of Information (EVI) for an experiment proposal.
   *
   * @param {Object} experimentProposal
   * @param {number} [experimentProposal.potential_alpha_gain] - Potential Sharpe / return gain (e.g. 0.50)
   * @param {number} [experimentProposal.uncertainty_level] - Uncertainty (0.0 to 1.0)
   * @param {number} [experimentProposal.estimated_compute_cost_units] - CPU / Time cost units (e.g. 10.0)
   * @returns {Object} EVI Evaluation Report
   */
  evaluateEVI(experimentProposal = {}) {
    const potentialGain = experimentProposal.potential_alpha_gain || 0.40;
    const uncertainty = experimentProposal.uncertainty_level || 0.80;
    const computeCost = experimentProposal.estimated_compute_cost_units || 10.0;

    const rawEvi = (potentialGain * uncertainty * 100) / Math.max(1, computeCost);
    const evi = Number(rawEvi.toFixed(2));

    let priority = 'MEDIUM';
    if (evi > 5.0) priority = 'HIGH_EVI_PRIORITY';
    else if (evi < 1.5) priority = 'LOW_EVI_DEFERRED';

    return {
      proposal_id: experimentProposal.id || `prop_${Date.now()}`,
      evi_score: evi,
      priority,
      is_worth_executing: evi >= 1.5,
      metrics: {
        potential_alpha_gain: potentialGain,
        uncertainty_level: uncertainty,
        compute_cost_units: computeCost
      },
      evaluated_at: Date.now()
    };
  }
}
