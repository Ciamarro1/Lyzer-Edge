import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { EvolutionGovernanceFacade } from '../../src/evolution-governance/index.js';
import { AdaptiveEvolutionFacade } from '../../src/adaptive-evolution/index.js';

describe('Fase 7.4 — Evolution Governance Certification (ECS-1000)', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_evo_cert_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('certifies system across 1,000 simulated proposals with 100 promotions and 50 rollbacks', async () => {
    const db = createDb();
    const evoFacade = new AdaptiveEvolutionFacade(db);
    const govFacade = new EvolutionGovernanceFacade(db, evoFacade);

    // Generate 1,000 simulated ledger entries representing heavy evolutionary activity
    const simulatedEntries = [];
    const now = Date.now();

    let currentLhds = 0.90;
    let currentConsensus = 0.40;

    for (let i = 1; i <= 1000; i++) {
      let eventType = 'REJECTION';
      if (i <= 100) {
        eventType = 'PROMOTION';
      } else if (i <= 150) {
        eventType = 'ROLLBACK';
      } else if (i <= 200) {
        eventType = 'OBSERVATION';
      }

      let fromVal = currentLhds;
      let toVal = currentLhds;

      if (eventType === 'PROMOTION') {
        toVal = Number((currentLhds - 0.001).toFixed(3));
        currentLhds = toVal;
      } else if (eventType === 'ROLLBACK') {
        toVal = Number((currentLhds + 0.001).toFixed(3));
        currentLhds = toVal;
      }

      simulatedEntries.push({
        ledger_id: `cert_evo_${i}`,
        event_type: eventType,
        module: i % 2 === 0 ? 'TruthKernel' : 'CSRL',
        parameter: i % 2 === 0 ? 'LHDS_VETO_LIMIT' : 'CONSENSUS_LIMIT',
        from_value: fromVal,
        to_value: toVal,
        reason: eventType === 'ROLLBACK' ? 'TEST_SIMULATED_DEGRADATION' : 'TEST_SIMULATED_PROPOSAL',
        created_at: now + i * 1000
      });
    }

    // Run certification
    const certResult = await govFacade.certifySystem({
      entries: simulatedEntries,
      healthMetrics: {
        avgPnlDeltaPct: 5.0,
        unhandledVetoesCount: 0
      }
    });

    expect(certResult.is_certified).toBe(true);
    expect(certResult.status).toBe('CERTIFIED_HEALTHY');
    expect(certResult.replay_integrity).toBe(true);
    expect(certResult.total_steps_replayed).toBe(1000);
    expect(certResult.ehs_score).toBeGreaterThanOrEqual(75);

    // Verify Observatory Report
    const report = await govFacade.generateObservatoryReport({
      currentVersion: 'v1.42.0',
      healthMetrics: {
        totalPromotions: 100,
        totalRollbacks: 50,
        totalRejections: 800,
        avgPnlDeltaPct: 2.5,
        unhandledVetoesCount: 0
      }
    });

    expect(report.system_status.active_version).toBe('v1.42.0');
    expect(report.adaptation_statistics.total_proposals_processed).toBe(950);
    expect(report.adaptation_statistics.successful_promotions).toBe(100);
    expect(report.adaptation_statistics.rolled_back_adaptations).toBe(50);
    expect(report.constitutional_audit.constitutional_safety).toBe('100%');

    db.close();
  });
});
