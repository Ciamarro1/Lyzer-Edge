/**
 * V3 Provider: Momentum and Relative Strength Index (RSI) Engine
 * 
 * CORE DIRECTIVE:
 * This is NOT a trading strategy.
 * This is a Hypothesis Generator that reconstructs reality through the lens of momentum shift and extremes.
 * Focuses on: Relative Strength Index (RSI) and Rate of Change (ROC).
 */

export class MomentumRsiEngine {
    constructor() {
        this.rsiPeriod = 14;
        this.momPeriod = 5;
    }

    calculateRSI(candles) {
        if (candles.length <= this.rsiPeriod) return 50; // Default neutral

        let gains = 0;
        let losses = 0;

        // Calculate initial SMA of gains and losses
        for (let i = 1; i <= this.rsiPeriod; i++) {
            const diff = candles[i].close - candles[i - 1].close;
            if (diff > 0) gains += diff;
            else losses -= diff;
        }

        let avgGain = gains / this.rsiPeriod;
        let avgLoss = losses / this.rsiPeriod;

        // Apply Wilder's smoothing technique for subsequent points
        for (let i = this.rsiPeriod + 1; i < candles.length; i++) {
            const diff = candles[i].close - candles[i - 1].close;
            if (diff > 0) {
                avgGain = (avgGain * (this.rsiPeriod - 1) + diff) / this.rsiPeriod;
                avgLoss = (avgLoss * (this.rsiPeriod - 1)) / this.rsiPeriod;
            } else {
                avgGain = (avgGain * (this.rsiPeriod - 1)) / this.rsiPeriod;
                avgLoss = (avgLoss * (this.rsiPeriod - 1) - diff) / this.rsiPeriod;
            }
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    reconstruct(mtfCandles) {
        const candles = mtfCandles.fast || mtfCandles.intermediate || [];
        if (candles.length < 20) {
            return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA' };
        }

        const current = candles[candles.length - 1];
        const prevMom = candles[candles.length - 1 - this.momPeriod];

        // 1. Calculate Momentum (ROC - Rate of Change)
        const momentum = ((current.close - prevMom.close) / prevMom.close) * 100;

        // 2. Calculate RSI
        const rsi = this.calculateRSI(candles);

        let signal = 'flat';
        let confidence = 0;
        let narrative = 'MOMENTUM_NEUTRAL';

        // Buy condition: RSI is oversold (< 35) and momentum turns positive
        if (rsi < 35 && momentum > 0.05) {
            signal = 'long';
            confidence = Math.min(100, Math.round(50 + (35 - rsi) * 2 + momentum * 10));
            narrative = 'OVERSOLD_WITH_BULLISH_MOMENTUM';
        }
        // Sell condition: RSI is overbought (> 65) and momentum turns negative
        else if (rsi > 65 && momentum < -0.05) {
            signal = 'short';
            confidence = Math.min(100, Math.round(50 + (rsi - 65) * 2 - momentum * 10));
            narrative = 'OVERBOUGHT_WITH_BEARISH_MOMENTUM';
        }
        // Trend-Following Momentum Condition
        else if (momentum > 0.3 && rsi > 50 && rsi < 65) {
            signal = 'long';
            confidence = Math.min(100, Math.round(40 + momentum * 15));
            narrative = 'STRONG_BULLISH_MOMENTUM_BREAKOUT';
        }
        else if (momentum < -0.3 && rsi < 50 && rsi > 35) {
            signal = 'short';
            confidence = Math.min(100, Math.round(40 - momentum * 15));
            narrative = 'STRONG_BEARISH_MOMENTUM_BREAKOUT';
        }

        return {
            source: 'MOMENTUM_RSI_RECONSTRUCTION',
            signal,
            confidence,
            narrative
        };
    }
}
