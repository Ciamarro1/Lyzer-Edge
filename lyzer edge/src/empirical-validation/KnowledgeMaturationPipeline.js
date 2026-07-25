/**
 * @fileoverview KnowledgeMaturationPipeline — Phase 9 (ADR-026)
 *
 * Manages the maturity progression of knowledge patterns in semantic memory.
 * Nivel de Maturidade:
 *   1. OBSERVATION
 *   2. HYPOTHESIS
 *   3. VALIDATED
 *   4. ESTABLISHED
 *   5. CONSTITUTIONAL
 */
export class KnowledgeMaturationPipeline {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.stages = ['OBSERVATION', 'HYPOTHESIS', 'VALIDATED', 'ESTABLISHED', 'CONSTITUTIONAL'];
  }

  /**
   * Promotes or updates the maturity stage of a pattern based on CES and verification count.
   *
   * @param {Object} options
   * @param {string} options.patternId - Unique pattern identifier
   * @param {number} options.cesScore - Causal Evidence Score (CES)
   * @param {number} [options.verificationCount] - Number of successful empirical verifications
   * @param {string} [options.currentStage] - Current maturity stage
   * @returns {Object} Maturation status report
   */
  advanceMaturity({ patternId, cesScore, verificationCount = 1, currentStage = 'OBSERVATION' }) {
    if (!patternId) throw new Error('patternId is required for knowledge maturation');

    let nextStage = currentStage;
    let reason = 'NO_CHANGE';

    if (cesScore >= 90.0 && verificationCount >= 100) {
      nextStage = 'CONSTITUTIONAL';
      reason = 'HIGH_CES_AND_EXTENSIVE_VERIFICATION';
    } else if (cesScore >= 85.0 && verificationCount >= 50) {
      nextStage = 'ESTABLISHED';
      reason = 'HIGH_CES_AND_PROVEN_STABILITY';
    } else if (cesScore >= 70.0 && verificationCount >= 10) {
      nextStage = 'VALIDATED';
      reason = 'PROMISING_CES_AND_EMPIRICAL_VALIDATION';
    } else if (cesScore >= 50.0) {
      nextStage = 'HYPOTHESIS';
      reason = 'MINIMUM_HYPOTHESIS_THRESHOLD';
    } else {
      nextStage = 'OBSERVATION';
      reason = 'LOW_CES';
    }

    const currentIndex = this.stages.indexOf(currentStage);
    const nextIndex = this.stages.indexOf(nextStage);
    const isPromoted = nextIndex > currentIndex;
    const isDemoted = nextIndex < currentIndex;

    return {
      pattern_id: patternId,
      previous_stage: currentStage,
      current_stage: nextStage,
      is_promoted: isPromoted,
      is_demoted: isDemoted,
      ces_score: cesScore,
      verification_count: verificationCount,
      reason,
      updated_at: Date.now()
    };
  }
}
