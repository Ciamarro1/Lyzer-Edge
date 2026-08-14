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
        // Note: FVG/OB memory tracking is a future enhancement (see alpha_audit_report.md G8)
    }

    /**
     * Reconstructs reality based on the last N candles.
     * @param {Array} mtfCandles - An object with { fast: [], intermediate: [], slow: [] }
     * @returns {Object} Narrative reconstruction { signal, confidence, narrative }
     */
    reconstruct(mtfCandles) {
        // Fallback to intermediate (M5) for structural liquidity mapping
        const candles = (mtfCandles.intermediate && mtfCandles.intermediate.length >= 21)
            ? mtfCandles.intermediate
            : (mtfCandles.fast || []);
        if (candles.length < 21) return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA' };

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

        // 2. Detect Liquidity Sweep (Structural Sweep N=20)
        const lookback = parseInt(process.env.SMC_LOOKBACK) || 20;
        
        // We need enough candles for the lookback + current
        if (candles.length < lookback + 1) return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA' };

        let majorHigh = -Infinity;
        let majorLow = Infinity;

        for (let i = candles.length - 1 - lookback; i < candles.length - 1; i++) {
            if (candles[i].high > majorHigh) majorHigh = candles[i].high;
            if (candles[i].low < majorLow) majorLow = candles[i].low;
        }

        const totalRange = current.high - current.low;
        const tailThreshold = totalRange * 0.5;

        // Bullish Sweep (Sell-Side Liquidity): price pierces majorLow but rejects forming a bullish pin bar
        const isBullishPinBar = (current.close - current.low) >= tailThreshold && (current.open - current.low) >= tailThreshold;
        if (current.low < majorLow && current.close > majorLow && isBullishPinBar) {
            narrative = 'MAJOR_SSL_SWEPT_WITH_REJECTION';
            signal = 'long';
            confidence += 85;
        }

        // Bearish Sweep (Buy-Side Liquidity): price pierces majorHigh but rejects forming a bearish pin bar
        const isBearishPinBar = (current.high - current.close) >= tailThreshold && (current.high - current.open) >= tailThreshold;
        if (current.high > majorHigh && current.close < majorHigh && isBearishPinBar) {
            narrative = 'MAJOR_BSL_SWEPT_WITH_REJECTION';
            signal = 'short';
            confidence += 85;
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
