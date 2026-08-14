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

        const isLastClosed = lastCandle.closed === true;
        const endIndex = isLastClosed ? n : n - 1;

        // Find starting index for new zones
        let startIndex = 1;
        if (this.lastProcessedTime > 0) {
            for (let i = endIndex - 1; i >= 0; i--) {
                const t = candles[i].openTime !== undefined ? candles[i].openTime : candles[i].timestamp;
                if (t <= this.lastProcessedTime) {
                    startIndex = i + 1;
                    break;
                }
            }
        }
        if (startIndex < 1) startIndex = 1;

        // 1 & 2. Detect FVGs and OBs on CLOSED candles
        for (let i = startIndex; i < endIndex; i++) {
            const prev1 = candles[i - 1];
            const curr = candles[i];
            const candleTime = curr.openTime !== undefined ? curr.openTime : curr.timestamp;

            // Bullish FVG (needs 3 candles: i-2, i-1, i)
            if (i >= 2) {
                const prev2 = candles[i - 2];
                if (prev2.high < curr.low) {
                    const gap = (curr.low - prev2.high) / prev2.high;
                    if (gap >= k_sigma * 0.5) {
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

        // 2.5 Detect EQH / EQL from market structure markers
        const eqhMarkers = (marketStructure && marketStructure.markers || []).filter(m => m.type === 'SWING_HIGH');
        for (let i = 0; i < eqhMarkers.length; i++) {
            for (let j = i + 1; j < eqhMarkers.length; j++) {
                const m1 = eqhMarkers[i];
                const m2 = eqhMarkers[j];
                const diff = Math.abs(m1.price - m2.price) / Math.max(m1.price, m2.price);
                if (diff <= 0.001) {
                    const lower = Math.min(m1.price, m2.price);
                    const upper = Math.max(m1.price, m2.price);
                    const id = `EQH_${m1.timestamp || 0}_${m2.timestamp || 0}`;
                    if (!this.activeZones.some(z => z.id === id) && !this.historicalZones.some(z => z.id === id)) {
                        this.activeZones.push({
                            id,
                            type: 'EQH',
                            direction: 'BEARISH',
                            price: (lower + upper) / 2,
                            lower_bound: lower,
                            upper_bound: upper,
                            timeframe,
                            strength: 1.0,
                            score: 1.0,
                            created_at: m2.timestamp || Date.now(),
                            mitigated: false,
                            source_pattern: 'EQH'
                        });
                    }
                }
            }
        }
        const eqlMarkers = (marketStructure && marketStructure.markers || []).filter(m => m.type === 'SWING_LOW');
        for (let i = 0; i < eqlMarkers.length; i++) {
            for (let j = i + 1; j < eqlMarkers.length; j++) {
                const m1 = eqlMarkers[i];
                const m2 = eqlMarkers[j];
                const diff = Math.abs(m1.price - m2.price) / Math.max(m1.price, m2.price);
                if (diff <= 0.001) {
                    const lower = Math.min(m1.price, m2.price);
                    const upper = Math.max(m1.price, m2.price);
                    const id = `EQL_${m1.timestamp || 0}_${m2.timestamp || 0}`;
                    if (!this.activeZones.some(z => z.id === id) && !this.historicalZones.some(z => z.id === id)) {
                        this.activeZones.push({
                            id,
                            type: 'EQL',
                            direction: 'BULLISH',
                            price: (lower + upper) / 2,
                            lower_bound: lower,
                            upper_bound: upper,
                            timeframe,
                            strength: 1.0,
                            score: 1.0,
                            created_at: m2.timestamp || Date.now(),
                            mitigated: false,
                            source_pattern: 'EQL'
                        });
                    }
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
                const candleTime = lastCandle.openTime !== undefined ? lastCandle.openTime : (lastCandle.timestamp || Date.now());
                const id = `SWEEP_BSL_${candleTime}`;
                if (!this.activeZones.some(z => z.id === id) && !this.historicalZones.some(z => z.id === id)) {
                    this.activeZones.push({
                        id,
                        type: 'SWEEP',
                        direction: 'BEARISH',
                        price: sh.price,
                        lower_bound: sh.price,
                        upper_bound: lastCandle.high,
                        timeframe,
                        strength: 1.0,
                        score: 1.0,
                        created_at: candleTime,
                        mitigated: false,
                        source_pattern: 'SWEEP_BSL'
                    });
                }
            }
        }
        for (const sl of swingLows) {
            if (lastCandle.low < sl.price && lastCandle.close >= sl.price) {
                sweep = { swept: 'SSL', level: sl.price };
                const candleTime = lastCandle.openTime !== undefined ? lastCandle.openTime : (lastCandle.timestamp || Date.now());
                const id = `SWEEP_SSL_${candleTime}`;
                if (!this.activeZones.some(z => z.id === id) && !this.historicalZones.some(z => z.id === id)) {
                    this.activeZones.push({
                        id,
                        type: 'SWEEP',
                        direction: 'BULLISH',
                        price: sl.price,
                        lower_bound: lastCandle.low,
                        upper_bound: sl.price,
                        timeframe,
                        strength: 1.0,
                        score: 1.0,
                        created_at: candleTime,
                        mitigated: false,
                        source_pattern: 'SWEEP_SSL'
                    });
                }
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

