import { test, expect, describe } from 'vitest';
import { TimeframeManager } from '../../../packages/lyzer-shared/src/smc/timeframeManager.js';

describe('TimeframeManager', () => {
    test('should initialize with empty caches', () => {
        const tf = new TimeframeManager();
        const state = tf.getMtfState();
        expect(state['1m']).toEqual([]);
        expect(state['5m']).toEqual([]);
        expect(state['15m']).toEqual([]);
        expect(state['1h']).toEqual([]);
        expect(state['4h']).toEqual([]);
    });

    test('should correctly aggregate 1m candles into 5m candles', () => {
        const tf = new TimeframeManager();
        
        // Generate 5 1m candles for the first 5-minute bucket (0 to 4 minutes)
        const baseTime = 0;
        const candles = [
            { open: 10, high: 15, low: 8, close: 12, volume: 100, openTime: baseTime, closed: true },
            { open: 12, high: 14, low: 11, close: 13, volume: 120, openTime: baseTime + 60000, closed: true },
            { open: 13, high: 16, low: 12, close: 15, volume: 130, openTime: baseTime + 120000, closed: true },
            { open: 15, high: 17, low: 14, close: 14, volume: 110, openTime: baseTime + 180000, closed: true },
            { open: 14, high: 18, low: 13, close: 16, volume: 150, openTime: baseTime + 240000, closed: true },
        ];

        for (const candle of candles) {
            tf.update(candle);
        }

        const closed5m = tf.getCandles('5m', 10, false);
        expect(closed5m.length).toBe(1);
        expect(closed5m[0]).toEqual({
            openTime: 0,
            timestamp: 0,
            open: 10,
            high: 18,
            low: 8,
            close: 16,
            volume: 610,
            closed: true
        });
    });

    test('should respect limit parameter', () => {
        const tf = new TimeframeManager();
        // Insert 6 closed 1m candles
        for (let i = 0; i < 6; i++) {
            tf.update({
                open: 10 + i,
                high: 12 + i,
                low: 9 + i,
                close: 11 + i,
                volume: 100,
                openTime: i * 60000,
                closed: true
            });
        }

        // Limit to 3 candles
        const candles = tf.getCandles('1m', 3, false);
        expect(candles.length).toBe(3);
        expect(candles[2].close).toBe(16);
    });

    test('should handle includeUnclosed parameter for 1m and higher timeframes', () => {
        const tf = new TimeframeManager();

        // 1. Add 5 closed 1m candles to form 1 completed 5m candle
        for (let i = 0; i < 5; i++) {
            tf.update({
                open: 10,
                high: 15,
                low: 9,
                close: 11,
                volume: 100,
                openTime: i * 60000,
                closed: true
            });
        }

        // 2. Add an unclosed 1m candle in the next bucket (minute 5, i.e. 300,000)
        tf.update({
            open: 12,
            high: 20,
            low: 10,
            close: 18,
            volume: 150,
            openTime: 300000,
            closed: false
        });

        // Test 1m includeUnclosed
        const m1Unclosed = tf.getCandles('1m', 10, true);
        expect(m1Unclosed.length).toBe(6); // 5 closed + 1 unclosed
        expect(m1Unclosed[5].closed).toBe(false);
        expect(m1Unclosed[5].high).toBe(20);

        const m1Closed = tf.getCandles('1m', 10, false);
        expect(m1Closed.length).toBe(5); // Only the closed ones

        // Test 5m includeUnclosed
        const m5Unclosed = tf.getCandles('5m', 10, true);
        expect(m5Unclosed.length).toBe(2); // 1 closed + 1 unclosed
        expect(m5Unclosed[0].closed).toBe(true);
        expect(m5Unclosed[1].closed).toBe(false);
        expect(m5Unclosed[1].openTime).toBe(300000);
        expect(m5Unclosed[1].high).toBe(20);
        expect(m5Unclosed[1].close).toBe(18);

        const m5Closed = tf.getCandles('5m', 10, false);
        expect(m5Closed.length).toBe(1); // Only the closed one
    });

    test('should handle out-of-order candles by rebuilding state', () => {
        const tf = new TimeframeManager();

        // Send candles at t=0, t=120000, t=60000
        tf.update({ open: 10, high: 12, low: 9, close: 11, volume: 100, openTime: 0, closed: true });
        tf.update({ open: 12, high: 14, low: 11, close: 13, volume: 100, openTime: 120000, closed: true });
        tf.update({ open: 11, high: 13, low: 10, close: 12, volume: 100, openTime: 60000, closed: true });

        const candles = tf.getCandles('1m', 10, false);
        expect(candles.length).toBe(3);
        // Should be sorted chronologically: 0, 60000, 120000
        expect(candles[0].openTime).toBe(0);
        expect(candles[1].openTime).toBe(60000);
        expect(candles[2].openTime).toBe(120000);
    });
});
