import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CognitivePortfolioFacade } from '../../src/cognitive-portfolio/index.js';

describe('Fase 10 — Full Cognitive Portfolio Intelligence Pipeline Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_port_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('runs complete portfolio optimization: Register Genomes → Correlation Matrix → Regime Allocation → CAS → Capital Governor', () => {
    const db = createDb();
    const facade = new CognitivePortfolioFacade(db);

    facade.registerGenome({
      strategy_id: 'SMC_TREND_V1',
      name: 'SMC Trend Following',
      ces_score: 92.0,
      ehs_score: 90.0,
      regime_affinity: ['REGIME_A_CONSENSUS'],
      risk_profile: 'LOW'
    });

    facade.registerGenome({
      strategy_id: 'MEAN_REV_V2',
      name: 'Mean Reversion',
      ces_score: 85.0,
      ehs_score: 88.0,
      regime_affinity: ['REGIME_A_CONSENSUS', 'REGIME_B_DIVERGENT'],
      risk_profile: 'MEDIUM'
    });

    const strategyReturnsMap = {
      'SMC_TREND_V1': [1.5, 2.0, -0.5, 1.8],
      'MEAN_REV_V2': [-0.5, 1.0, 2.0, -0.2]
    };

    const result = facade.optimizePortfolio({
      currentRegime: 'REGIME_A_CONSENSUS',
      strategyReturnsMap,
      totalPortfolioValueUsd: 200000
    });

    expect(result.portfolio_status).toBe('OPTIMIZED');
    expect(result.total_genomes_count).toBe(2);
    expect(result.active_regime).toBe('REGIME_A_CONSENSUS');
    expect(result.governed_capital_allocation.status).toBe('GOVERNED_ALLOCATION_APPROVED');
    expect(result.governed_capital_allocation.approved_allocations.length).toBe(2);

    db.close();
  });
});
