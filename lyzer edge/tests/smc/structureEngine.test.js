import { test, expect, describe } from 'vitest';
import { StructureEngine } from '../../../packages/lyzer-shared/src/smc/structureEngine.js';

describe('StructureEngine', () => {
    const buildCandle = (high, low, open, close, timestamp) => ({
        open,
        high,
        low,
        close,
        volume: 100,
        timestamp: timestamp || Date.now(),
        closed: true
    });

    test('should return empty markers when timeframe manager has insufficient candles', () => {
        const engine = new StructureEngine();
        const mockTfManager = {
            getCandles: () => []
        };
        const result = engine.analyze(mockTfManager);
        expect(result.markers).toEqual([]);
        expect(result.range.high).toBe(0);
        expect(result.range.low).toBe(0);
    });

    test('should detect Swing High and Swing Low correctly', () => {
        const engine = new StructureEngine();

        // Construct 7 candles
        // Index 3 has a Swing High (high = 20, higher than indices 1, 2, 4, 5)
        // Index 4 has a Swing Low (low = 2, lower than indices 2, 3, 5, 6)
        const candles = [
            buildCandle(10, 5, 6, 8, 1000),
            buildCandle(12, 6, 7, 9, 2000),
            buildCandle(11, 7, 8, 10, 3000),
            buildCandle(20, 8, 10, 15, 4000), // Swing High at index 3
            buildCandle(10, 2, 8, 5, 5000),  // Swing Low at index 4
            buildCandle(12, 6, 6, 8, 6000),
            buildCandle(11, 7, 7, 9, 7000)
        ];

        const mockTfManager = {
            getCandles: (tf) => {
                if (tf === '15m') return candles;
                return [];
            }
        };

        const result = engine.analyze(mockTfManager);

        // Find Swing High marker
        const swingHigh = result.markers.find(m => m.type === 'SWING_HIGH');
        expect(swingHigh).toBeDefined();
        expect(swingHigh.price).toBe(20);
        expect(swingHigh.timestamp).toBe(4000);

        // Find Swing Low marker
        const swingLow = result.markers.find(m => m.type === 'SWING_LOW');
        expect(swingLow).toBeDefined();
        expect(swingLow.price).toBe(2);
        expect(swingLow.timestamp).toBe(5000);

        // Verify range high and low
        expect(result.range.high).toBe(20);
        expect(result.range.low).toBe(2);
    });

    test('should detect Bullish and Bearish Break of Structure (BOS)', () => {
        const engine = new StructureEngine();

        // 1. Setup a Swing High at index 2 (high = 15, preceding 0,1 are 10,12; succeeding 3,4 are 11,10)
        // 2. Candle at index 5 closes above 15, triggering BOS
        const candles = [
            buildCandle(10, 5, 6, 8, 1000),
            buildCandle(12, 6, 7, 9, 2000),
            buildCandle(15, 7, 8, 10, 3000), // Swing High
            buildCandle(11, 6, 8, 7, 4000),
            buildCandle(10, 5, 6, 7, 5000),
            buildCandle(18, 9, 10, 17, 6000) // Closes at 17, breaks Swing High (15) -> BULLISH BOS
        ];

        const mockTfManager = {
            getCandles: (tf) => candles
        };

        const result = engine.analyze(mockTfManager);

        // Check markers
        const bos = result.markers.find(m => m.type === 'BOS');
        expect(bos).toBeDefined();
        expect(bos.direction).toBe('BULLISH');
        expect(bos.price).toBe(15);
        expect(bos.timestamp).toBe(6000);
    });

    test('should detect Change of Character (CHOCH) on trend reversal', () => {
        const engine = new StructureEngine();

        // 1. Establish Bullish Trend via Bullish BOS
        // 2. Set up a Swing Low at index 4 (low = 5, preceding 2,3 are 7,6; succeeding 5,6 are 8,7)
        // 3. Candle at index 7 closes below the Swing Low (5), triggering BEARISH CHOCH
        const candles = [
            buildCandle(10, 5, 6, 8, 1000),
            buildCandle(12, 6, 7, 9, 2000),
            buildCandle(15, 7, 8, 10, 3000), // Swing High
            buildCandle(11, 6, 8, 7, 4000),
            buildCandle(12, 5, 6, 7, 5000), // Swing Low
            buildCandle(18, 8, 10, 17, 6000), // Closes at 17, breaks Swing High -> Bullish Trend established
            buildCandle(14, 7, 8, 9, 7000),
            buildCandle(10, 3, 8, 4, 8000)  // Closes at 4, breaks Swing Low (5) -> BEARISH CHOCH
        ];

        const mockTfManager = {
            getCandles: (tf) => candles
        };

        const result = engine.analyze(mockTfManager);

        // Verify CHOCH detection
        const choch = result.markers.find(m => m.type === 'CHOCH');
        expect(choch).toBeDefined();
        expect(choch.direction).toBe('BEARISH');
        expect(choch.price).toBe(5);
        expect(choch.timestamp).toBe(8000);
    });
});
