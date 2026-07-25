/**
 * @file commandCenter_m1_3.benchmark.js
 * Lyzer Edge Command Center V2 — Benchmark script for M1.3.
 */

import { StreamBuffer, Priority } from '../../src/components/commandCenter/sdk/StreamBuffer.js';
import { RenderScheduler } from '../../src/components/commandCenter/sdk/RenderScheduler.js';
import { NodeClock } from '../../src/components/commandCenter/sdk/Clock.js';
import { FrameMetricsCollector } from '../../src/components/commandCenter/sdk/FrameMetricsCollector.js';
import { performance } from 'perf_hooks'; // Node built-in for accurate timings
import v8 from 'v8';

const BENCHMARK_DURATION_MS = 5000;
const EVENTS_PER_SECOND = 20000; // Stress test (we want >= 1500)
const BATCH_SIZE = Math.floor(EVENTS_PER_SECOND / 60);

const sb = new StreamBuffer({ maxCapacity: 50000 });
const clock = new NodeClock(60); // 60 FPS
const scheduler = new RenderScheduler({
  streamBuffer: sb,
  clock,
  frameBudgetMs: 16.6,
  maxBatchSize: 5000
});

const collector = new FrameMetricsCollector(scheduler);

let processedCount = 0;
scheduler.registerProcessor((ev) => {
  processedCount++;
});

console.log('=============================================');
console.log('   M1.3 Benchmark: RingBuffer & Scheduler    ');
console.log('=============================================');
console.log(`Injecting ~${EVENTS_PER_SECOND} events/sec for ${BENCHMARK_DURATION_MS}ms...`);

scheduler.start();
collector.reset();

const heapStart = process.memoryUsage().heapUsed;

const injectionInterval = setInterval(() => {
  for (let i = 0; i < BATCH_SIZE; i++) {
    const priority = Math.random() > 0.9 ? Priority.HIGH : (Math.random() > 0.5 ? Priority.NORMAL : Priority.LOW);
    // Coalescing simulated by limiting source/topics to 1000 combinations
    const id = Math.floor(Math.random() * 1000);
    sb.enqueue({
      source: `src_${id}`,
      topic: 'price',
      timestamp: performance.now(),
      priority,
      payload: { price: 100 + id }
    });
  }
}, 1000 / 60); // Inject every ~16ms

setTimeout(() => {
  clearInterval(injectionInterval);
  scheduler.stop();
  
  const heapEnd = process.memoryUsage().heapUsed;
  const heapDiffMB = (heapEnd - heapStart) / 1024 / 1024;
  
  const snap = collector.getSnapshot();
  
  console.log('\n--- MCR OBJECTIVE TARGETS ---');
  console.log(`Throughput:          ${snap.throughput.toFixed(2)} events/s (Target: >= 1500)`);
  console.log(`Avg Frame Time:      ${snap.avgFrameTimeMs.toFixed(2)} ms (Target: <= 16.6ms)`);
  console.log(`Max Frame Time:      ${snap.maxFrameTimeMs.toFixed(2)} ms (Jitter)`);
  console.log(`Dropped Frames:      ${snap.droppedRatio.toFixed(2)}% (Target: < 1%)`);
  console.log(`Heap Diff:           ${heapDiffMB.toFixed(2)} MB`);
  
  console.log('\n--- STREAM BUFFER METRICS ---');
  console.log(`Coalesced Events:    ${snap.coalescedEvents}`);
  console.log(`Dropped LOW:         ${snap.droppedLow}`);
  console.log(`Dropped NORMAL:      ${snap.droppedNormal}`);
  console.log(`Degraded Mode Hits:  ${snap.degradedActivations}`);
  console.log(`Final Backlog:       ${snap.backlog} events left`);
  
  // Validation
  let passed = true;
  if (snap.throughput < 1500) { console.error('❌ FAILED: Throughput < 1500'); passed = false; }
  if (snap.avgFrameTimeMs > 16.6) { console.error('❌ FAILED: Avg Frame Time > 16.6ms'); passed = false; }
  if (snap.droppedRatio > 1) { console.error('❌ FAILED: Dropped Frames > 1%'); passed = false; }
  
  if (passed) {
    console.log('\n✅ MCR BENCHMARK PASSED (100%)');
    process.exit(0);
  } else {
    console.log('\n❌ MCR BENCHMARK FAILED');
    process.exit(1);
  }
}, BENCHMARK_DURATION_MS);
