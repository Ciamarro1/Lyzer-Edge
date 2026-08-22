import { OpenMobiusEngine } from '../v8_openmobius.js';

describe('OpenMobiusEngine Parity Test', () => {
    it('analyze() returns expected structural properties', () => {
        const engine = new OpenMobiusEngine();
        const mockCandles = [
            { time: 1000, open: 10, high: 15, low: 8, close: 12 },
            { time: 2000, open: 12, high: 18, low: 11, close: 17 }
        ];

        const state = engine.analyze(mockCandles);

        expect(state).toHaveProperty('version', '8.0.0');
        expect(state).toHaveProperty('bias', 'FLAT');
        expect(state).toHaveProperty('marketStructure');
        expect(state).toHaveProperty('liquidity');
        expect(state).toHaveProperty('imbalance');
        expect(state).toHaveProperty('orderBlocks');
        expect(state).toHaveProperty('location');
        expect(state).toHaveProperty('pivots');
    });
});
