import { test, expect, describe } from 'vitest';
import { TrendEngine } from '../../../packages/lyzer-shared/src/smc/trendEngine.js';

describe('TrendEngine', () => {
    // Helper to generate candles with a specific trend
    function generateCandles(count, direction = 'BULLISH') {
        const candles = [];
        let price = 100;
        for (let i = 0; i < count; i++) {
            if (direction === 'BULLISH') {
                price += 1;
            } else if (direction === 'BEARISH') {
                price -= 1;
            }
            candles.push({
                open: price - 0.5,
                high: price + 1,
                low: price - 1,
                close: price,
                volume: 1000,
                timestamp: i * 3600000,
                closed: true
            });
        }
        return candles;
    }

    test('should return NEUTRAL when timeframe manager has no candles', () => {
        const engine = new TrendEngine();
        const mockTfManager = {
            getCandles: (tf, limit, includeUnclosed) => []
        };
        const result = engine.evaluate(mockTfManager);
        expect(result.bias).toBe('NEUTRAL');
        expect(result.strength).toBe(0);
    });

    test('should detect BULLISH bias when H4 and H1 both align bullish', () => {
        const engine = new TrendEngine();
        const h4Candles = generateCandles(50, 'BULLISH');
        const h1Candles = generateCandles(50, 'BULLISH');

        const mockTfManager = {
            getCandles: (tf, limit, includeUnclosed) => {
                if (tf === '4h') return h4Candles;
                if (tf === '1h') return h1Candles;
                return [];
            }
        };

        const result = engine.evaluate(mockTfManager);
        expect(result.bias).toBe('BULLISH');
        expect(result.strength).toBeGreaterThan(0);
        expect(result.strength).toBeLessThanOrEqual(100);
    });

    test('should detect BEARISH bias when H4 and H1 both align bearish', () => {
        const engine = new TrendEngine();
        const h4Candles = generateCandles(50, 'BEARISH');
        const h1Candles = generateCandles(50, 'BEARISH');

        const mockTfManager = {
            getCandles: (tf, limit, includeUnclosed) => {
                if (tf === '4h') return h4Candles;
                if (tf === '1h') return h1Candles;
                return [];
            }
        };

        const result = engine.evaluate(mockTfManager);
        expect(result.bias).toBe('BEARISH');
        expect(result.strength).toBeGreaterThan(0);
        expect(result.strength).toBeLessThanOrEqual(100);
    });

    test('should return NEUTRAL when H4 is BULLISH but H1 is BEARISH', () => {
        const engine = new TrendEngine();
        const h4Candles = generateCandles(50, 'BULLISH');
        const h1Candles = generateCandles(50, 'BEARISH');

        const mockTfManager = {
            getCandles: (tf, limit, includeUnclosed) => {
                if (tf === '4h') return h4Candles;
                if (tf === '1h') return h1Candles;
                return [];
            }
        };

        const result = engine.evaluate(mockTfManager);
        expect(result.bias).toBe('NEUTRAL');
        expect(result.strength).toBe(0);
    });

    test('should handle short candle lists and fallback to close comparison', () => {
        const engine = new TrendEngine();
        // Generate only 10 candles (less than the EMA 21 requirement)
        const h4Candles = generateCandles(10, 'BULLISH');
        const h1Candles = generateCandles(10, 'BULLISH');

        const mockTfManager = {
            getCandles: (tf, limit, includeUnclosed) => {
                if (tf === '4h') return h4Candles;
                if (tf === '1h') return h1Candles;
                return [];
            }
        };

        const result = engine.evaluate(mockTfManager);
        expect(result.bias).toBe('BULLISH');
        expect(result.strength).toBe(50); // Fallback returns 50 strength
    });
});
