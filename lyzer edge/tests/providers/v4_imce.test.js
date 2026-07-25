import { describe, it, expect } from 'vitest';
import { InstitutionalMarketCausalityEngine } from '../../../packages/lyzer-shared/src/providers/v4_imce.js';

describe('InstitutionalMarketCausalityEngine (V4 IMCE Provider)', () => {
  it('reconstructs causal narrative and trade DNA bar by bar', () => {
    const imce = new InstitutionalMarketCausalityEngine();
    
    // Generate mock 1m candle stream
    const fastCandles = Array.from({ length: 20 }, (_, i) => ({
      open: 100 + i * 0.1,
      high: 102 + i * 0.1,
      low: 99 + i * 0.1,
      close: 101 + i * 0.1,
      volume: 1000 + i * 10
    }));

    const result = imce.reconstruct({ fast: fastCandles });
    
    expect(result).toHaveProperty('signal');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('narrative');
    expect(result).toHaveProperty('explanationText');
    expect(result).toHaveProperty('tradeDna');
    expect(result).toHaveProperty('causalAnswers');
    
    expect(result.tradeDna).toHaveProperty('sweep');
    expect(result.tradeDna).toHaveProperty('marketState');
    expect(result.causalAnswers).toHaveProperty('whatHappened');
    expect(result.causalAnswers).toHaveProperty('wherePriceWantsToGo');
  });
});
