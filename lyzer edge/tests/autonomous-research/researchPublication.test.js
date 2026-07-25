import { describe, test, expect } from 'vitest';
import { ResearchPublicationEngine } from '../../src/autonomous-research/ResearchPublicationEngine.js';

describe('Fase 15 — ResearchPublicationEngine Verification', () => {
  test('generates and stores internal scientific paper envelope', () => {
    const engine = new ResearchPublicationEngine();

    const paper = engine.publishPaper({
      title: 'Validation of Volatility Adaptive Filter',
      hypothesisId: 'hyp_vol_01',
      statisticalResults: { sample_size: 750, p_value: 0.002, confidence_interval: [0.20, 0.50] },
      verdict: 'PROVEN_KNOWLEDGE'
    });

    expect(paper.paper_id).toBeDefined();
    expect(paper.verdict).toBe('PROVEN_KNOWLEDGE');
    expect(engine.getPublications().length).toBe(1);
  });
});
