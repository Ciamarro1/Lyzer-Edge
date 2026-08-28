/**
 * V2 Provider: Structural Boundary Reconstruction Engine (SNR/SnD lens)
 * 
 * CORE DIRECTIVE:
 * This is NOT a trading strategy. 
 * This is a Hypothesis Generator that reconstructs reality through the lens of static boundaries.
 * Focuses on: Support/Resistance, Supply/Demand Zones, and Breakouts.
 */

export class StructuralBoundaryEngine {
    constructor(config = {}) {
        this.zones = [];
        this.lookback = config.lookback || 10;
        this.distanceThreshold = config.distanceThreshold || 0.002;
        this.breakoutConfidence = config.breakoutConfidence || 70;
        this.bounceConfidence = config.bounceConfidence || 50;
    }

    /**
     * Reconstructs reality based on the last N candles.
     * @param {Array} mtfCandles - An object with { fast: [], intermediate: [], slow: [] }
     * @returns {Object} Narrative reconstruction { signal, confidence, narrative }
     */
    reconstruct(mtfCandles) {
        const candles = (mtfCandles.slow && mtfCandles.slow.length >= this.lookback)
            ? mtfCandles.slow
            : ((mtfCandles.intermediate && mtfCandles.intermediate.length >= this.lookback)
                ? mtfCandles.intermediate
                : (mtfCandles.fast || []));
        if (candles.length < this.lookback) return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA' };

        const current = candles[candles.length - 1];
        const prev1 = candles[candles.length - 2];

        // Simplified Supply/Demand detection (local min/max over lookback periods)
        let localMax = -Infinity;
        let localMin = Infinity;
        for (let i = candles.length - this.lookback; i < candles.length - 1; i++) {
            if (candles[i].high > localMax) localMax = candles[i].high;
            if (candles[i].low < localMin) localMin = candles[i].low;
        }

        const resistanceZone = localMax;
        const supportZone = localMin;

        let narrative = 'RANGE_BOUND';
        let signal = 'flat';
        let confidence = 0;

        // Detect Breakouts vs Bounces
        const distanceToRes = Math.abs(current.close - resistanceZone) / resistanceZone;
        const distanceToSup = Math.abs(current.close - supportZone) / supportZone;

        if (distanceToRes < this.distanceThreshold) {
            // Near Resistance
            if (current.close > resistanceZone) {
                narrative = 'RESISTANCE_BREAKOUT';
                signal = 'long';
                confidence = this.breakoutConfidence;
            } else {
                narrative = 'RESISTANCE_REJECTION';
                signal = 'short';
                confidence = this.bounceConfidence;
            }
        } else if (distanceToSup < this.distanceThreshold) {
            // Near Support
            if (current.close < supportZone) {
                narrative = 'SUPPORT_BREAKDOWN';
                signal = 'short';
                confidence = this.breakoutConfidence;
            } else {
                narrative = 'SUPPORT_BOUNCE';
                signal = 'long';
                confidence = this.bounceConfidence;
            }
        } else {
            // Moving towards boundaries
            if (current.close > prev1.close) {
                narrative = 'TRENDING_TO_SUPPLY';
                signal = 'long';
                confidence = 30;
            } else {
                narrative = 'TRENDING_TO_DEMAND';
                signal = 'short';
                confidence = 30;
            }
        }

        return {
            source: 'STRUCTURAL_BOUNDARY',
            signal,
            confidence,
            narrative
        };
    }
}
