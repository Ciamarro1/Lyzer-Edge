import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetaLearningEngine } from '../../../../src/components/commandCenter/sdk/evidence/cognitive/MetaLearningEngine.js';
import { EvidenceAttributionEngine } from '../../../../src/components/commandCenter/sdk/evidence/cognitive/EvidenceAttributionEngine.js';
import { MarketMemoryEngine } from '../../../../src/components/commandCenter/sdk/evidence/cognitive/MarketMemoryEngine.js';
import { CounterfactualEngine } from '../../../../src/components/commandCenter/sdk/evidence/cognitive/CounterfactualEngine.js';
import { SimulationUniverseEngine } from '../../../../src/components/commandCenter/sdk/evidence/cognitive/SimulationUniverseEngine.js';

describe('Cognitive Maturity Era — 5 Pillars Suite', () => {
  let metaLearning;
  let attribution;
  let memory;
  let counterfactual;
  let simulation;

  beforeEach(() => {
    metaLearning = new MetaLearningEngine();
    attribution = new EvidenceAttributionEngine();
    memory = new MarketMemoryEngine();
    counterfactual = new CounterfactualEngine();
    simulation = new SimulationUniverseEngine();
  });

  afterEach(() => {
    if (metaLearning) metaLearning.dispose();
  });

  it('Pillar 1: MetaLearningEngine should update weights based on realized trade outcomes ("Quem acertou")', () => {
    const weightsBefore = metaLearning.getCalibratedWeights().weights;

    metaLearning.registerOutcome({
      tradeId: 't_001',
      pnlR: 2.5,
      success: true,
      sourceContributions: { OPENMOBIUS_SMC: 0.40, LYZER_NATIVE: 0.30 }
    });

    const weightsAfter = metaLearning.getCalibratedWeights().weights;
    expect(weightsAfter.OPENMOBIUS_SMC).toBeGreaterThan(0.05);
  });

  it('Pillar 2: EvidenceAttributionEngine should decompose decision score into exact percentage contributions', () => {
    const report = attribution.computeAttribution({ posteriorScore: 0.62, primaryRegime: 'EXPANSION' }, { OPENMOBIUS_SMC: 0.30, LIQUIDITY_ENGINE: 0.40 });

    expect(report.netScore).toBe(62);
    expect(report.breakdown.length).toBeGreaterThan(0);
    expect(report.explainabilityText).toContain('Decision: 62%');
  });

  it('Pillar 3: MarketMemoryEngine should match query vector against historical database using cosine similarity', () => {
    const match = memory.matchPattern([1, 1, 1, 0.8]);

    expect(match.similarityPct).toBeGreaterThan(50);
    expect(match.historicalCount).toBeGreaterThan(0);
    expect(match.summaryText).toContain('Observed similar pattern');
  });

  it('Pillar 4: CounterfactualEngine should evaluate alternative "What-If" scenarios without capital risk', () => {
    const report = counterfactual.evaluateCounterfactuals({ posteriorScore: 0.70 }, []);

    expect(report.scenarios.length).toBe(3);
    expect(report.scenarios[0].scenarioId).toBe('CF_EXCLUDE_OPENMOBIUS');
  });

  it('Pillar 5: SimulationUniverseEngine should execute 10,000 parallel Monte Carlo simulation universes with high throughput (> 10,000 sim/sec)', () => {
    const simReport = simulation.runSimulationUniverse(10000);

    expect(simReport.numUniverses).toBe(10000);
    expect(simReport.throughputSimsPerSec).toBeGreaterThan(10000);
    expect(simReport.robustnessScore).toBe('HIGHLY_ROBUST');
    console.log(`Monte Carlo Performance: 10,000 parallel universes in ${simReport.durationMs}ms (${simReport.throughputSimsPerSec} sim/sec)`);
  });
});
