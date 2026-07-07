/**
 * V1 Provider: Liquidity Reconstruction Engine (SMC/ICT lens)
 * 
 * CORE DIRECTIVE:
 * This is NOT a trading strategy. 
 * This is a Hypothesis Generator that reconstructs reality through the lens of Liquidity.
 * Focuses on: Fair Value Gaps (FVG), Order Blocks (OB), and Liquidity Sweeps.
 */

export class LiquidityReconstructionEngine {
    constructor() {
        this.fvgMemory = [];
        this.obMemory = [];
    }

    /**
     * Reconstructs reality based on the last N candles.
     * @param {Array} mtfCandles - An object with { fast: [], intermediate: [], slow: [] }
     * @returns {Object} Narrative reconstruction { signal, confidence, narrative }
     */
    reconstruct(mtfCandles) {
        // Fallback to intermediate (M5) for structural liquidity mapping
        const candles = (mtfCandles.intermediate && mtfCandles.intermediate.length >= 5)
            ? mtfCandles.intermediate
            : (mtfCandles.fast || []);
        if (candles.length < 5) return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA' };

        const current = candles[candles.length - 1];
        const prev1 = candles[candles.length - 2];
        const prev2 = candles[candles.length - 3];
        const prev3 = candles[candles.length - 4];

        let narrative = 'NEUTRAL_LIQUIDITY';
        let signal = 'flat';
        let confidence = 0;

        // 1. Detect Fair Value Gap (FVG)
        // Bullish FVG: prev3 high < prev1 low
        if (prev3.high < prev1.low && prev2.close > prev2.open) {
            narrative = 'BULLISH_FVG_DETECTED';
            signal = 'long';
            confidence += 30;
        }
        // Bearish FVG: prev3 low > prev1 high
        else if (prev3.low > prev1.high && prev2.close < prev2.open) {
            narrative = 'BEARISH_FVG_DETECTED';
            signal = 'short';
            confidence += 30;
        }

        // 2. Detect Liquidity Sweep
        // Bullish Sweep: current goes below prev1 low but closes above it
        if (current.low < prev1.low && current.close > prev1.low) {
            narrative = 'SELL_SIDE_LIQUIDITY_SWEPT';
            signal = 'long';
            confidence += 40;
        }
        // Bearish Sweep: current goes above prev1 high but closes below it
        if (current.high > prev1.high && current.close < prev1.high) {
            narrative = 'BUY_SIDE_LIQUIDITY_SWEPT';
            signal = 'short';
            confidence += 40;
        }

        // Normalize confidence
        confidence = Math.min(100, Math.max(0, confidence));
        
        // If conflicting signals, confidence drops (internal divergence)
        if (confidence === 0) {
            signal = 'flat';
        }

        return {
            source: 'LIQUIDITY_RECONSTRUCTION',
            signal,
            confidence,
            narrative
        };
    }
}
