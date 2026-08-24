/**
 * V1 Provider: Liquidity Reconstruction Engine (SMC/ICT lens)
 * 
 * CORE DIRECTIVE:
 * This is NOT a trading strategy. 
 * This is a Hypothesis Generator that reconstructs reality through the lens of Liquidity.
 * Focuses on: Fair Value Gaps (FVG), Order Blocks (OB), and Liquidity Sweeps.
 * 
 * Augmented with Temporal Spatial Memory Index (Milestone 3 / Requirement R3).
 */

import { SpatialMemoryIndex } from '../smc/spatialMemoryIndex.js';

export class LiquidityReconstructionEngine {
    constructor(options = {}) {
        this.spatialIndex = new SpatialMemoryIndex(options);
    }

    /**
     * Reconstructs reality based on the last N candles.
     * @param {Array|Object} mtfCandles - An object with { fast: [], intermediate: [], slow: [] }
     * @returns {Object} Narrative reconstruction { signal, confidence, narrative, source, spatialMemory }
     */
    reconstruct(mtfCandles) {
        // Fallback to intermediate (M5/M15) or fast for structural liquidity mapping
        const candles = (mtfCandles.intermediate && mtfCandles.intermediate.length >= 5)
            ? mtfCandles.intermediate
            : (mtfCandles.fast && mtfCandles.fast.length >= 5 ? mtfCandles.fast : (mtfCandles.fast || mtfCandles.intermediate || []));
        if (candles.length < 5) return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA', source: 'LIQUIDITY_RECONSTRUCTION' };

        // Synchronize spatial memory index with candles
        this.spatialIndex.update(candles);

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
        const lookback = parseInt(process.env.SMC_LOOKBACK) || 0;
        let majorSweepDetected = false;

        if (lookback > 0 && candles.length >= lookback + 1) {
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
                majorSweepDetected = true;
            }

            // Bearish Sweep (Buy-Side Liquidity): price pierces majorHigh but rejects forming a bearish pin bar
            const isBearishPinBar = (current.high - current.close) >= tailThreshold && (current.high - current.open) >= tailThreshold;
            if (current.high > majorHigh && current.close < majorHigh && isBearishPinBar) {
                narrative = 'MAJOR_BSL_SWEPT_WITH_REJECTION';
                signal = 'short';
                confidence += 85;
                majorSweepDetected = true;
            }
        }

        if (!majorSweepDetected) {
            // Standard Liquidity Sweep (prev1)
            // Bullish Sweep: current goes below prev1 low but closes above it
            if (current.low < prev1.low && current.close > prev1.low) {
                if (narrative === 'NEUTRAL_LIQUIDITY') narrative = 'SELL_SIDE_LIQUIDITY_SWEPT';
                if (signal === 'flat') signal = 'long';
                confidence += 40;
            }
            // Bearish Sweep: current goes above prev1 high but closes below it
            if (current.high > prev1.high && current.close < prev1.high) {
                if (narrative === 'NEUTRAL_LIQUIDITY') narrative = 'BUY_SIDE_LIQUIDITY_SWEPT';
                if (signal === 'flat') signal = 'short';
                confidence += 40;
            }
        }

        // 3. Persistent Spatial Memory Interaction (Reaction to unmitigated zones)
        if (narrative === 'NEUTRAL_LIQUIDITY' && signal === 'flat') {
            const interaction = this.spatialIndex.checkInteraction(current);
            if (interaction) {
                if (interaction.direction === 'BULLISH' && interaction.type === 'TEST') {
                    narrative = interaction.level.type === 'OB'
                        ? 'BULLISH_OB_MITIGATION_REACTION'
                        : 'BULLISH_FVG_MITIGATION_REACTION';
                    signal = 'long';
                    confidence += 35;
                } else if (interaction.direction === 'BEARISH' && interaction.type === 'TEST') {
                    narrative = interaction.level.type === 'OB'
                        ? 'BEARISH_OB_MITIGATION_REACTION'
                        : 'BEARISH_FVG_MITIGATION_REACTION';
                    signal = 'short';
                    confidence += 35;
                }
            }
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
            narrative,
            spatialMemory: this.spatialIndex.getSummary()
        };
    }
}
