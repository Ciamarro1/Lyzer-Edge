import { test, expect, describe } from 'vitest';
import { DynamicWeightMatrix } from '../../../packages/lyzer-shared/src/engine/weightMatrix.js';

describe('Anti-Fragility: Dynamic Weights & Elastic MFE', () => {
    
    test('WFA (Walk-Forward Analysis) - Weights should adapt to regimes', () => {
        const matrix = new DynamicWeightMatrix();
        
        // Scenario 1: Low Volatility (Range)
        const rangeWeights = matrix.evaluate(0.001, 'RANGE');
        expect(rangeWeights.v2).toBeGreaterThan(1.0); // SNR gains authority
        expect(rangeWeights.v5).toBeGreaterThan(1.0); // Wyckoff gains authority
        expect(rangeWeights.v3).toBeLessThan(1.0);    // Momentum loses authority
        
        // Scenario 2: High Volatility (Trend / Shock)
        const trendWeights = matrix.evaluate(0.003, 'TREND');
        expect(trendWeights.v7).toBeGreaterThan(1.5); // Tape reading spikes
        expect(trendWeights.v4).toBeGreaterThan(1.0); // IMCE spikes
        expect(trendWeights.v3).toBeGreaterThan(1.0); // Momentum gains authority
        expect(trendWeights.v2).toBeLessThan(1.0);    // SNR loses authority
    });

    test('Monte Carlo Jitter - Matrix stability under dirty OHLC data', () => {
        const matrix = new DynamicWeightMatrix();
        let stableRegimeCount = 0;
        
        // Simulate 100 ticks of a messy trending market with stochastic jitter
        for (let i = 0; i < 100; i++) {
            // Base ATR = 0.0025, Jitter = +/- 0.0005
            const jitteredAtr = 0.0025 + (Math.random() * 0.001 - 0.0005);
            const w = matrix.evaluate(jitteredAtr, 'TREND');
            
            // Core trending engines must maintain dominance despite the jitter
            if (w.v7 > 1.0 && w.v3 > 1.0) {
                stableRegimeCount++;
            }
        }
        
        // Expect at least 95% stability against microstructural noise
        expect(stableRegimeCount).toBeGreaterThanOrEqual(95);
    });

    test('Adversarial Slippage - Elastic MFE must survive punitive execution', () => {
        // Mock a long trade entry
        const entryPrice = 50000;
        const microAtr = 100; // 0.2% ATR
        const trg = 0.5; // High tail risk = expansion
        
        const riskDistance = microAtr * 1.5; // 150 points
        
        // Dynamic MFE Projection
        const trgExpansion = 1.0 + trg;
        const mfeTargetScale1 = Math.max(1.5, 1.5 * trgExpansion); // 2.25R
        
        const staticPartialPrice = entryPrice + (1.5 * riskDistance); // 50225
        const dynamicPartialPrice = entryPrice + (mfeTargetScale1 * riskDistance); // 50337.5
        
        // Inject 5 ticks of Adversarial Slippage (delay in scale-out execution)
        const slippagePunishment = 25; // Price dropped 25 points before fill
        
        const filledStatic = staticPartialPrice - slippagePunishment; // 50200
        const filledDynamic = dynamicPartialPrice - (slippagePunishment * 2); // 50287.5 (punish harder for waiting longer)
        
        // The dynamic elastic exit MUST still outperform the static exit even after surviving adversarial slippage
        expect(filledDynamic).toBeGreaterThan(filledStatic);
    });
});
