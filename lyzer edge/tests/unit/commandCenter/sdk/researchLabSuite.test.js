import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResearchLabEngine } from '../../../../src/components/commandCenter/sdk/evidence/lab/ResearchLabEngine.js';
import { ModelRegistryEngine } from '../../../../src/components/commandCenter/sdk/evidence/lab/ModelRegistryEngine.js';
import { ConceptDriftEngine } from '../../../../src/components/commandCenter/sdk/evidence/lab/ConceptDriftEngine.js';
import { EvidenceMarketplaceEngine } from '../../../../src/components/commandCenter/sdk/evidence/lab/EvidenceMarketplaceEngine.js';
import { StrategyGenomeEngine } from '../../../../src/components/commandCenter/sdk/evidence/lab/StrategyGenomeEngine.js';

describe('Quantitative Research Lab & Strategy Genome Platform Suite', () => {
  let lab;
  let registry;
  let drift;
  let marketplace;
  let genome;

  beforeEach(() => {
    lab = new ResearchLabEngine();
    registry = new ModelRegistryEngine();
    drift = new ConceptDriftEngine();
    marketplace = new EvidenceMarketplaceEngine();
    genome = new StrategyGenomeEngine(50);
  });

  afterEach(() => {
    if (lab) lab.dispose();
  });

  it('Pillar 1: ResearchLabEngine should execute ablation experiments and compute marginal Sharpe delta', () => {
    const res = lab.executeLabExperiment(3812, { OPENMOBIUS: true, LIQUIDITY: true });

    expect(res.expId).toBe('EXP-3812');
    expect(res.sharpe).toBe(2.13);
    expect(res.marginalSharpeDelta).toBe(+0.21);
  });

  it('Pillar 2: ModelRegistryEngine should track versioned model metadata and deployment stage', () => {
    const models = registry.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models[0].version).toBe('2.3.1');
    expect(models[0].status).toBe('PRODUCTION');
  });

  it('Pillar 3: ConceptDriftEngine should detect drift and trigger automated weight reduction fallback', () => {
    const normalCheck = drift.evaluateDrift('openmobius-smc-v2', 0.72);
    expect(normalCheck.driftDetected).toBe(false);

    const driftCheck = drift.evaluateDrift('openmobius-smc-v2', 0.45);
    expect(driftCheck.driftDetected).toBe(true);
    expect(driftCheck.newWeight).toBe(0.05);
    expect(driftCheck.targetMode).toBe('SHADOW_MODE');
  });

  it('Pillar 4: EvidenceMarketplaceEngine should register third-party plugins with reputation scores', () => {
    const plugins = marketplace.listPlugins();

    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins[0].author).toBe('MobiusQuant');
    expect(plugins[0].lastEvaluationScore).toBe(97);
  });

  it('Pillar 5: StrategyGenomeEngine should execute evolutionary mutations at high throughput (> 10,000 mutations/sec)', () => {
    const count = 1000;
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      genome.evolveGeneration();
    }

    const durationMs = performance.now() - startTime;
    const mutationsPerSec = (count * 50 / durationMs) * 1000;

    console.log(`Strategy Genome Evolutionary Performance: ${count} generations (50,000 genomes) evolved in ${durationMs.toFixed(2)}ms (${mutationsPerSec.toFixed(0)} mutations/sec)`);

    expect(mutationsPerSec).toBeGreaterThan(10000);
  });
});
