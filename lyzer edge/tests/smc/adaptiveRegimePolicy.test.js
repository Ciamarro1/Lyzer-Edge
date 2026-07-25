import { describe, it, expect } from 'vitest';
import { AdaptiveRegimePolicy } from '../../../packages/lyzer-shared/src/smc/adaptiveRegimePolicy.js';

describe('AdaptiveRegimePolicy - Dynamic Regime Filter Policy Suite', () => {
  it('should select RANGING_REVERSAL_SWEEP policy during consolidation regime', () => {
    const policyEngine = new AdaptiveRegimePolicy();
    const policy = policyEngine.selectPolicy({
      trendBias: 'NEUTRAL',
      volatilityAtr: 1.1,
      trg: 0.45
    });

    expect(policy.policyName).toBe('RANGING_REVERSAL_SWEEP');
    expect(policy.featureH4).toBe(false); // Allows SMC reversal sweeps in ranging regime
    expect(policy.featureStructure).toBe(true);
    expect(policy.trgThreshold).toBe(0.60);
  });

  it('should select TREND_FOLLOWING_CONFLUENCE policy during strong trend regime', () => {
    const policyEngine = new AdaptiveRegimePolicy();
    const policy = policyEngine.selectPolicy({
      trendBias: 'BULLISH',
      volatilityAtr: 1.2,
      trg: 0.50
    });

    expect(policy.policyName).toBe('TREND_FOLLOWING_CONFLUENCE');
    expect(policy.featureH4).toBe(true);
    expect(policy.featureStructure).toBe(true);
  });
});
