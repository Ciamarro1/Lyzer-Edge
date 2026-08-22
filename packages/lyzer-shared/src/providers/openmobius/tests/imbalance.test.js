import { describe, it, expect } from 'vitest';
import { calc_atr, _fvg_mitigation_pct, find_fvgs, find_displacements, find_volume_anomalies } from '../imbalance.js';

function createCandles(data) {
    return data.map(d => ({
        open: d[0],
        high: d[1],
        low: d[2],
        close: d[3],
        volume: d[4] || 0,
        is_bullish: d[3] >= d[0]
    }));
}

describe('OpenMobius Imbalance module', () => {
    it('calc_atr', () => {
        const data = Array.from({ length: 15 }, (_, i) => [10, 15, 5, 12, 100]);
        const candles = createCandles(data);
        const atr = calc_atr(candles, 14);
        expect(atr).toBe(10);
    });

    it('find_fvgs', () => {
        const dummies = Array.from({ length: 14 }, () => [10, 11, 9, 10.5, 100]);
        const candles = createCandles([
            ...dummies,
            [10, 20, 5, 15, 100],
            [15, 25, 10, 22, 100],
            [22, 35, 25, 30, 100],
            [30, 32, 23, 31, 100]
        ]);
        const fvgs = find_fvgs(candles, 0.2);
        expect(fvgs.length).toBe(1);
        expect(fvgs[0].type).toBe('bullish_fvg');
        expect(fvgs[0].top).toBe(25);
        expect(fvgs[0].bottom).toBe(20);
        expect(fvgs[0].mitigation_pct).toBe(40.0);
    });

    it('find_displacements', () => {
        const dummies = Array.from({ length: 14 }, () => [10, 11, 9, 10, 100]);
        const candles = createCandles([
            ...dummies,
            [10, 30, 9, 28, 100]
        ]);
        const disps = find_displacements(candles, 2.0);
        expect(disps.length).toBe(1);
        expect(disps[0].direction).toBe('bullish');
    });

    it('find_volume_anomalies', () => {
        const dummies = Array.from({ length: 20 }, () => [10, 11, 9, 10, 100]);
        const candles = createCandles([
            ...dummies,
            [10, 11, 9, 10, 250]
        ]);
        const anoms = find_volume_anomalies(candles, 20, 2.0);
        expect(anoms.length).toBe(1);
        expect(anoms[0].volume_ratio).toBe(2.5);
    });
});
