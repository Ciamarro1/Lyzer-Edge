import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { AdaptiveEvaluationFacade } from '../../src/adaptive-evaluation/index.js';

describe('Fase 7.2 — Full Evaluation Pipeline Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_eval_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('evaluateProposal returns PROMOTABLE for safe, stable adaptation', () => {
    const db = createDb();
    const facade = new AdaptiveEvaluationFacade(db);

    const result = facade.evaluateProposal({
      productionResults: [
        { pnl: 1.0, trades: 10, exposure: 1000 },
        { pnl: 0.8, trades: 10, exposure: 1000 },
        { pnl: 1.1, trades: 11, exposure: 1010 },
        { pnl: 0.9, trades: 10, exposure: 1000 }
      ],
      shadowResults: [
        { pnl: 1.1, trades: 10, exposure: 1010 },
        { pnl: 0.9, trades: 11, exposure: 1010 },
        { pnl: 1.2, trades: 11, exposure: 1020 },
        { pnl: 1.0, trades: 10, exposure: 1010 }
      ],
      regimeResults: {
        REGIME_A_CONSENSUS: { pnl_pct: 12, trades: 100 },
        REGIME_B_DIVERGENT: { pnl_pct: 10, trades: 80 },
        REGIME_C_CRISIS: { pnl_pct: 8, trades: 60 }
      }
    });

    expect(result.verdict).toBe('PROMOTABLE');
    expect(result.ars.is_promotable).toBe(true);
    expect(result.regime.is_stable).toBe(true);

    db.close();
  });

  test('evaluateProposal returns REJECTED_REGIME for lethal crisis regime', () => {
    const db = createDb();
    const facade = new AdaptiveEvaluationFacade(db);

    const result = facade.evaluateProposal({
      productionResults: [{ pnl: 1.0, trades: 10, exposure: 1000 }],
      shadowResults: [{ pnl: 1.5, trades: 12, exposure: 1100 }],
      regimeResults: {
        REGIME_A_CONSENSUS: { pnl_pct: 15, trades: 100 },
        REGIME_C_CRISIS: { pnl_pct: -25, trades: 30 }
      }
    });

    expect(result.verdict).toBe('REJECTED_REGIME');
    expect(result.regime.is_rejected).toBe(true);

    db.close();
  });

  test('records evolution entry and retrieves full ledger', async () => {
    const db = createDb();
    const facade = new AdaptiveEvaluationFacade(db);

    const entry = await facade.recordEvolution({
      event_type: 'PROMOTION',
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      from_value: 0.90,
      to_value: 0.85,
      acs_score: 97.0,
      ars_score: 18.5,
      reason: 'COUNTERFACTUAL_GAIN'
    });

    expect(entry.ledger_id).toBeDefined();

    const ledger = await facade.getFullLedger();
    expect(ledger.length).toBe(1);

    db.close();
  });
});
