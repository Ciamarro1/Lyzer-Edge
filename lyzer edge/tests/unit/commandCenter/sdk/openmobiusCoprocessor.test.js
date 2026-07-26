import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenMobiusEvidenceAdapter } from '../../../../src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusEvidenceAdapter.js';

describe('OpenMobius Cognitive Coprocessor Integration Suite', () => {
  let adapter;

  beforeEach(() => {
    adapter = new OpenMobiusEvidenceAdapter('BTCUSDT');
  });

  afterEach(() => {
    if (adapter) {
      adapter.dispose();
    }
  });

  it('should process a single candle and return a non-directional EvidenceContract payload', () => {
    const candle = {
      timestamp: 1700000000000,
      open: 50000,
      high: 50500,
      low: 49800,
      close: 50300,
      volume: 120
    };

    const evidence = adapter.processCandle(candle);

    expect(evidence).toBeDefined();
    expect(evidence.sourceEngine).toBe('OPENMOBIUS_EVIDENCE_ENGINE');
    expect(evidence.provenance.realityTag).toBe('INFERRED_REALITY');
    expect(evidence.evidenceMetrics.confidence).toBeGreaterThanOrEqual(0);
    expect(evidence.evidenceMetrics.uncertainty).toBeGreaterThanOrEqual(0);
    expect(evidence).not.toHaveProperty('side');
    expect(evidence).not.toHaveProperty('action');
    expect(evidence).not.toHaveProperty('buy');
    expect(evidence).not.toHaveProperty('sell');
  });

  it('should process 10,000 continuous candles with ultra-high throughput (> 20,000 c/s)', () => {
    const startTime = performance.now();
    const count = 10000;
    let basePrice = 50000;

    for (let i = 0; i < count; i++) {
      const delta = (Math.random() - 0.49) * 100;
      basePrice += delta;
      const candle = {
        timestamp: 1700000000000 + i * 60000,
        open: basePrice,
        high: basePrice + Math.abs(delta) + 10,
        low: basePrice - Math.abs(delta) - 10,
        close: basePrice + delta * 0.5,
        volume: 100 + i
      };
      const evidence = adapter.processCandle(candle);
      expect(evidence).toBeDefined();
    }

    const durationMs = performance.now() - startTime;
    const candlesPerSec = (count / durationMs) * 1000;

    console.log(`OpenMobius Coprocessor Performance: ${count} candles in ${durationMs.toFixed(2)}ms (${candlesPerSec.toFixed(0)} candles/sec)`);

    expect(candlesPerSec).toBeGreaterThan(20000);
  });

  it('should enforce TC39 Disposable pattern and reject operations after disposal', () => {
    adapter.dispose();
    expect(() => {
      adapter.processCandle({ open: 1, high: 2, low: 1, close: 1.5, timestamp: 1 });
    }).toThrow('ERR_COPROCESSOR_DISPOSED');
  });
});
