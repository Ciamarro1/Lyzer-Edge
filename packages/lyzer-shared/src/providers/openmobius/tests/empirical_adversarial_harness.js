import { OpenMobiusEngine } from '../v8_openmobius.js';
import { calc_atr, find_fvgs, find_displacements, find_volume_anomalies, _fvg_mitigation_pct } from '../imbalance.js';
import { calcAtr, find_order_blocks } from '../orderBlocks.js';
import { find_sweeps } from '../liquidity.js';
import { analyzeStructure } from '../structure.js';
import { findSwings } from '../pivots.js';
import { analyze_dealing_range } from '../location.js';
import { OpenMobiusShadowObserver } from '../../../../../../lyzer edge/backend/openMobiusShadow.js';
import crypto from 'crypto';

console.log('===============================================================');
console.log('   EMPIRICAL ADVERSARIAL STRESS HARNESS — OPEN MOBIUS V8       ');
console.log('===============================================================');

const engine = new OpenMobiusEngine();
let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, description) {
    if (condition) {
        passCount++;
        console.log(`  [PASS] ${description}`);
    } else {
        failCount++;
        failures.push(description);
        console.error(`  [FAIL] ${description}`);
    }
}

// -----------------------------------------------------------------------------
// SUITE 1: Extreme Feed Shapes & Edge Cases
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 1: Extreme Feed Shapes & Empty/Sparse Feeds ---');

// 1.1 Null / Undefined / Empty
const nullRes = engine.analyze(null);
assert(nullRes && nullRes.bias === 'FLAT' && Array.isArray(nullRes.orderBlocks) && nullRes.orderBlocks.length === 0, 'engine.analyze(null) returns empty state');

const undefRes = engine.analyze(undefined);
assert(undefRes && undefRes.bias === 'FLAT' && Array.isArray(undefRes.pivots) && undefRes.pivots.length === 0, 'engine.analyze(undefined) returns empty state');

const emptyRes = engine.analyze([]);
assert(emptyRes && emptyRes.bias === 'FLAT' && emptyRes.marketStructure.sequence.length === 0, 'engine.analyze([]) returns empty state');

// 1.2 Single candle & small lengths (1 to 20)
for (let len = 1; len <= 20; len++) {
    const miniFeed = [];
    for (let i = 0; i < len; i++) {
        miniFeed.push({
            open: 100 + i,
            high: 105 + i,
            low: 95 + i,
            close: 102 + i,
            volume: 50 + i * 10
        });
    }
    const res = engine.analyze(miniFeed);
    assert(res && typeof res.bias === 'string' && Array.isArray(res.imbalance.fvgs), `engine.analyze(candles.length=${len}) runs safely without crash`);
}

// 1.3 Missing `is_bullish` property check & non-mutation check
const rawCandles = [
    { open: 100, high: 110, low: 90, close: 105, volume: 100 },
    { open: 105, high: 115, low: 95, close: 100, volume: 150 },
    { open: 100, high: 120, low: 90, close: 115, volume: 200 },
    { open: 115, high: 130, low: 110, close: 125, volume: 250 },
    { open: 125, high: 135, low: 120, close: 130, volume: 300 }
];
const rawSnapshot = JSON.stringify(rawCandles);
const resRaw = engine.analyze(rawCandles);
assert(resRaw && resRaw.bias !== undefined, 'Raw candles without `is_bullish` analyzed cleanly');
assert(JSON.stringify(rawCandles) === rawSnapshot, 'Input candles array and objects are NOT mutated in-place');

// -----------------------------------------------------------------------------
// SUITE 2: Degenerate & Extreme Market Conditions
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Degenerate & Extreme Market Conditions ---');

// 2.1 Zero volatility (flat-line market: high == low == open == close)
const flatCandles = Array.from({ length: 50 }, (_, i) => ({
    open: 100.0,
    high: 100.0,
    low: 100.0,
    close: 100.0,
    volume: 0
}));
const flatRes = engine.analyze(flatCandles);
assert(flatRes && flatRes.imbalance.fvgs.length === 0, 'Flat zero-volatility feed produces 0 FVGs');
assert(flatRes.imbalance.displacements.length === 0, 'Flat zero-volatility feed produces 0 displacements');
assert(flatRes.imbalance.volumeAnomalies.length === 0, 'Flat zero-volume feed produces 0 volume anomalies');
assert(flatRes.orderBlocks.length === 0, 'Flat zero-volatility feed produces 0 order blocks');

// 2.2 Extreme micro prices (e.g. 1e-8 Satoshi / subnormal floats)
const microCandles = Array.from({ length: 50 }, (_, i) => ({
    open: 0.00000010 + i * 0.00000001,
    high: 0.00000015 + i * 0.00000001,
    low: 0.00000008 + i * 0.00000001,
    close: 0.00000012 + i * 0.00000001,
    volume: 1000000
}));
const microRes = engine.analyze(microCandles);
assert(microRes && !Number.isNaN(microRes.location.equilibrium), 'Micro-price feed evaluates without NaN');

// 2.3 Extreme macro prices (e.g. 1e12 Hyperinflation / Large floats)
const macroCandles = Array.from({ length: 50 }, (_, i) => ({
    open: 1e12 + i * 1e10,
    high: 1e12 + i * 1e10 + 5e9,
    low: 1e12 + i * 1e10 - 5e9,
    close: 1e12 + i * 1e10 + 2e9,
    volume: 500
}));
const macroRes = engine.analyze(macroCandles);
assert(macroRes && !Number.isNaN(macroRes.location.equilibrium), 'Macro-price feed (1e12) evaluates without NaN');

// 2.4 Negative prices (e.g. WTI Crude negative futures anomaly)
const negativeCandles = Array.from({ length: 50 }, (_, i) => ({
    open: -37.0 + i * 0.5,
    high: -35.0 + i * 0.5,
    low: -40.0 + i * 0.5,
    close: -36.5 + i * 0.5,
    volume: 1000
}));
const negRes = engine.analyze(negativeCandles);
assert(negRes && typeof negRes.bias === 'string', 'Negative price feed evaluates safely');

// 2.5 Flash crash & 1000x gap
const flashCrashCandles = Array.from({ length: 50 }, (_, i) => {
    if (i === 25) {
        return { open: 50000, high: 50000, low: 100, close: 150, volume: 1000000 };
    }
    if (i === 26) {
        return { open: 150, high: 51000, low: 120, close: 50500, volume: 2000000 };
    }
    return { open: 50000, high: 50100, low: 49900, close: 50000, volume: 1000 };
});
const flashRes = engine.analyze(flashCrashCandles);
assert(flashRes && flashRes.imbalance.displacements.length > 0, 'Flash crash correctly detects displacement');

// -----------------------------------------------------------------------------
// SUITE 3: Direct Component Adversarial Parameter Testing
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Direct Component Adversarial Parameter Testing ---');

// 3.1 calc_atr boundary checks
assert(calc_atr(null) === null, 'calc_atr(null) returns null');
assert(calc_atr([]) === null, 'calc_atr([]) returns null');
assert(calc_atr([{ close: 10, high: 12, low: 8 }]) === null, 'calc_atr([1]) returns null (len < period + 1)');
assert(calcAtr(null) === null, 'calcAtr(null) returns null');

// 3.2 _fvg_mitigation_pct zero size & boundary
assert(_fvg_mitigation_pct(100, 100, 'bullish_fvg', rawCandles, 0) === 0.0, '_fvg_mitigation_pct size<=0 returns 0.0');
assert(_fvg_mitigation_pct(100, 110, 'bullish_fvg', rawCandles, 0) === 0.0, '_fvg_mitigation_pct top < bot returns 0.0');
assert(_fvg_mitigation_pct(110, 100, 'bullish_fvg', rawCandles, 10) === 0.0, '_fvg_mitigation_pct formed_at out-of-bounds returns 0.0');

// 3.3 find_volume_anomalies lookback
assert(find_volume_anomalies([], 20).length === 0, 'find_volume_anomalies([]) returns empty array');
assert(find_volume_anomalies(rawCandles, 20).length === 0, 'find_volume_anomalies(n < lookback + 1) returns empty array');

// 3.4 analyzeStructure with degenerate swings
assert(analyzeStructure(null).sequence.length === 0, 'analyzeStructure(null) returns empty');
assert(analyzeStructure([]).sequence.length === 0, 'analyzeStructure([]) returns empty');
assert(analyzeStructure([{ index: 1, price: 10, kind: 'high' }]).sequence.length === 0, 'analyzeStructure(len < 3) returns empty');

// -----------------------------------------------------------------------------
// SUITE 4: High-Frequency Tick Streaming (10,000 Ticks x 500 Candles = 5,000,000 Evaluations)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: High-Frequency Tick Streaming (10,000 Ticks) ---');

const STREAM_TICKS = 10000;
const historyWindow = [];
const maxHist = 500;

// Pre-fill history to 500
for (let i = 0; i < maxHist; i++) {
    historyWindow.push({
        open: 100 + Math.sin(i * 0.1) * 10,
        high: 105 + Math.sin(i * 0.1) * 10,
        low: 95 + Math.sin(i * 0.1) * 10,
        close: 101 + Math.sin(i * 0.1) * 10,
        volume: 100 + (i % 20) * 10,
        is_bullish: true
    });
}

const memBefore = process.memoryUsage().heapUsed;
const tStart = performance.now();

for (let tick = 0; tick < STREAM_TICKS; tick++) {
    const prev = historyWindow[historyWindow.length - 1];
    const delta = (Math.random() - 0.49) * 2;
    const newClose = prev.close + delta;
    const newCandle = {
        open: prev.close,
        high: Math.max(prev.close, newClose) + Math.random(),
        low: Math.min(prev.close, newClose) - Math.random(),
        close: newClose,
        volume: Math.floor(50 + Math.random() * 200),
        is_bullish: newClose >= prev.close
    };
    
    historyWindow.push(newCandle);
    if (historyWindow.length > maxHist) {
        historyWindow.shift();
    }

    // Engine analyze in hot path
    const state = engine.analyze(historyWindow);
    if (tick % 2500 === 0) {
        if (!state || !state.bias) {
            failCount++;
            console.error(`  [FAIL] Tick ${tick} returned invalid state`);
        }
    }
}

const tElapsed = performance.now() - tStart;
const memAfter = process.memoryUsage().heapUsed;
const heapGrowthMb = (memAfter - memBefore) / (1024 * 1024);
const ticksPerSec = Math.round((STREAM_TICKS / (tElapsed / 1000)));
const candlesPerSec = ticksPerSec * maxHist;

console.log(`  Processed ${STREAM_TICKS} ticks (500 candles each) in ${tElapsed.toFixed(2)}ms`);
console.log(`  Tick Throughput: ${ticksPerSec.toLocaleString()} ticks/sec`);
console.log(`  Candle Evaluation Throughput: ${candlesPerSec.toLocaleString()} candles/sec`);
console.log(`  Heap delta over 10k ticks: ${heapGrowthMb.toFixed(2)} MB`);

assert(tElapsed < 10000, `High frequency processing 10k ticks completed in ${tElapsed.toFixed(2)}ms (< 10000ms)`);
assert(heapGrowthMb < 30, `Heap growth after 10k ticks is controlled: ${heapGrowthMb.toFixed(2)}MB (< 30MB)`);

// -----------------------------------------------------------------------------
// SUITE 5: OpenMobiusShadowObserver Live Integration Stress
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: OpenMobiusShadowObserver Live Simulation ---');

const shadowObserver = new OpenMobiusShadowObserver('BTCUSDT', '1m');
const SHADOW_TICKS = 2000;

for (let tick = 0; tick < SHADOW_TICKS; tick++) {
    const price = 50000 + Math.sin(tick * 0.05) * 500 + (Math.random() - 0.5) * 50;
    shadowObserver.observe({
        openTime: 1700000000000 + tick * 60000,
        open: price,
        high: price + Math.random() * 20,
        low: price - Math.random() * 20,
        close: price + (Math.random() - 0.5) * 15,
        volume: 100 + Math.random() * 500
    });
}

const shadowReport = shadowObserver.getShadowReport();
console.log(`  Shadow Observer Ticks: ${shadowReport.stats.ticks}`);
console.log(`  Transitions Generated: ${shadowReport.stats.transitionsGenerated}`);
console.log(`  V8 Latency p50: ${shadowReport.telemetry.v8Latency.p50}ms, p95: ${shadowReport.telemetry.v8Latency.p95}ms, p99: ${shadowReport.telemetry.v8Latency.p99}ms, max: ${shadowReport.telemetry.v8Latency.max}ms`);
console.log(`  Tracker Latency p50: ${shadowReport.telemetry.trackerLatency.p50}ms, p99: ${shadowReport.telemetry.trackerLatency.p99}ms`);
console.log(`  Total Latency p50: ${shadowReport.telemetry.totalLatency.p50}ms, p99: ${shadowReport.telemetry.totalLatency.p99}ms`);
console.log(`  Heap growth: ${shadowReport.telemetry.heapGrowthMb}MB`);

assert(shadowReport.stats.ticks === SHADOW_TICKS, `Shadow observer recorded all ${SHADOW_TICKS} ticks`);
assert(shadowReport.telemetry.v8Latency.p99 < 5.0, `V8 Engine p99 latency is ${shadowReport.telemetry.v8Latency.p99}ms (< 5.0ms)`);
assert(shadowReport.telemetry.totalLatency.p99 < 10.0, `Total Shadow Pipeline p99 latency is ${shadowReport.telemetry.totalLatency.p99}ms (< 10.0ms)`);

// -----------------------------------------------------------------------------
// SUITE 6: Determinism & Hash Invariance
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 6: Determinism & Hash Invariance ---');

const deterministicCandles = Array.from({ length: 500 }, (_, i) => ({
    open: 20000 + ((i * 17) % 500),
    high: 20000 + ((i * 17) % 500) + 50,
    low: 20000 + ((i * 17) % 500) - 50,
    close: 20000 + ((i * 23) % 500),
    volume: 100 + (i % 50)
}));

const baseOutput = JSON.stringify(engine.analyze(deterministicCandles));
const baseHash = crypto.createHash('sha256').update(baseOutput).digest('hex');

let determinismPassed = true;
for (let iter = 0; iter < 100; iter++) {
    const iterOutput = JSON.stringify(engine.analyze(deterministicCandles));
    const iterHash = crypto.createHash('sha256').update(iterOutput).digest('hex');
    if (iterHash !== baseHash) {
        determinismPassed = false;
        break;
    }
}
assert(determinismPassed, `Output is 100% bit-for-bit deterministic across repeated executions (Hash: ${baseHash.slice(0, 16)}...)`);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`  TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('===============================================================');

if (failCount > 0) {
    console.error('FAILURES:', failures);
    process.exit(1);
} else {
    console.log('ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY.');
    process.exit(0);
}
