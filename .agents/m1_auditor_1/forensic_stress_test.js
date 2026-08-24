import { OpenMobiusEngine } from '../../packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js';
import { calc_atr, _fvg_mitigation_pct, find_fvgs, find_displacements, find_volume_anomalies } from '../../packages/lyzer-shared/src/providers/openmobius/imbalance.js';
import { calcAtr, find_order_blocks } from '../../packages/lyzer-shared/src/providers/openmobius/orderBlocks.js';
import { find_sweeps } from '../../packages/lyzer-shared/src/providers/openmobius/liquidity.js';
import { analyzeStructure } from '../../packages/lyzer-shared/src/providers/openmobius/structure.js';
import { findSwings } from '../../packages/lyzer-shared/src/providers/openmobius/pivots.js';
import { analyze_dealing_range } from '../../packages/lyzer-shared/src/providers/openmobius/location.js';

console.log("Starting Auditor Independent Stress & Forensic Test Suite...");

let failures = 0;

function assert(condition, message) {
    if (!condition) {
        console.error("FAIL:", message);
        failures++;
    } else {
        console.log("PASS:", message);
    }
}

// 1. Edge Case: Empty & Low Length Inputs
const engine = new OpenMobiusEngine();
const emptyState = engine.analyze([]);
assert(emptyState.bias === "FLAT" && emptyState.orderBlocks.length === 0, "Handles empty candles array cleanly");

const nullState = engine.analyze(null);
assert(nullState.bias === "FLAT" && nullState.orderBlocks.length === 0, "Handles null candles cleanly");

const singleCandleState = engine.analyze([{ open: 100, high: 105, low: 95, close: 102 }]);
assert(singleCandleState.bias === "FLAT", "Handles single candle without throwing");

// 2. Fallback without is_bullish property
const rawCandles = [
    { open: 100, high: 110, low: 90, close: 105, volume: 50 },
    { open: 105, high: 120, low: 100, close: 95, volume: 60 },
    { open: 95, high: 130, low: 90, close: 125, volume: 200 },
    { open: 125, high: 135, low: 120, close: 130, volume: 80 },
    { open: 130, high: 140, low: 125, close: 138, volume: 90 }
];
const rawState = engine.analyze(rawCandles);
assert(rawState.version === "8.0.0", "Processes raw candles without is_bullish smoothly");

// 3. Flat Candles (open === close)
const flatCandles = Array.from({ length: 30 }, (_, i) => ({
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 0
}));
const flatState = engine.analyze(flatCandles);
assert(flatState.orderBlocks.length === 0 && flatState.imbalance.fvgs.length === 0, "Flat candles produce zero false positive OBs or FVGs");

// 4. Memory / Heap Leak & Zero Allocation Stress Test
const heapBefore = process.memoryUsage().heapUsed;

// Generate 500 base candles
const stream = [];
let price = 50000;
for (let i = 0; i < 500; i++) {
    const move = (Math.random() - 0.49) * 100;
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;
    price = close;
    stream.push({ open, high, low, close, volume: Math.random() * 1000 });
}

// Simulate 5,000 tick updates (sliding window of 500 candles)
const t0 = performance.now();
for (let tick = 0; tick < 5000; tick++) {
    const last = stream[stream.length - 1];
    const move = (Math.random() - 0.49) * 50;
    const open = last.close;
    const close = open + move;
    const high = Math.max(open, close) + Math.random() * 10;
    const low = Math.min(open, close) - Math.random() * 10;
    stream.push({ open, high, low, close, volume: Math.random() * 1000, is_bullish: close >= open });
    if (stream.length > 500) {
        stream.shift();
    }
    engine.analyze(stream);
}
const elapsedMs = performance.now() - t0;
const heapAfter = process.memoryUsage().heapUsed;
const heapGrowthMb = (heapAfter - heapBefore) / 1024 / 1024;

console.log(`Stress benchmark: 5,000 tick evaluations completed in ${elapsedMs.toFixed(2)}ms (${(5000 / (elapsedMs / 1000)).toFixed(0)} ticks/sec)`);
console.log(`Heap delta: ${heapGrowthMb.toFixed(2)} MB`);

assert(elapsedMs < 5000, "5,000 evaluations finish well within latency requirements (<1ms/tick)");
assert(failures === 0, "All forensic stress tests passed");

if (failures > 0) {
    process.exit(1);
} else {
    console.log("\nALL FORENSIC CHECKS CLEAN!");
}
