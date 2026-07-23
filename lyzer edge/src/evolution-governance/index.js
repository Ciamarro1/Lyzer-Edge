import { EvolutionReplayEngine } from './EvolutionReplayEngine.js';
import { EvolutionHealthScore } from './EvolutionHealthScore.js';
import { EvolutionObservatory } from './EvolutionObservatory.js';

export class EvolutionGovernanceFacade {
  constructor(causalMemoryDB, evolutionFacade) {
    this.db = causalMemoryDB;
    this.evolutionFacade = evolutionFacade;
    this.replayEngine = new EvolutionReplayEngine(causalMemoryDB);
    this.healthScorer = new EvolutionHealthScore();
    this.observatory = new EvolutionObservatory(causalMemoryDB, evolutionFacade);
  }

  async replay(options) {
    return await this.replayEngine.replay(options);
  }

  calculateHealth(metrics) {
    return this.healthScorer.calculate(metrics);
  }

  async generateObservatoryReport(options) {
    return await this.observatory.generateStatusReport(options);
  }

  /**
   * Executes a full ECS-1000 Certification Test on a set of ledger entries / simulated proposals.
   *
   * Verifies:
   *   1. 100% Replay Fidelity
   *   2. State Hash & Memory Non-Corruption
   *   3. EHS remains above CRITICAL_EVOLUTION_HALT threshold (>= 75%)
   *
   * @param {Object} options
   * @param {Array}  options.entries - Simulated or real ledger entries
   * @param {Object} [options.healthMetrics] - Metrics for EHS
   * @returns {Object} CertificationResult
   */
  async certifySystem(options = {}) {
    const { entries = [], healthMetrics = {} } = options;

    const replayResult = await this.replayEngine.replay({ entries });
    const healthResult = this.healthScorer.calculate({
      totalPromotions: entries.filter(e => e.event_type === 'PROMOTION').length,
      totalRollbacks: entries.filter(e => e.event_type === 'ROLLBACK').length,
      totalRejections: entries.filter(e => e.event_type === 'REJECTION').length,
      ...healthMetrics
    });

    const isCertified = replayResult.integrity_verified && !healthResult.is_halted;

    return {
      status: isCertified ? 'CERTIFIED_HEALTHY' : 'CERTIFICATION_FAILED',
      is_certified: isCertified,
      replay_integrity: replayResult.integrity_verified,
      total_steps_replayed: replayResult.total_steps_replayed,
      ehs_score: healthResult.ehs,
      ehs_status: healthResult.status,
      certified_at: Date.now()
    };
  }
}

export { EvolutionReplayEngine, EvolutionHealthScore, EvolutionObservatory };
