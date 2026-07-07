import { test, expect, describe } from 'vitest';
import { LiquidityEngine } from '../../../packages/lyzer-shared/src/smc/liquidityEngine.js';

describe('LiquidityEngine', () => {
    const buildCandle = (high, low, open, close, timestamp) => ({
        open,
        high,
        low,
        close,
        volume: 100,
        timestamp: timestamp || Date.now(),
        closed: true
    });

    test('should return empty results when timeframe manager has insufficient candles', () => {
        const engine = new LiquidityEngine();
        const mockTfManager = {
            getCandles: () => []
        };
        const result = engine.evaluate(mockTfManager, { markers: [], range: { high: 0, low: 0 } });
        expect(result.zones).toEqual([]);
        expect(result.sweep).toEqual({ swept: null, level: 0 });
    });

    test('should detect Bullish and Bearish Fair Value Gaps (FVG)', () => {
        const engine = new LiquidityEngine();

        // Bullish FVG: candles[0].high (10) < candles[2].low (12)
        // Bearish FVG: candles[3].low (18) > candles[5].high (15)
        const candles = [
            buildCandle(10, 5, 6, 8, 1000),   // 0
            buildCandle(14, 8, 9, 13, 2000),  // 1
            buildCandle(16, 12, 13, 15, 3000), // 2 (Bullish FVG formed at 3000 between 10 and 12)
            buildCandle(22, 18, 19, 21, 4000), // 3
            buildCandle(18, 14, 17, 15, 5000), // 4
            buildCandle(16, 10, 15, 11, 6000)  // 5 (Bearish FVG formed at 6000 between 18 and 16)
        ];

        const mockTfManager = {
            getCandles: () => candles
        };

        const result = engine.evaluate(mockTfManager, { markers: [], range: { high: 0, low: 0 } });

        // Find Bullish FVG
        const bullFvg = result.zones.find(z => z.type === 'FVG' && z.direction === 'BULLISH');
        expect(bullFvg).toBeDefined();
        expect(bullFvg.lower_bound).toBe(10);
        expect(bullFvg.upper_bound).toBe(12);
        expect(bullFvg.price).toBe(11);
        expect(bullFvg.created_at).toBe(3000);

        // Find Bearish FVG
        const bearFvg = result.zones.find(z => z.type === 'FVG' && z.direction === 'BEARISH');
        expect(bearFvg).toBeDefined();
        expect(bearFvg.lower_bound).toBe(16);
        expect(bearFvg.upper_bound).toBe(18);
        expect(bearFvg.price).toBe(17);
        expect(bearFvg.created_at).toBe(6000);
    });

    test('should track FVG mitigation accurately when price breaches bounds', () => {
        const engine = new LiquidityEngine();

        // 1. Bullish FVG formed at index 2 (bounds 10 to 12)
        // 2. Mitigated at index 4 (low = 9, which is <= 10)
        const candles = [
            buildCandle(10, 5, 6, 8, 1000),
            buildCandle(14, 8, 9, 13, 2000),
            buildCandle(16, 12, 13, 15, 3000), // FVG formed here (created_at = 3000)
            buildCandle(15, 11, 14, 12, 4000),
            buildCandle(13, 9, 12, 10, 5000)   // Mitigates FVG at 5000 (low 9 <= lower_bound 10)
        ];

        const mockTfManager = {
            getCandles: () => candles
        };

        const result = engine.evaluate(mockTfManager, { markers: [], range: { high: 0, low: 0 } });
        const fvg = result.zones.find(z => z.type === 'FVG');
        expect(fvg.mitigated).toBe(true);
    });

    test('should detect Order Blocks (OB) and mitigation', () => {
        const engine = new LiquidityEngine();

        // Bullish OB: candle 0 is bearish (close 7 < open 9), candle 1 is strong bullish (close 12 > high 10)
        // Mitigated at index 3 (low 5 <= lower_bound 6)
        const candles = [
            buildCandle(10, 6, 9, 7, 1000),   // Bullish OB candidate
            buildCandle(15, 8, 8, 12, 2000),  // Engulfing candle confirming OB
            buildCandle(14, 9, 12, 10, 3000),
            buildCandle(10, 5, 9, 6, 4000),   // Low 5 mitigates OB (bounds 6 to 10)
            buildCandle(10, 5, 9, 6, 5000)
        ];

        const mockTfManager = {
            getCandles: () => candles
        };

        const result = engine.evaluate(mockTfManager, { markers: [], range: { high: 0, low: 0 } });
        const ob = result.zones.find(z => z.type === 'OB' && z.direction === 'BULLISH');
        expect(ob).toBeDefined();
        expect(ob.lower_bound).toBe(6);
        expect(ob.upper_bound).toBe(10);
        expect(ob.mitigated).toBe(true);
    });

    test('should detect Equal Highs (EQH) and Equal Lows (EQL)', () => {
        const engine = new LiquidityEngine();

        // Mock swing highs at 100 and 100.04 (within 0.05% threshold)
        const markers = [
            { type: 'SWING_HIGH', direction: 'BULLISH', price: 100, timestamp: 1000 },
            { type: 'SWING_HIGH', direction: 'BULLISH', price: 100.04, timestamp: 2000 }
        ];

        const candles = [
            buildCandle(101, 95, 96, 98, 1000),
            buildCandle(101.5, 95, 97, 99, 2000),
            buildCandle(102, 95, 98, 100, 3000),
            buildCandle(102.5, 95, 99, 101, 4000),
            buildCandle(103, 95, 100, 102, 5000)
        ];

        const mockTfManager = {
            getCandles: () => candles
        };

        const result = engine.evaluate(mockTfManager, { markers });
        const eqh = result.zones.find(z => z.type === 'EQH');
        expect(eqh).toBeDefined();
        expect(eqh.lower_bound).toBe(100);
        expect(eqh.upper_bound).toBe(100.04);
    });

    test('should detect sweeps in recent price action and set sweep status', () => {
        const engine = new LiquidityEngine();

        // 1. Swing High at 100 (timestamp 1000)
        // 2. Last candle (index 4) has high = 101 (> 100) but close = 99 (<= 100) -> BSL Sweep!
        const markers = [
            { type: 'SWING_HIGH', direction: 'BULLISH', price: 100, timestamp: 1000 }
        ];

        const candles = [
            buildCandle(99, 90, 92, 95, 1000),
            buildCandle(98, 90, 95, 96, 2000),
            buildCandle(99, 90, 96, 95, 3000),
            buildCandle(98, 90, 95, 94, 4000),
            buildCandle(101, 90, 94, 99, 5000) // Last candle sweeps swing high at 100
        ];

        const mockTfManager = {
            getCandles: () => candles
        };

        const result = engine.evaluate(mockTfManager, { markers });

        // Verify SWEEP zone was created
        const sweepZone = result.zones.find(z => z.type === 'SWEEP');
        expect(sweepZone).toBeDefined();
        expect(sweepZone.direction).toBe('BEARISH');
        expect(sweepZone.price).toBe(100);

        // Verify return sweep object
        expect(result.sweep.swept).toBe('BSL');
        expect(result.sweep.level).toBe(100);
    });
});
