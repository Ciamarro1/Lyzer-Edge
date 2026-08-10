export class TapeReadingEngine {
    constructor(period = 20) {
        this.period = period;
    }

    calculateDelta(candle) {
        if (candle.high === candle.low) return 0;
        return candle.volume * ((candle.close - candle.open) / (candle.high - candle.low));
    }

    reconstruct(mtfCandles) {
        const candles = Array.isArray(mtfCandles) ? mtfCandles : (mtfCandles.fast || mtfCandles['1m'] || []);
        
        if (!candles || candles.length < this.period) {
            return { signal: 'NEUTRAL', confidence: 0, narrative: 'Insufficient data' };
        }

        // Last 20 candles for averages and swings
        const recent20 = candles.slice(-this.period);
        // Last 5 candles for Effort vs Result logs
        const last5 = recent20.slice(-5);
        const currentCandle = recent20[recent20.length - 1];

        // 1. Calculate the 'Effort vs Result' for the last 5 candles. 
        // Effort = Volume. Result = (Close - Open) body size.
        const effortResultLog = last5.map(c => ({
            effort: c.volume,
            result: Math.abs(c.close - c.open)
        }));

        const avgVolume = recent20.reduce((acc, c) => acc + c.volume, 0) / this.period;
        const avgBody = recent20.reduce((acc, c) => acc + Math.abs(c.close - c.open), 0) / this.period;

        const periodHigh = Math.max(...recent20.map(c => c.high));
        const periodLow = Math.min(...recent20.map(c => c.low));

        const range = periodHigh - periodLow;
        // Near swing high/low thresholds (within 10% of the recent range)
        const isNearSwingHigh = range > 0 ? currentCandle.high >= periodHigh - (range * 0.1) : currentCandle.high >= periodHigh;
        const isNearSwingLow = range > 0 ? currentCandle.low <= periodLow + (range * 0.1) : currentCandle.low <= periodLow;
        
        const isNewHigh = currentCandle.high >= periodHigh;
        const isNewLow = currentCandle.low <= periodLow;

        const volume = currentCandle.volume;
        const result = Math.abs(currentCandle.close - currentCandle.open);

        // CVD Calculation (last 10 candles)
        const last10 = recent20.slice(-10);
        let cvdAccumulator = 0;
        const cvdLog = last10.map(c => {
            cvdAccumulator += this.calculateDelta(c);
            return cvdAccumulator;
        });

        if (cvdLog.length > 1) {
            const previousCVDs = cvdLog.slice(0, -1);
            const currentCvdValue = cvdLog[cvdLog.length - 1];
            const lowestPrevCVD = Math.min(...previousCVDs);
            const highestPrevCVD = Math.max(...previousCVDs);

            const isCvdLowerLow = currentCvdValue < lowestPrevCVD;
            const isCvdHigherHigh = currentCvdValue > highestPrevCVD;

            if (isNewHigh && isCvdLowerLow) {
                return { signal: 'SHORT', confidence: 0.9, narrative: 'Bearish Divergence (Spoofing)', effortVsResult: effortResultLog };
            }
            if (isNewLow && isCvdHigherHigh) {
                return { signal: 'LONG', confidence: 0.9, narrative: 'Bullish Divergence (Spoofing)', effortVsResult: effortResultLog };
            }
        }

        // 2. Absorption: EXTREMELY HIGH Volume (> 2x avg), EXTREMELY SMALL Result (< 20% avg body)
        const isExtremelyHighVolume = volume > (2 * avgVolume);
        const isExtremelySmallResult = result < (0.2 * avgBody);

        if (isExtremelyHighVolume && isExtremelySmallResult) {
            if (isNearSwingLow) {
                return { signal: 'LONG', confidence: 0.85, narrative: 'Buy Absorption', effortVsResult: effortResultLog };
            }
            if (isNearSwingHigh) {
                return { signal: 'SHORT', confidence: 0.85, narrative: 'Sell Absorption', effortVsResult: effortResultLog };
            }
        }

        // 3. Exhaustion: New high/low but Volume is extremely low (< 50% avg vol)
        const isExtremelyLowVolume = volume < (0.5 * avgVolume);

        if (isExtremelyLowVolume) {
            if (isNewHigh) {
                return { signal: 'SHORT', confidence: 0.75, narrative: 'Exhaustion at High', effortVsResult: effortResultLog };
            }
            if (isNewLow) {
                return { signal: 'LONG', confidence: 0.75, narrative: 'Exhaustion at Low', effortVsResult: effortResultLog };
            }
        }

        return { signal: 'NEUTRAL', confidence: 0.0, narrative: 'No Clear Tape Setup', effortVsResult: effortResultLog };
    }
}
