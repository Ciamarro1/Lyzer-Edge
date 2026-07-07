/**
 * MANDATORY INTEGRITY WARNING
 * DO NOT CHEAT. All implementations must be genuine.
 * This class implements a real, stateful structure engine for detecting Fractals, BOS, and CHOCH.
 */

export class StructureEngine {
    constructor() {
        this.currentTrend = 'NEUTRAL';
        this.lastSwingHigh = null;
        this.lastSwingLow = null;
    }

    analyze(tfManager) {
        if (!tfManager || typeof tfManager.getCandles !== 'function') {
            return { markers: [], range: { high: 0, low: 0 } };
        }

        // Retrieve candles for intermediate timeframe: default to 15m, fallback to 5m
        let candles = tfManager.getCandles('15m', 500, false);
        if (!candles || candles.length < 5) {
            candles = tfManager.getCandles('5m', 500, false) || [];
        }

        if (candles.length < 5) {
            return { markers: [], range: { high: 0, low: 0 } };
        }

        const markers = [];
        const swingHighs = [];
        const swingLows = [];

        let lastHigh = null;
        let lastLow = null;
        let trend = 'NEUTRAL';

        const isSwingHigh = (i) => {
            if (i < 2 || i >= candles.length - 2) return false;
            const h = candles[i].high;
            return h > candles[i - 1].high &&
                   h > candles[i - 2].high &&
                   h > candles[i + 1].high &&
                   h > candles[i + 2].high;
        };

        const isSwingLow = (i) => {
            if (i < 2 || i >= candles.length - 2) return false;
            const l = candles[i].low;
            return l < candles[i - 1].low &&
                   l < candles[i - 2].low &&
                   l < candles[i + 1].low &&
                   l < candles[i + 2].low;
        };

        // Chronologically walk and evaluate structures
        for (let j = 2; j < candles.length; j++) {
            // A fractal is confirmed at index j-2 because we have indices j-1 and j
            if (j - 2 >= 2 && j - 2 < candles.length - 2) {
                const idx = j - 2;
                const candleTime = candles[idx].openTime !== undefined ? candles[idx].openTime : candles[idx].timestamp;

                if (isSwingHigh(idx)) {
                    lastHigh = {
                        price: candles[idx].high,
                        timestamp: candleTime,
                        index: idx
                    };
                    swingHighs.push(lastHigh);
                    markers.push({
                        type: 'SWING_HIGH',
                        direction: 'BULLISH',
                        price: candles[idx].high,
                        timestamp: candleTime
                    });
                }

                if (isSwingLow(idx)) {
                    lastLow = {
                        price: candles[idx].low,
                        timestamp: candleTime,
                        index: idx
                    };
                    swingLows.push(lastLow);
                    markers.push({
                        type: 'SWING_LOW',
                        direction: 'BEARISH',
                        price: candles[idx].low,
                        timestamp: candleTime
                    });
                }
            }

            // Check for breaks of the active swing high or low using close price
            const currentClose = candles[j].close;
            const currentTimestamp = candles[j].openTime !== undefined ? candles[j].openTime : candles[j].timestamp;

            if (lastHigh && currentClose > lastHigh.price) {
                const breakType = trend === 'BEARISH' ? 'CHOCH' : 'BOS';
                trend = 'BULLISH';
                markers.push({
                    type: breakType,
                    direction: 'BULLISH',
                    price: lastHigh.price,
                    timestamp: currentTimestamp
                });
                lastHigh = null; // Invalidate broken structure
            }

            if (lastLow && currentClose < lastLow.price) {
                const breakType = trend === 'BULLISH' ? 'CHOCH' : 'BOS';
                trend = 'BEARISH';
                markers.push({
                    type: breakType,
                    direction: 'BEARISH',
                    price: lastLow.price,
                    timestamp: currentTimestamp
                });
                lastLow = null; // Invalidate broken structure
            }
        }

        // Determine range high and low
        let rangeHigh = 0;
        let rangeLow = 0;

        if (swingHighs.length > 0) {
            rangeHigh = Math.max(...swingHighs.map(sh => sh.price));
        } else {
            rangeHigh = Math.max(...candles.map(c => c.high));
        }

        if (swingLows.length > 0) {
            rangeLow = Math.min(...swingLows.map(sl => sl.price));
        } else {
            rangeLow = Math.min(...candles.map(c => c.low));
        }

        this.currentTrend = trend;
        this.lastSwingHigh = lastHigh;
        this.lastSwingLow = lastLow;

        return {
            markers,
            range: {
                high: rangeHigh,
                low: rangeLow
            }
        };
    }
}
