import { describe, test, expect } from 'vitest';
import { KnowledgeMaturationPipeline } from '../../src/empirical-validation/KnowledgeMaturationPipeline.js';

describe('Fase 9 — KnowledgeMaturationPipeline Verification', () => {
  test('advances maturity from HYPOTHESIS to ESTABLISHED with high CES', () => {
    const pipeline = new KnowledgeMaturationPipeline();

    const result = pipeline.advanceMaturity({
      patternId: 'TruthKernel.LHDS_VETO_LIMIT',
      cesScore: 88.0,
      verificationCount: 60,
      currentStage: 'HYPOTHESIS'
    });

    expect(result.current_stage).toBe('ESTABLISHED');
    expect(result.is_promoted).toBe(true);
  });
});
