const crypto = require('crypto');

/**
 * Counterfactual Evaluation Layer (CEL) Candidate Registry
 * 
 * Entry point for structural refactoring hypotheses.
 * Stages incoming code/behavior mutations for parallel simulation.
 */
class CelCandidateRegistry {
  constructor() {
    this.candidates = new Map();
  }

  /**
   * Accept an incoming code/behavior mutation. Stage it for parallel simulation.
   * 
   * @param {Object} mutation The proposed structural refactoring hypothesis.
   * @param {string} mutation.type The type of refactoring (e.g., 'AST_TRANSFORM', 'INTERFACE_CHANGE').
   * @param {any} mutation.content The payload/code changes.
   * @returns {Object} Output documenting the registration and queuing of the hypothesis.
   */
  registerMutation(mutation) {
    // 1. Validation (Security & Integrity)
    if (!mutation || !mutation.type || !mutation.content) {
      throw new Error("Invalid mutation payload. Must include 'type' and 'content'.");
    }

    // 2. Identification
    const candidateId = `cel-cand-${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // 3. Staging
    const candidate = {
      id: candidateId,
      status: 'QUEUED_FOR_SIMULATION',
      queuedAt: timestamp,
      mutation: mutation
    };

    this.candidates.set(candidateId, candidate);

    // 4. Documentation Output
    return this._documentQueuing(candidate);
  }

  /**
   * Internal method to standardize the documentation output of the registration.
   */
  _documentQueuing(candidate) {
    return {
      message: "Structural refactoring hypothesis registered successfully.",
      candidateId: candidate.id,
      status: candidate.status,
      timestamp: candidate.queuedAt,
      queueDepth: this.candidates.size,
      mutationType: candidate.mutation.type
    };
  }

  /**
   * Pull staged candidates for parallel simulation engines.
   * @param {number} batchSize How many candidates to pull.
   */
  fetchNextForSimulation(batchSize = 5) {
    const batch = [];
    for (const [id, candidate] of this.candidates) {
      if (candidate.status === 'QUEUED_FOR_SIMULATION') {
        candidate.status = 'SIMULATING';
        batch.push(candidate);
        if (batch.length >= batchSize) break;
      }
    }
    return batch;
  }
}

module.exports = new CelCandidateRegistry();
