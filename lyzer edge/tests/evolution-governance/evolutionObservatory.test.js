import { describe, test, expect } from 'vitest';
import { EvolutionObservatory } from '../../src/evolution-governance/EvolutionObservatory.js';

describe('Fase 7.4 — EvolutionObservatory Verification', () => {
  test('generates full observatory status report', async () => {
    const mockFacade = {
      getActiveTransactions: () => [{ tx_id: 'tx_001', status: 'ACTIVE' }],
      getLineage: () => [{ from: 'v1.0.0', to: 'v1.1.0', reason: 'PROMOTION' }]
    };

    const observatory = new EvolutionObservatory(null, mockFacade);

    const report = await observatory.generateStatusReport({
      currentVersion: 'v1.1.0',
      healthMetrics: {
        totalPromotions: 15,
        totalRollbacks: 2,
        totalRejections: 3,
        avgPnlDeltaPct: 2.8,
        unhandledVetoesCount: 0
      }
    });

    expect(report.title).toBe('LYZER EVOLUTION OBSERVATORY DASHBOARD');
    expect(report.system_status.active_version).toBe('v1.1.0');
    expect(report.system_status.active_adaptations_count).toBe(1);
    expect(report.adaptation_statistics.successful_promotions).toBe(15);
    expect(report.adaptation_statistics.rolled_back_adaptations).toBe(2);
    expect(report.lineage_summary.lineage_depth).toBe(1);
    expect(report.constitutional_audit.last_review_status).toBe('ECA_COURT_APPROVED');
  });
});
