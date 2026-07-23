import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CognitiveIntelligenceFacade } from '../../src/cognitive-intelligence/index.js';

describe('Fase 8 — Full Cognitive Market Intelligence Pipeline Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_intel_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('runs complete intelligence cycle: Regime → Feature → Hypothesis → Strategy Candidates', () => {
    const db = createDb();
    const facade = new CognitiveIntelligenceFacade(db);

    const marketSnapshots = [
      { volatility: 0.10, dvf: 0.15, trg: 0.25, spread: 0.002 },
      { volatility: 0.12, dvf: 0.10, trg: 0.20, spread: 0.003 }
    ];

    const dataset = [
      { dvf: 0.9, trg: 0.8, lhds: 0.9, rsi: 70, pnl: 10.0 },
      { dvf: 0.8, trg: 0.7, lhds: 0.85, rsi: 65, pnl: 8.0 },
      { dvf: 0.6, trg: 0.5, lhds: 0.7, rsi: 50, pnl: 2.0 },
      { dvf: 0.3, trg: 0.2, lhds: 0.4, rsi: 35, pnl: -5.0 },
      { dvf: 0.2, trg: 0.1, lhds: 0.3, rsi: 25, pnl: -8.0 }
    ];

    const result = facade.runIntelligenceCycle({
      marketSnapshots,
      dataset,
      currentState: {
        'TruthKernel.LHDS_VETO_LIMIT': 0.90,
        'ExecutionTrigger.TRG_THRESHOLD': 0.40
      }
    });

    expect(result.cycle_id).toBeDefined();
    expect(result.regime.regime_id).toBe('REGIME_C_CRISIS');
    expect(result.discovered_features_count).toBeGreaterThan(0);
    expect(result.hypotheses_generated_count).toBeGreaterThan(0);
    expect(result.candidates_count).toBeGreaterThan(0);

    const candidate = result.candidates[0];
    expect(candidate.status).toBe('READY_FOR_SANDBOX');
    expect(candidate.proposed_value).toBeDefined();

    db.close();
  });
});
