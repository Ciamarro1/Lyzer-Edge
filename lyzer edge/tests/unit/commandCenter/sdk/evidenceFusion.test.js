import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EvidenceFusionEngine } from '../../../../src/components/commandCenter/sdk/evidence/fusion/EvidenceFusionEngine.js';
import { HypothesisGenerator } from '../../../../src/components/commandCenter/sdk/evidence/fusion/HypothesisGenerator.js';
import { HypothesisRanker } from '../../../../src/components/commandCenter/sdk/evidence/fusion/HypothesisRanker.js';

describe('Evidence Fusion & Bayesian Hypothesis Pipeline Suite', () => {
  let fusionEngine;
  let hypothesisGen;
  let hypothesisRanker;

  beforeEach(() => {
    fusionEngine = new EvidenceFusionEngine();
    hypothesisGen = new HypothesisGenerator();
    hypothesisRanker = new HypothesisRanker();
  });

  afterEach(() => {
    if (fusionEngine) fusionEngine.dispose();
  });

  it('should fuse multi-source evidence and compute a Posterior Evidence Score', () => {
    const evidenceList = [
      {
        sourceEngine: 'LYZER_NATIVE',
        evidenceMetrics: { confidence: 0.80, probability: 0.75, uncertainty: 0.20 },
        regimeState: { EXPANSION: 0.80 }
      },
      {
        sourceEngine: 'OPENMOBIUS_SMC',
        evidenceMetrics: { confidence: 0.85, probability: 0.70, uncertainty: 0.15 },
        regimeState: { EXPANSION: 0.70 }
      }
    ];

    const fused = fusionEngine.fuseEvidence(evidenceList);

    expect(fused).toBeDefined();
    expect(fused.posteriorScore).toBeGreaterThan(0);
    expect(fused.fusedConfidence).toBeGreaterThan(0.70);
    expect(fused.provenance.engine).toBe('EVIDENCE_FUSION_ENGINE');
  });

  it('should dynamically adapt Bayesian weights when market regime changes to RANGING', () => {
    const weightsBefore = fusionEngine.adaptWeightsForRegime('TRENDING');
    expect(weightsBefore.LYZER_NATIVE).toBeGreaterThan(0);

    const weightsRanging = fusionEngine.adaptWeightsForRegime('RANGING');
    // OpenMobius weight should adapt up in ranging markets (0.40)
    expect(weightsRanging.OPENMOBIUS_SMC).toBe(0.40);
  });

  it('should generate and rank competing hypotheses cleanly', () => {
    const fused = fusionEngine.fuseEvidence([
      {
        sourceEngine: 'OPENMOBIUS_SMC',
        evidenceMetrics: { confidence: 0.90, probability: 0.85, uncertainty: 0.10 },
        regimeState: { EXPANSION: 0.85 }
      }
    ]);

    const hypotheses = hypothesisGen.generateHypotheses(fused);
    expect(hypotheses.length).toBe(3);

    const ranked = hypothesisRanker.rankHypotheses(hypotheses);
    expect(ranked.topHypothesis).toBeDefined();
    expect(ranked.status).toBe('VALIDATED');
  });

  it('should achieve ultra-high fusion throughput over 10,000 continuous streams (> 20,000 ops/sec)', () => {
    const count = 10000;
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      const fused = fusionEngine.fuseEvidence([
        {
          sourceEngine: 'LYZER_NATIVE',
          evidenceMetrics: { confidence: 0.80, probability: 0.70, uncertainty: 0.20 },
          regimeState: { EXPANSION: 0.70 }
        },
        {
          sourceEngine: 'OPENMOBIUS_SMC',
          evidenceMetrics: { confidence: 0.85, probability: 0.75, uncertainty: 0.15 },
          regimeState: { EXPANSION: 0.75 }
        }
      ]);
      const hypotheses = hypothesisGen.generateHypotheses(fused);
      hypothesisRanker.rankHypotheses(hypotheses);
    }

    const durationMs = performance.now() - startTime;
    const opsPerSec = (count / durationMs) * 1000;

    console.log(`Evidence Fusion Pipeline Performance: ${count} stream fusions in ${durationMs.toFixed(2)}ms (${opsPerSec.toFixed(0)} ops/sec)`);

    expect(opsPerSec).toBeGreaterThan(20000);
  });
});
