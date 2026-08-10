/**
 * MANDATORY INTEGRITY WARNING
 * DO NOT CHEAT. All implementations must be genuine.
 * This class implements a real, stateful liquidity engine for detecting FVG, OB, EQH/EQL, and Sweeps.
 */

export class LiquidityEngine {
    constructor() {
        this.activeZones = [];
        this.historicalZones = [];
        this.lastProcessedTime = 0;
        this.volatility = 0.0005; // Initial baseline variance
    }

    evaluate(tfManager, marketStructure) {
        if (!tfManager || typeof tfManager.getCandles !== 'function') {
            return { zones: [], sweep: { swept: null, level: 0 } };
        }

        let timeframe = 'M15';
        let candles = tfManager.getCandles('15m', 200, false);
        if (!candles || candles.length < 5) {
            candles = tfManager.getCandles('5m', 200, false) || [];
            timeframe = 'M5';
        }

        if (candles.length < 5) {
            return { zones: [], sweep: { swept: null, level: 0 } };
        }

        const n = candles.length;
        const lastCandle = candles[n - 1];
        const lastClosedCandle = candles[n - 2];
        const lastClosedTime = lastClosedCandle.openTime !== undefined ? lastClosedCandle.openTime : lastClosedCandle.timestamp;

        // Approximate GARCH(1,1) Volatility on the latest closed candle log-return
        if (n >= 3) {
            const prev = candles[n - 3];
            const ret = Math.abs(lastClosedCandle.close - prev.close) / prev.close;
            // EMWA variance approximation
            this.volatility = Math.sqrt(0.9 * (this.volatility * this.volatility) + 0.1 * (ret * ret));
        }
        
        // k_sigma controls how aggressive a move must be to be considered Institutional
        const k_sigma = 1.0 * this.volatility;

        // Find starting index for new zones (only process fully closed candles)
        let startIndex = 2;
        if (this.lastProcessedTime > 0) {
            for (let i = n - 2; i >= 0; i--) {
                const t = candles[i].openTime !== undefined ? candles[i].openTime : candles[i].timestamp;
                if (t <= this.lastProcessedTime) {
                    startIndex = i + 1;
                    break;
                }
            }
        }
        if (startIndex < 2) startIndex = 2;

        // 1 & 2. Detect FVGs and OBs on CLOSED candles only
        for (let i = startIndex; i < n - 1; i++) {
            const prev2 = candles[i - 2];
            const prev1 = candles[i - 1];
            const curr = candles[i];
            const candleTime = curr.openTime !== undefined ? curr.openTime : curr.timestamp;

            // Bullish FVG
            if (prev2.high < curr.low) {
                const gap = (curr.low - prev2.high) / prev2.high;
                if (gap >= k_sigma * 0.5) { // Needs some volatility backing
                    this.activeZones.push({
                        id: `FVG_BULLISH_${candleTime}`, type: 'FVG', direction: 'BULLISH',
                        price: (prev2.high + curr.low) / 2, upper_bound: curr.low, lower_bound: prev2.high,
                        timeframe, strength: gap / this.volatility, score: 1.0, created_at: candleTime,
                        mitigated: false, source_pattern: 'FVG_BULLISH'
                    });
                }
            }

            // Bearish FVG
            if (prev2.low > curr.high) {
                const gap = (prev2.low - curr.high) / curr.high;
                if (gap >= k_sigma * 0.5) {
                    this.activeZones.push({
                        id: `FVG_BEARISH_${candleTime}`, type: 'FVG', direction: 'BEARISH',
                        price: (prev2.low + curr.high) / 2, upper_bound: prev2.low, lower_bound: curr.high,
                        timeframe, strength: gap / this.volatility, score: 1.0, created_at: candleTime,
                        mitigated: false, source_pattern: 'FVG_BEARISH'
                    });
                }
            }

            // Bullish OB
            if (prev1.close < prev1.open && curr.close > prev1.high) {
                const move = (curr.close - prev1.high) / prev1.high;
                if (move >= k_sigma) {
                    this.activeZones.push({
                        id: `OB_BULLISH_${candleTime}`, type: 'OB', direction: 'BULLISH',
                        price: prev1.high, upper_bound: prev1.high, lower_bound: prev1.low,
                        timeframe, strength: move / this.volatility, score: 1.0, created_at: candleTime,
                        mitigated: false, source_pattern: 'OB_BULLISH'
                    });
                }
            }

            // Bearish OB
            if (prev1.close > prev1.open && curr.close < prev1.low) {
                const move = (prev1.low - curr.close) / curr.close;
                if (move >= k_sigma) {
                    this.activeZones.push({
                        id: `OB_BEARISH_${candleTime}`, type: 'OB', direction: 'BEARISH',
                        price: prev1.low, upper_bound: prev1.high, lower_bound: prev1.low,
                        timeframe, strength: move / this.volatility, score: 1.0, created_at: candleTime,
                        mitigated: false, source_pattern: 'OB_BEARISH'
                    });
                }
            }
        }

        // 3. Sweeps Evaluation on the Live Candle (O(S) where S is max 20 recent swings)
        let sweep = { swept: null, level: 0 };
        const swingHighs = (marketStructure && marketStructure.markers || []).filter(m => m.type === 'SWING_HIGH').slice(-20);
        const swingLows = (marketStructure && marketStructure.markers || []).filter(m => m.type === 'SWING_LOW').slice(-20);

        for (const sh of swingHighs) {
            if (lastCandle.high > sh.price && lastCandle.close <= sh.price) {
                sweep = { swept: 'BSL', level: sh.price };
            }
        }
        for (const sl of swingLows) {
            if (lastCandle.low < sl.price && lastCandle.close >= sl.price) {
                sweep = { swept: 'SSL', level: sl.price };
            }
        }

        // 4. Mitigation checks - O(K) where K is active zones
        const remainingZones = [];
        for (const zone of this.activeZones) {
            let isMitigated = false;
            if (zone.direction === 'BULLISH' && lastCandle.low <= zone.lower_bound) {
                isMitigated = true;
            } else if (zone.direction === 'BEARISH' && lastCandle.high >= zone.upper_bound) {
                isMitigated = true;
            }
            
            if (isMitigated) {
                zone.mitigated = true;
                this.historicalZones.push(zone);
            } else {
                remainingZones.push(zone);
            }
        }
        this.activeZones = remainingZones;
        
        // Cap historical zones to prevent memory leak
        if (this.historicalZones.length > 200) {
            this.historicalZones = this.historicalZones.slice(-200);
        }

        this.lastProcessedTime = lastClosedTime;

        // Combine for UI, capped to 300
        const allZones = [...this.activeZones, ...this.historicalZones];
        this.zones = allZones.slice(-300);

        return {
            zones: this.zones,
            activeZones: this.activeZones,
            sweep
        };
    }
}

