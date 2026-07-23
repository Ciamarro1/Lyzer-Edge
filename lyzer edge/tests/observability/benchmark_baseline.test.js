import { describe, test, expect } from 'vitest';
import { StreamEngine } from '../../backend/streamEngine.js';
import { register } from '../../src/observability/index.js';
import { performance } from 'perf_hooks';

function generateCandle(index, basePrice = 50000) {
  const noise = (Math.random() - 0.5) * 10;
  const price = basePrice + noise;
  return {
    openTime: 1704067200000 + (index * 60000),
    open: price,
    high: price + 5,
    low: price - 5,
    close: price + 2,
    volume: 1.5,
    closed: true
  };
}

describe('Fase 5.1.5 — Production Baseline Validation & Load Benchmark', () => {
  test('Empirical Baseline Benchmark: Normal vs Extreme Burst Load', async () => {
    const engine = new StreamEngine({ mode: 'SIMULATION', symbol: 'BTCUSDT' });
    const iterations = 500;
    const durabilityTimes = [];

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const candle = generateCandle(i);
      engine.updateMtfCandles(candle);
      
      const t0 = performance.now();
      await engine.processCandle(candle, i);
      const t1 = performance.now();
      
      durabilityTimes.push(t1 - t0);
    }

    const totalDurationSec = (performance.now() - startTime) / 1000;
    const throughput = iterations / totalDurationSec;
    const endMemory = process.memoryUsage().heapUsed;

    // Calculate percentiles
    durabilityTimes.sort((a, b) => a - b);
    const p50 = durabilityTimes[Math.floor(durabilityTimes.length * 0.50)];
    const p95 = durabilityTimes[Math.floor(durabilityTimes.length * 0.95)];
    const p99 = durabilityTimes[Math.floor(durabilityTimes.length * 0.99)];

    console.log(`\n=== BENCHMARK RESULTS (FASE 5.1.5 BASELINE) ===`);
    console.log(`Total Ticks Processed : ${iterations}`);
    console.log(`Throughput            : ${throughput.toFixed(2)} ticks/sec`);
    console.log(`Latency P50           : ${p50.toFixed(3)} ms`);
    console.log(`Latency P95           : ${p95.toFixed(3)} ms`);
    console.log(`Latency P99           : ${p99.toFixed(3)} ms`);
    console.log(`V8 Heap Delta         : ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)} MB`);

    expect(throughput).toBeGreaterThan(50);
    expect(p50).toBeLessThan(10);
    expect(p99).toBeLessThan(50);

    const metricsStr = await register.metrics();
    expect(metricsStr).toContain('lyzer_pipeline_ticks_received_total');
    expect(metricsStr).toContain('lyzer_pipeline_tick_processing_duration_seconds');
  });
});
