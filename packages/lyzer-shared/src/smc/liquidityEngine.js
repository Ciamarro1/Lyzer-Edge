/**
 * MANDATORY INTEGRITY WARNING
 * DO NOT CHEAT. All implementations must be genuine.
 * This class implements a real, stateful liquidity engine for detecting FVG, OB, EQH/EQL, and Sweeps.
 */

export class LiquidityEngine {
    constructor() {
        this.zones = [];
    }

    evaluate(tfManager, marketStructure) {
        if (!tfManager || typeof tfManager.getCandles !== 'function') {
            return { zones: [], sweep: { swept: null, level: 0 } };
        }

        // Retrieve candles: default to 15m, fallback to 5m
        let timeframe = 'M15';
        let candles = tfManager.getCandles('15m', 500, false);
        if (!candles || candles.length < 5) {
            candles = tfManager.getCandles('5m', 500, false) || [];
            timeframe = 'M5';
        }

        if (candles.length < 5) {
            return { zones: [], sweep: { swept: null, level: 0 } };
        }

        const n = candles.length;
        const zones = [];

        // 1. Detect Fair Value Gaps (FVG)
        for (let i = 2; i < n; i++) {
            const prev2 = candles[i - 2];
            const curr = candles[i];
            const candleTime = curr.openTime !== undefined ? curr.openTime : curr.timestamp;

            // Bullish FVG: candle[i-2].high < candle[i].low
            if (prev2.high < curr.low) {
                zones.push({
                    id: `FVG_BULLISH_${candleTime}_${prev2.high.toFixed(4)}`,
                    type: 'FVG',
                    direction: 'BULLISH',
                    price: (prev2.high + curr.low) / 2,
                    upper_bound: curr.low,
                    lower_bound: prev2.high,
                    timeframe,
                    strength: 1.0,
                    score: 1.0,
                    created_at: candleTime,
                    mitigated: false,
                    source_pattern: 'FVG_BULLISH'
                });
            }

            // Bearish FVG: candle[i-2].low > candle[i].high
            if (prev2.low > curr.high) {
                zones.push({
                    id: `FVG_BEARISH_${candleTime}_${curr.high.toFixed(4)}`,
                    type: 'FVG',
                    direction: 'BEARISH',
                    price: (prev2.low + curr.high) / 2,
                    upper_bound: prev2.low,
                    lower_bound: curr.high,
                    timeframe,
                    strength: 1.0,
                    score: 1.0,
                    created_at: candleTime,
                    mitigated: false,
                    source_pattern: 'FVG_BEARISH'
                });
            }
        }

        // 2. Detect Order Blocks (OB)
        for (let i = 0; i < n - 1; i++) {
            const candle = candles[i];
            const nextCandle = candles[i + 1];
            const candleTime = candle.openTime !== undefined ? candle.openTime : candle.timestamp;

            // Bullish OB: last bearish candle (close < open) before a strong bullish move (nextCandle.close > candle.high)
            if (candle.close < candle.open && nextCandle.close > candle.high) {
                zones.push({
                    id: `OB_BULLISH_${candleTime}_${candle.high.toFixed(4)}`,
                    type: 'OB',
                    direction: 'BULLISH',
                    price: candle.high,
                    upper_bound: candle.high,
                    lower_bound: candle.low,
                    timeframe,
                    strength: 1.0,
                    score: 1.0,
                    created_at: candleTime,
                    mitigated: false,
                    source_pattern: 'OB_BULLISH'
                });
            }

            // Bearish OB: last bullish candle (close > open) before a strong bearish move (nextCandle.close < candle.low)
            if (candle.close > candle.open && nextCandle.close < candle.low) {
                zones.push({
                    id: `OB_BEARISH_${candleTime}_${candle.low.toFixed(4)}`,
                    type: 'OB',
                    direction: 'BEARISH',
                    price: candle.low,
                    upper_bound: candle.high,
                    lower_bound: candle.low,
                    timeframe,
                    strength: 1.0,
                    score: 1.0,
                    created_at: candleTime,
                    mitigated: false,
                    source_pattern: 'OB_BEARISH'
                });
            }
        }

        // Extract swing highs/lows from marketStructure for EQL/EQH and Sweeps
        const swingHighs = (marketStructure && marketStructure.markers || [])
            .filter(m => m.type === 'SWING_HIGH');
        const swingLows = (marketStructure && marketStructure.markers || [])
            .filter(m => m.type === 'SWING_LOW');

        // 3. Detect Equal Highs (EQH) and Equal Lows (EQL) — capped at 50 pairs each
        const MAX_EQ_PAIRS = 50;
        let eqhCount = 0, eqlCount = 0;
        // EQH
        for (let i = 0; i < swingHighs.length && eqhCount < MAX_EQ_PAIRS; i++) {
            for (let j = i + 1; j < swingHighs.length && eqhCount < MAX_EQ_PAIRS; j++) {
                const sh1 = swingHighs[i];
                const sh2 = swingHighs[j];
                const diff = Math.abs(sh1.price - sh2.price) / sh1.price;
                if (diff <= 0.0005) { // 0.05% threshold
                    const maxPrice = Math.max(sh1.price, sh2.price);
                    const minPrice = Math.min(sh1.price, sh2.price);
                    zones.push({
                        id: `EQH_${sh1.timestamp}_${sh2.timestamp}`,
                        type: 'EQH',
                        direction: 'BEARISH',
                        price: maxPrice,
                        upper_bound: maxPrice,
                        lower_bound: minPrice,
                        timeframe,
                        strength: 1.0,
                        score: 1.0,
                        created_at: sh2.timestamp,
                        mitigated: false,
                        source_pattern: 'EQH_PATTERN'
                    });
                    eqhCount++;
                }
            }
        }

        // EQL
        for (let i = 0; i < swingLows.length && eqlCount < MAX_EQ_PAIRS; i++) {
            for (let j = i + 1; j < swingLows.length && eqlCount < MAX_EQ_PAIRS; j++) {
                const sl1 = swingLows[i];
                const sl2 = swingLows[j];
                const diff = Math.abs(sl1.price - sl2.price) / sl1.price;
                if (diff <= 0.0005) { // 0.05% threshold
                    const maxPrice = Math.max(sl1.price, sl2.price);
                    const minPrice = Math.min(sl1.price, sl2.price);
                    zones.push({
                        id: `EQL_${sl1.timestamp}_${sl2.timestamp}`,
                        type: 'EQL',
                        direction: 'BULLISH',
                        price: minPrice,
                        upper_bound: maxPrice,
                        lower_bound: minPrice,
                        timeframe,
                        strength: 1.0,
                        score: 1.0,
                        created_at: sl2.timestamp,
                        mitigated: false,
                        source_pattern: 'EQL_PATTERN'
                    });
                    eqlCount++;
                }
            }
        }

        // 4. Detect Sweeps — OPTIMIZED O(n · k)
        // Track already-broken swings incrementally instead of re-scanning all prior candles
        const brokenBSL = new Set();
        const brokenSSL = new Set();

        for (let k = 2; k < n; k++) {
            const candle = candles[k];
            const candleTime = candle.openTime !== undefined ? candle.openTime : candle.timestamp;

            // Update broken sets: a swing is broken if any candle's close passed through it
            for (const sh of swingHighs) {
                if (brokenBSL.has(sh.timestamp)) continue;
                if (sh.timestamp >= candleTime) continue;
                if (candle.close > sh.price) {
                    brokenBSL.add(sh.timestamp);
                }
            }
            for (const sl of swingLows) {
                if (brokenSSL.has(sl.timestamp)) continue;
                if (sl.timestamp >= candleTime) continue;
                if (candle.close < sl.price) {
                    brokenSSL.add(sl.timestamp);
                }
            }

            // BSL Sweeps — only check swings NOT yet broken
            for (const sh of swingHighs) {
                if (sh.timestamp >= candleTime) continue;
                if (brokenBSL.has(sh.timestamp)) continue;
                if (candle.high > sh.price && candle.close <= sh.price) {
                    zones.push({
                        id: `SWEEP_BSL_${sh.timestamp}_${candleTime}`,
                        type: 'SWEEP',
                        direction: 'BEARISH',
                        price: sh.price,
                        upper_bound: candle.high,
                        lower_bound: sh.price,
                        timeframe,
                        strength: 1.0,
                        score: 1.0,
                        created_at: candleTime,
                        mitigated: false,
                        source_pattern: 'BSL_SWEEP'
                    });
                }
            }

            // SSL Sweeps
            for (const sl of swingLows) {
                if (sl.timestamp >= candleTime) continue;
                if (brokenSSL.has(sl.timestamp)) continue;
                if (candle.low < sl.price && candle.close >= sl.price) {
                    zones.push({
                        id: `SWEEP_SSL_${sl.timestamp}_${candleTime}`,
                        type: 'SWEEP',
                        direction: 'BULLISH',
                        price: sl.price,
                        upper_bound: sl.price,
                        lower_bound: candle.low,
                        timeframe,
                        strength: 1.0,
                        score: 1.0,
                        created_at: candleTime,
                        mitigated: false,
                        source_pattern: 'SSL_SWEEP'
                    });
                }
            }
        }

        // 5. Evaluate mitigation for all detected zones based on subsequent candles
        for (const zone of zones) {
            let startIndex = -1;
            for (let i = 0; i < n; i++) {
                const t = candles[i].openTime !== undefined ? candles[i].openTime : candles[i].timestamp;
                if (t > zone.created_at) {
                    startIndex = i;
                    break;
                }
            }

            if (startIndex !== -1) {
                for (let i = startIndex; i < n; i++) {
                    const c = candles[i];
                    if (zone.type === 'FVG' || zone.type === 'OB' || zone.type === 'SWEEP') {
                        if (zone.direction === 'BULLISH') {
                            if (c.low <= zone.lower_bound) {
                                zone.mitigated = true;
                                break;
                            }
                        } else if (zone.direction === 'BEARISH') {
                            if (c.high >= zone.upper_bound) {
                                zone.mitigated = true;
                                break;
                            }
                        }
                    } else if (zone.type === 'EQH') {
                        if (c.high >= zone.upper_bound) {
                            zone.mitigated = true;
                            break;
                        }
                    } else if (zone.type === 'EQL') {
                        if (c.low <= zone.lower_bound) {
                            zone.mitigated = true;
                            break;
                        }
                    }
                }
            }
        }

        // 6. Set sweep object for the most recent candle
        let sweep = { swept: null, level: 0 };
        const lastCandle = candles[n - 1];
        if (lastCandle) {
            const lastCandleTime = lastCandle.openTime !== undefined ? lastCandle.openTime : lastCandle.timestamp;
            const lastSweeps = zones.filter(z => z.type === 'SWEEP' && z.created_at === lastCandleTime);
            if (lastSweeps.length > 0) {
                const bsl = lastSweeps.find(z => z.direction === 'BEARISH');
                const ssl = lastSweeps.find(z => z.direction === 'BULLISH');
                if (bsl) {
                    sweep = { swept: 'BSL', level: bsl.price };
                } else if (ssl) {
                    sweep = { swept: 'SSL', level: ssl.price };
                }
            }
        }

        // Cap total zones at 300 max to prevent WebSocket payload bloat (Red Team finding)
        if (zones.length > 300) {
            zones.length = 300;
        }

        this.zones = zones;

        return {
            zones: this.zones,
            sweep
        };
    }
}
