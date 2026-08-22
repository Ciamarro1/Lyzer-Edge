/**
 * ADVERSARIAL FIXTURE GENERATOR — Phase 3.5
 * 
 * Creates synthetic candles that test exact boundary conditions of OpenMobius.
 * 
 * Key thresholds extracted from kb_klines.py:
 *   FVG:          gap < min_size → skip. So gap must be >= 0.2 * ATR to qualify.
 *   Displacement:  body >= 2.0 * ATR  (inclusive >=)
 *   Order Block:   move > 1.5 * ATR   (strict >)
 *   Sweep:         high > level AND close < level  (strict > and strict <)
 *   Volume:        ratio > 2.0 * avg  (strict >)
 *   Swing:         high >= neighbors (inclusive >=), low <= neighbors (inclusive <=)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'adversarial');
fs.mkdirSync(FIXTURES_DIR, { recursive: true });

// Helper: generate N stable candles with controlled ATR
function stableCandles(n, basePrice = 100, range = 1.0, volume = 10) {
    const candles = [];
    let price = basePrice;
    for (let i = 0; i < n; i++) {
        const dir = (i % 2 === 0) ? 1 : -1;
        const o = price;
        const c = price + dir * range * 0.3;
        const h = Math.max(o, c) + range * 0.35;
        const l = Math.min(o, c) - range * 0.35;
        candles.push([i * 60000, round(o), round(h), round(l), round(c), volume]);
        price = c;
    }
    return candles;
}

function round(v, d = 4) { return Math.round(v * (10 ** d)) / (10 ** d); }

// Compute ATR from the last `period` candles (SMA of TR)
function computeATR(candles, period = 14) {
    if (candles.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const prevClose = candles[i - 1][4];
        const h = candles[i][2];
        const l = candles[i][3];
        const tr = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
        trs.push(tr);
    }
    const slice = trs.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

// ============================================================
// 1. FVG THRESHOLD TEST
// ============================================================
function generateFvgThreshold() {
    // 20 stable candles to establish ATR, then test FVGs at boundary
    const base = stableCandles(20, 100, 1.0, 10);
    const atr = computeATR(base);
    const minGap = 0.2 * atr;

    // Case A: gap = minGap - 0.001 (should NOT be FVG)
    const gapBelow = minGap - 0.001;
    // Bullish FVG: c[i].high < c[i+2].low, gap = c[i+2].low - c[i].high
    const lastClose = base[base.length - 1][4];
    const cA0 = [20 * 60000, round(lastClose), round(lastClose + 0.5), round(lastClose - 0.5), round(lastClose + 0.3), 10];
    const cA0High = cA0[2];
    const cA1 = [21 * 60000, round(cA0[4]), round(cA0[4] + 0.5), round(cA0[4] - 0.5), round(cA0[4] + 0.3), 10];
    const targetLowA = cA0High + gapBelow;
    const cA2 = [22 * 60000, round(targetLowA + 0.1), round(targetLowA + 0.6), round(targetLowA), round(targetLowA + 0.5), 10];

    // Case B: gap = minGap exactly (boundary — Python uses < for skip, so gap == minGap should qualify)
    const gapExact = minGap;
    const cB0 = [23 * 60000, round(lastClose), round(lastClose + 0.5), round(lastClose - 0.5), round(lastClose + 0.3), 10];
    const cB0High = cB0[2];
    const cB1 = [24 * 60000, round(cB0[4]), round(cB0[4] + 0.5), round(cB0[4] - 0.5), round(cB0[4] + 0.3), 10];
    const targetLowB = cB0High + gapExact;
    const cB2 = [25 * 60000, round(targetLowB + 0.1), round(targetLowB + 0.6), round(targetLowB), round(targetLowB + 0.5), 10];

    // Case C: gap = minGap + 0.001 (should definitely be FVG)
    const gapAbove = minGap + 0.001;
    const cC0 = [26 * 60000, round(lastClose), round(lastClose + 0.5), round(lastClose - 0.5), round(lastClose + 0.3), 10];
    const cC0High = cC0[2];
    const cC1 = [27 * 60000, round(cC0[4]), round(cC0[4] + 0.5), round(cC0[4] - 0.5), round(cC0[4] + 0.3), 10];
    const targetLowC = cC0High + gapAbove;
    const cC2 = [28 * 60000, round(targetLowC + 0.1), round(targetLowC + 0.6), round(targetLowC), round(targetLowC + 0.5), 10];

    // Pad with more stable candles
    const tail = stableCandles(10, cC2[4], 1.0, 10).map((c, i) => {
        c[0] = (29 + i) * 60000;
        return c;
    });

    return { candles: [...base, cA0, cA1, cA2, cB0, cB1, cB2, cC0, cC1, cC2, ...tail] };
}

// ============================================================
// 2. DISPLACEMENT THRESHOLD TEST (body >= 2.0 * ATR)
// ============================================================
function generateDisplacementThreshold() {
    const base = stableCandles(20, 100, 1.0, 10);
    const atr = computeATR(base);
    const threshold = 2.0 * atr;
    const lastClose = base[base.length - 1][4];

    // Case A: body = threshold - 0.001 (should NOT be displacement)
    const bodyBelow = threshold - 0.001;
    const cA = [20 * 60000, round(lastClose), round(lastClose + bodyBelow + 0.1), round(lastClose - 0.1), round(lastClose + bodyBelow), 10];

    // Case B: body = threshold exactly (should be displacement, >= is inclusive)
    const bodyExact = threshold;
    const cB = [21 * 60000, round(cA[4]), round(cA[4] + bodyExact + 0.1), round(cA[4] - 0.1), round(cA[4] + bodyExact), 10];

    // Case C: body = threshold + 0.001 (should definitely be displacement)
    const bodyAbove = threshold + 0.001;
    const cC = [22 * 60000, round(cB[4]), round(cB[4] + bodyAbove + 0.1), round(cB[4] - 0.1), round(cB[4] + bodyAbove), 10];

    const tail = stableCandles(10, cC[4], 1.0, 10).map((c, i) => { c[0] = (23 + i) * 60000; return c; });

    return { candles: [...base, cA, cB, cC, ...tail] };
}

// ============================================================
// 3. SWEEP BOUNDARY TEST (high > level AND close < level)
// ============================================================
function generateSweepBoundary() {
    // Create a clear swing high, then test sweep at boundary
    const base = stableCandles(20, 100, 1.0, 10);
    const lastClose = base[base.length - 1][4];

    // Create a clear swing high at index 22 (need left=2, right=2)
    const swingPrice = lastClose + 5;
    const pre1 = [20 * 60000, round(lastClose), round(lastClose + 1), round(lastClose - 0.5), round(lastClose + 0.5), 10];
    const pre2 = [21 * 60000, round(pre1[4]), round(pre1[4] + 2), round(pre1[4] - 0.5), round(pre1[4] + 1.5), 10];
    const peak = [22 * 60000, round(swingPrice - 1), round(swingPrice), round(swingPrice - 2), round(swingPrice - 0.5), 10];
    const post1 = [23 * 60000, round(peak[4]), round(peak[4] + 1), round(peak[4] - 1), round(peak[4] - 0.5), 10];
    const post2 = [24 * 60000, round(post1[4]), round(post1[4] + 0.5), round(post1[4] - 1), round(post1[4] - 0.3), 10];

    // Case A: high == level exactly, close < level (should NOT be sweep: requires high > level, strict)
    const cA = [25 * 60000, round(swingPrice - 2), round(swingPrice), round(swingPrice - 3), round(swingPrice - 1), 10];

    // Case B: high = level + 0.01, close < level (SHOULD be sweep)
    const cB = [26 * 60000, round(swingPrice - 2), round(swingPrice + 0.01), round(swingPrice - 3), round(swingPrice - 1), 10];

    // Case C: high > level, close == level (should NOT be sweep: requires close < level, strict)
    const cC = [27 * 60000, round(swingPrice - 2), round(swingPrice + 1), round(swingPrice - 3), round(swingPrice), 10];

    // Case D: high > level, close = level - 0.01 (SHOULD be sweep)
    const cD = [28 * 60000, round(swingPrice - 2), round(swingPrice + 1), round(swingPrice - 3), round(swingPrice - 0.01), 10];

    const tail = stableCandles(10, cD[4], 1.0, 10).map((c, i) => { c[0] = (29 + i) * 60000; return c; });

    return { candles: [...base, pre1, pre2, peak, post1, post2, cA, cB, cC, cD, ...tail] };
}

// ============================================================
// 4. SWING BOUNDARY (equal highs/lows, pivots with ties)
// ============================================================
function generateSwingBoundary() {
    const base = stableCandles(5, 100, 1.0, 10);

    // Create two adjacent candles with EQUAL highs — should both be pivots (>= comparison)
    const eqHigh = 110;
    const candles = [
        ...base,
        [5 * 60000, 105, 108, 104, 107, 10],
        [6 * 60000, 107, 109, 106, 108, 10],
        [7 * 60000, 108, eqHigh, 107, 109, 10],   // candidate pivot high
        [8 * 60000, 109, eqHigh, 107, 108, 10],   // equal high
        [9 * 60000, 108, 109, 106, 107, 10],
        [10 * 60000, 107, 108, 105, 106, 10],
    ];

    // Equal lows
    const eqLow = 95;
    candles.push(
        [11 * 60000, 106, 107, 98, 100, 10],
        [12 * 60000, 100, 101, 97, 99, 10],
        [13 * 60000, 99, 100, eqLow, 96, 10],    // candidate pivot low
        [14 * 60000, 96, 98, eqLow, 97, 10],     // equal low
        [15 * 60000, 97, 99, 96, 98, 10],
        [16 * 60000, 98, 100, 97, 99, 10],
    );

    // Flat candle (open == high == low == close)
    candles.push(
        [17 * 60000, 100, 100, 100, 100, 0],
        [18 * 60000, 100, 100, 100, 100, 0],
        [19 * 60000, 100, 100, 100, 100, 0],
    );

    const tail = stableCandles(10, 100, 1.0, 10).map((c, i) => { c[0] = (20 + i) * 60000; return c; });
    candles.push(...tail);

    return { candles };
}

// ============================================================
// 5. ORDER BLOCK BOUNDARY (move > 1.5 * ATR, strict)
// ============================================================
function generateOrderBlockBoundary() {
    const base = stableCandles(20, 100, 1.0, 10);
    const atr = computeATR(base);
    const threshold = 1.5 * atr;
    const lastClose = base[base.length - 1][4];

    // Bearish candle followed by bullish displacement
    // Case A: move = threshold exactly (should NOT be OB: strict >)
    const obCandleA = [20 * 60000, round(lastClose + 0.5), round(lastClose + 0.6), round(lastClose - 0.5), round(lastClose - 0.3), 10];
    const moveExact = threshold;
    const targetCloseA = obCandleA[1] + moveExact; // c.open + threshold
    const dispA1 = [21 * 60000, round(obCandleA[4] + 0.5), round(obCandleA[4] + moveExact * 0.4), round(obCandleA[4]), round(obCandleA[4] + moveExact * 0.3), 10];
    const dispA2 = [22 * 60000, round(dispA1[4] + 0.2), round(dispA1[4] + moveExact * 0.4), round(dispA1[4]), round(dispA1[4] + moveExact * 0.3), 10];
    const dispA3 = [23 * 60000, round(dispA2[4] + 0.2), round(targetCloseA + 0.5), round(dispA2[4]), round(targetCloseA), 10];

    // Case B: move = threshold + 0.01 (SHOULD be OB)
    const obCandleB = [24 * 60000, round(dispA3[4] + 0.5), round(dispA3[4] + 0.6), round(dispA3[4] - 0.5), round(dispA3[4] - 0.3), 10];
    const moveAbove = threshold + 0.5;
    const targetCloseB = obCandleB[1] + moveAbove;
    const dispB1 = [25 * 60000, round(obCandleB[4] + 0.5), round(obCandleB[4] + moveAbove * 0.4), round(obCandleB[4]), round(obCandleB[4] + moveAbove * 0.35), 10];
    const dispB2 = [26 * 60000, round(dispB1[4] + 0.2), round(dispB1[4] + moveAbove * 0.4), round(dispB1[4]), round(dispB1[4] + moveAbove * 0.35), 10];
    const dispB3 = [27 * 60000, round(dispB2[4] + 0.2), round(targetCloseB + 0.5), round(dispB2[4]), round(targetCloseB), 10];

    const tail = stableCandles(10, dispB3[4], 1.0, 10).map((c, i) => { c[0] = (28 + i) * 60000; return c; });

    return { candles: [...base, obCandleA, dispA1, dispA2, dispA3, obCandleB, dispB1, dispB2, dispB3, ...tail] };
}

// ============================================================
// 6. EDGE CASES: ATR zero, insufficient history, volume zero
// ============================================================
function generateEdgeCases() {
    const candles = [];

    // Only 2 candles (insufficient for most functions)
    candles.push(
        [0, 100, 101, 99, 100.5, 10],
        [60000, 100.5, 101.5, 99.5, 101, 10],
    );

    // Add more candles but all flat (ATR → 0)
    for (let i = 2; i < 20; i++) {
        candles.push([i * 60000, 100, 100, 100, 100, 0]);
    }

    // Then normal candles
    const tail = stableCandles(15, 100, 1.0, 10).map((c, i) => { c[0] = (20 + i) * 60000; return c; });
    candles.push(...tail);

    return { candles };
}

// ============================================================
// 7. CAUSALITY TEST — candles 0-100 vs 0-200
// ============================================================
function generateCausalityFixtures() {
    const full = stableCandles(200, 100, 2.0, 10);
    const short = full.slice(0, 100);

    return {
        short: { candles: short },
        full: { candles: full }
    };
}

// ============================================================
// GENERATE ALL
// ============================================================
function main() {
    const fixtures = {
        'fvg_threshold.json': generateFvgThreshold(),
        'displacement_threshold.json': generateDisplacementThreshold(),
        'sweep_boundary.json': generateSweepBoundary(),
        'swing_boundary.json': generateSwingBoundary(),
        'order_block_boundary.json': generateOrderBlockBoundary(),
        'edge_cases.json': generateEdgeCases(),
    };

    for (const [name, data] of Object.entries(fixtures)) {
        const outPath = path.join(FIXTURES_DIR, name);
        fs.writeFileSync(outPath, JSON.stringify(data), 'utf-8');
        console.log(`Generated: ${name} (${data.candles.length} candles)`);
    }

    // Causality fixtures
    const causality = generateCausalityFixtures();
    fs.writeFileSync(path.join(FIXTURES_DIR, 'causality_short.json'), JSON.stringify(causality.short), 'utf-8');
    fs.writeFileSync(path.join(FIXTURES_DIR, 'causality_full.json'), JSON.stringify(causality.full), 'utf-8');
    console.log(`Generated: causality_short.json (${causality.short.candles.length} candles)`);
    console.log(`Generated: causality_full.json (${causality.full.candles.length} candles)`);

    console.log('\nAll adversarial fixtures generated.');
}

main();
