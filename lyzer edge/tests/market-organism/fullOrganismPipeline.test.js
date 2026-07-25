import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CognitiveOrganismFacade } from '../../src/market-organism/index.js';

describe('Fase 11 — Full Cognitive Market Organism Life Cycle Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_org_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('runs complete organism life cycle with automatic mutation triggering for aging strategy', () => {
    const db = createDb();
    const facade = new CognitiveOrganismFacade(db);

    const genomes = [
      { strategy_id: 'SMC_V1', name: 'SMC Breakout', cas_score: 85.0, mutations_count: 0, regime_affinity: ['REGIME_A_CONSENSUS'] },
      { strategy_id: 'OLD_TREND', name: 'Old Trend', cas_score: 45.0, mutations_count: 1, regime_affinity: ['REGIME_A_CONSENSUS'] }
    ];

    const performanceMap = {
      'SMC_V1': { peak_sharpe: 2.0, current_sharpe: 1.8, recent_sharpe: 1.8 },
      'OLD_TREND': { peak_sharpe: 2.2, current_sharpe: 0.8, recent_sharpe: 0.8, days_active: 90 } // decaying -> trigger mutation
    };

    const marketMetrics = {
      volatility: 0.03,
      spread: 0.0003,
      efficiencyRatio: 0.6
    };

    const cycleResult = facade.runOrganismCycle({
      marketMetrics,
      genomes,
      performanceMap
    });

    expect(cycleResult.cycle_id).toBeDefined();
    expect(cycleResult.ecology.liquidity_state).toBe('NORMAL');
    expect(cycleResult.competition.dominant_species).toBe('SMC_V1');
    expect(cycleResult.auto_mutated_genomes_count).toBeGreaterThan(0);
    expect(cycleResult.mutated_genomes[0].parent_strategy_id).toBe('OLD_TREND');
    expect(cycleResult.mutated_genomes[0].strategy_id).toBe('OLD_TREND_m2');

    db.close();
  });
});
