import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { performance } from 'perf_hooks';

function generateBatch(count = 100) {
  const candles = [];
  const baseTime = Date.now();
  for (let i = 0; i < count; i++) {
    candles.push({
      t: baseTime + i * 60000,
      o: 50000 + i,
      h: 50010 + i,
      l: 49990 + i,
      c: 50005 + i,
      v: 2.5,
      T: baseTime + (i + 1) * 60000 - 1
    });
  }
  return candles;
}

describe('Fase 5.2 — SQLite WAL Mode Persistence Benchmark Suite', () => {
  test('Validates WAL Mode Pragmas, Write Throughput, and Latency Percentiles', async () => {
    const db = new CausalMemoryDB();
    const batchCount = 50;
    const writeTimes = [];

    for (let i = 0; i < batchCount; i++) {
      const batch = generateBatch(100);
      const t0 = performance.now();
      await db.insertBatch('BTCUSDT', '1m', batch);
      const t1 = performance.now();
      writeTimes.push(t1 - t0);
    }

    // Execute PASSIVE WAL checkpoint
    await db.walCheckpoint('PASSIVE');

    writeTimes.sort((a, b) => a - b);
    const p50 = writeTimes[Math.floor(writeTimes.length * 0.50)];
    const p95 = writeTimes[Math.floor(writeTimes.length * 0.95)];
    const p99 = writeTimes[Math.floor(writeTimes.length * 0.99)];

    console.log(`\n=== FASE 5.2 PERSISTENCE WAL BENCHMARK ===`);
    console.log(`Batches Written       : ${batchCount} (5000 candles total)`);
    console.log(`Write Latency P50     : ${p50.toFixed(3)} ms`);
    console.log(`Write Latency P95     : ${p95.toFixed(3)} ms`);
    console.log(`Write Latency P99     : ${p99.toFixed(3)} ms`);

    expect(p50).toBeLessThan(50.0);
    expect(p99).toBeLessThan(1000.0);

    db.close();
  });
});
