import { OpenMobiusEngine } from '../../../packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js';
import { calc_atr, find_fvgs, find_displacements, find_volume_anomalies } from '../../../packages/lyzer-shared/src/providers/openmobius/imbalance.js';
import { find_order_blocks, calcAtr } from '../../../packages/lyzer-shared/src/providers/openmobius/orderBlocks.js';
import { find_sweeps } from '../../../packages/lyzer-shared/src/providers/openmobius/liquidity.js';
import { analyzeStructure } from '../../../packages/lyzer-shared/src/providers/openmobius/structure.js';
import { findSwings } from '../../../packages/lyzer-shared/src/providers/openmobius/pivots.js';
import { OpenMobiusShadowObserver } from '../../backend/openMobiusShadow.js';
import v8 from 'v8';

console.log("=================================================================");
console.log("   CHALLENGER 2: EMPIRICAL STRESS & ADVERSARIAL TEST HARNESS     ");
console.log("=================================================================\n");

let passedAll = true;
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        passedAll = false;
        throw new Error(message);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

// -------------------------------------------------------------
// TEST 1: IMMUTABILITY & PURITY (Zero in-place mutation of input)
// -------------------------------------------------------------
console.log("\n--- TEST 1: IMMUTABILITY OF INPUT CANDLES ---");
const engine = new OpenMobiusEngine();
const rawCandles = Array.from({ length: 100 }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + (i % 5),
    high: 105 + (i % 5),
    low: 95 + (i % 5),
    close: 102 + (i % 5),
    volume: 50 + (i % 20)
}));

// Clone deeply to detect any property mutations or additions
const frozenOriginal = JSON.parse(JSON.stringify(rawCandles));

// Freeze objects to throw if modified
rawCandles.forEach(c => Object.freeze(c));
let analyzeError = null;
try {
    const res = engine.analyze(rawCandles);
    assert(res !== null && typeof res === 'object', "Engine analyzed frozen candles successfully without mutating them");
} catch (e) {
    analyzeError = e;
}
assert(analyzeError === null, "Zero mutation errors on frozen candle objects");

// Check if properties match exactly
assert(JSON.stringify(rawCandles) === JSON.stringify(frozenOriginal), "Input candle array matches exact deep state after analysis");


// -------------------------------------------------------------
// TEST 2: BOUNDARY LENGTHS (0, 1, 2, 3, 4, 13, 14, 15 candles)
// -------------------------------------------------------------
console.log("\n--- TEST 2: BOUNDARY CANDLE SIZES ---");
const lengths = [0, 1, 2, 3, 4, 13, 14, 15, 50, 500];
for (const len of lengths) {
    const subset = frozenOriginal.slice(0, len);
    const res = engine.analyze(subset);
    assert(res.version === "8.0.0", `Engine handles len=${len} safely (bias: ${res.bias})`);
    assert(Array.isArray(res.marketStructure.sequence), `len=${len}: sequence is array`);
    assert(Array.isArray(res.imbalance.fvgs), `len=${len}: fvgs is array`);
    assert(Array.isArray(res.orderBlocks), `len=${len}: orderBlocks is array`);
}


// -------------------------------------------------------------
// TEST 3: EXTREME NUMERICAL VALUES & FLAT REGIMES
// -------------------------------------------------------------
console.log("\n--- TEST 3: EXTREME NUMERICAL & FLAT REGIME STRESS ---");

// Flat candles (0 volatility)
const flatCandles = Array.from({ length: 100 }, (_, i) => ({
    time: 1000 + i,
    open: 50000.0,
    high: 50000.0,
    low: 50000.0,
    close: 50000.0,
    volume: 0
}));
const flatRes = engine.analyze(flatCandles);
assert(flatRes.imbalance.fvgs.length === 0, "Flat candles produce 0 FVGs");
assert(flatRes.orderBlocks.length === 0, "Flat candles produce 0 OrderBlocks");
assert(flatRes.imbalance.displacements.length === 0, "Flat candles produce 0 Displacements");
assert(flatRes.imbalance.volumeAnomalies.length === 0, "Flat candles produce 0 Volume Anomalies");

// Microscopic prices (1e-8)
const microCandles = Array.from({ length: 50 }, (_, i) => ({
    time: 1000 + i,
    open: 0.00000010 + i * 0.00000001,
    high: 0.00000015 + i * 0.00000001,
    low: 0.00000008 + i * 0.00000001,
    close: 0.00000012 + i * 0.00000001,
    volume: 1000000
}));
const microRes = engine.analyze(microCandles);
assert(microRes.bias !== undefined, "Microscopic prices handled without NaN / crash");

// Huge prices (1e8)
const hugeCandles = Array.from({ length: 50 }, (_, i) => ({
    time: 1000 + i,
    open: 100000000 + i * 1000,
    high: 100005000 + i * 1000,
    low: 99995000 + i * 1000,
    close: 100002000 + i * 1000,
    volume: 10
}));
const hugeRes = engine.analyze(hugeCandles);
assert(hugeRes.bias !== undefined, "Huge prices handled without overflow");


// -------------------------------------------------------------
// TEST 4: HIGH-FREQUENCY TICK STREAMING MEMORY HARNESS
// -------------------------------------------------------------
console.log("\n--- TEST 4: HIGH FREQUENCY TICK STREAMING MEMORY STRESS ---");

if (global.gc) {
    global.gc();
}

const initialMem = process.memoryUsage();
const shadow = new OpenMobiusShadowObserver("BTCUSDT", "1m");

// Stream 20,000 synthetic ticks through OpenMobiusShadowObserver
let basePrice = 50000;
const tickCount = 20000;
const tStart = performance.now();

for (let i = 0; i < tickCount; i++) {
    const delta = (Math.sin(i * 0.05) + (Math.random() - 0.5)) * 10;
    const open = basePrice;
    const close = basePrice + delta;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    basePrice = close;

    shadow.observe({
        openTime: 1700000000000 + i * 60000,
        open,
        high,
        low,
        close,
        volume: 100 + Math.random() * 50
    });
}

const tElapsed = performance.now() - tStart;
const report = shadow.getShadowReport();

if (global.gc) {
    global.gc();
}
const finalMem = process.memoryUsage();

console.log(`Ticks processed: ${tickCount} in ${tElapsed.toFixed(2)}ms (${(tickCount / (tElapsed / 1000)).toFixed(0)} ticks/sec)`);
console.log(`v8 Latency p50: ${report.telemetry.v8Latency.p50}ms, p99: ${report.telemetry.v8Latency.p99}ms`);
console.log(`Tracker Latency p50: ${report.telemetry.trackerLatency.p50}ms, p99: ${report.telemetry.trackerLatency.p99}ms`);
console.log(`Initial Heap: ${(initialMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Final Heap: ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);

assert(report.stats.ticks === tickCount, "All 20,000 ticks processed by Shadow Observer");
assert(report.telemetry.v8Latency.p99 < 5.0, "V8 Engine p99 latency < 5.0ms (actual: " + report.telemetry.v8Latency.p99 + "ms)");


// -------------------------------------------------------------
// TEST 5: STANDALONE ZERO-ALLOCATION TICKS (100,000 iterations)
// -------------------------------------------------------------
console.log("\n--- TEST 5: ENGINE PURE 100,000 ITERATION ZERO-ALLOCATION RUN ---");

const testWindow = Array.from({ length: 500 }, (_, i) => ({
    time: 1000 + i * 60,
    open: 50000 + Math.sin(i * 0.1) * 200,
    high: 50000 + Math.sin(i * 0.1) * 200 + 50,
    low: 50000 + Math.sin(i * 0.1) * 200 - 50,
    close: 50000 + Math.sin((i + 1) * 0.1) * 200,
    volume: 100 + (i % 30),
    is_bullish: (i % 2 === 0)
}));

if (global.gc) {
    global.gc();
}

const memBefore100k = process.memoryUsage().heapUsed;
const t100kStart = performance.now();

for (let i = 0; i < 100000; i++) {
    // Modify the last candle in place without allocating new objects
    testWindow[499].close = 50000 + (i % 100);
    testWindow[499].is_bullish = testWindow[499].close >= testWindow[499].open;
    engine.analyze(testWindow);
}

const t100kElapsed = performance.now() - t100kStart;
if (global.gc) {
    global.gc();
}
const memAfter100k = process.memoryUsage().heapUsed;
const heapDeltaMb = (memAfter100k - memBefore100k) / 1024 / 1024;

console.log(`100,000 analyzes over 500-candle windows completed in ${t100kElapsed.toFixed(2)}ms (${(100000 / (t100kElapsed / 1000)).toFixed(0)} ops/sec)`);
console.log(`Heap Delta after GC: ${heapDeltaMb.toFixed(3)} MB`);

assert(heapDeltaMb < 10.0, "Heap growth after 100k iterations is negligible (< 10 MB)");
assert(t100kElapsed / 100000 < 0.1, `Average time per 500-candle analyze < 0.1ms (actual: ${(t100kElapsed / 100000).toFixed(4)}ms)`);

console.log("\n=================================================================");
console.log("       ALL EMPIRICAL CHALLENGER STRESS TESTS PASSED!             ");
console.log("=================================================================");
