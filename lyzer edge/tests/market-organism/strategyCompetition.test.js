import { describe, test, expect } from 'vitest';
import { StrategyCompetitionEngine } from '../../src/market-organism/StrategyCompetitionEngine.js';

describe('Fase 11.2 — StrategyCompetitionEngine Verification', () => {
  test('identifies DOMINANT species and DECLINING species based on fitness score', () => {
    const engine = new StrategyCompetitionEngine();

    const genomes = [
      { strategy_id: 'SMC_DOMINANT', name: 'Dominant Species', cas_score: 95.0 },
      { strategy_id: 'OLD_MODEL', name: 'Declining Species', cas_score: 40.0 }
    ];

    const perfMap = {
      'SMC_DOMINANT': { recent_sharpe: 2.2 },
      'OLD_MODEL': { recent_sharpe: 0.1 }
    };

    const result = engine.evaluateCompetition(genomes, perfMap);

    expect(result.dominant_species).toBe('SMC_DOMINANT');
    expect(result.top_fitness_score).toBeGreaterThan(85);
    expect(result.declining_species_count).toBe(1);
    expect(result.declining_species[0]).toBe('OLD_MODEL');
  });
});
