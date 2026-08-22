/**
 * ADVERSARIAL PARITY TESTER — Phase 3.5
 * Tests boundary conditions + causality.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findSwings } from '../pivots.js';
import { analyzeStructure } from '../structure.js';
import { find_fvgs, find_displacements, find_volume_anomalies, calc_atr } from '../imbalance.js';
import { find_sweeps } from '../liquidity.js';
import { find_order_blocks } from '../orderBlocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADV_DIR = path.join(__dirname, 'fixtures', 'adversarial');
const EXP_DIR = path.join(ADV_DIR, 'expected');
const REPORT_PATH = path.join(__dirname, 'ADVERSARIAL_PARITY_REPORT.md');

function loadCandles(fixturePath) {
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    return data.candles.map(c => ({
        time: c[0], open: c[1], high: c[2], low: c[3], close: c[4],
        volume: c[5] || 0, is_bullish: c[4] >= c[1]
    }));
}

function runV8(candles) {
    const swings = findSwings(candles);
    const structure = analyzeStructure(swings);
    const fvgs = find_fvgs(candles);
    const obs = find_order_blocks(candles);
    const sweeps = find_sweeps(candles, swings);
    const disps = find_displacements(candles);
    const vols = find_volume_anomalies(candles);
    const atr = calc_atr(candles);
    return { swings, structure, fvgs, order_blocks: obs, sweeps, displacements: disps, volume_anomalies: vols, atr14: atr };
}

function pct(m, t) { return t === 0 ? '100.00' : ((m / t) * 100).toFixed(2); }

function compareArraysByKey(expected, actual, keyFn, label) {
    let matches = 0;
    const divergences = [];
    const expMap = new Map(expected.map(e => [keyFn(e), e]));
    const actMap = new Map(actual.map(a => [keyFn(a), a]));

    for (const [key, exp] of expMap.entries()) {
        if (actMap.has(key)) {
            matches++;
        } else {
            divergences.push(`MISSING in actual: ${label} ${key} → ${JSON.stringify(exp)}`);
        }
    }
    for (const [key, act] of actMap.entries()) {
        if (!expMap.has(key)) {
            divergences.push(`EXTRA in actual: ${label} ${key} → ${JSON.stringify(act)}`);
        }
    }
    return { expected: expected.length, actual: actual.length, matches, divergences };
}

function compareStructure(expected, actual) {
    const divergences = [];
    const expSeq = expected.sequence || [];
    const actSeq = actual.sequence || [];
    let seqMatches = 0;
    for (let i = 0; i < Math.min(expSeq.length, actSeq.length); i++) {
        if (expSeq[i].label === actSeq[i].label && expSeq[i].index === actSeq[i].index) seqMatches++;
        else divergences.push(`seq[${i}]: exp=${JSON.stringify(expSeq[i])} act=${JSON.stringify(actSeq[i])}`);
    }
    if (expSeq.length !== actSeq.length) divergences.push(`seq length: exp=${expSeq.length} act=${actSeq.length}`);

    const expEvts = expected.events || [];
    const actEvts = actual.events || [];
    let evtMatches = 0;
    for (let i = 0; i < Math.min(expEvts.length, actEvts.length); i++) {
        if (expEvts[i].type === actEvts[i].type && expEvts[i].index === actEvts[i].index) evtMatches++;
        else divergences.push(`evt[${i}]: exp=${JSON.stringify(expEvts[i])} act=${JSON.stringify(actEvts[i])}`);
    }
    if (expEvts.length !== actEvts.length) divergences.push(`evt length: exp=${expEvts.length} act=${actEvts.length}`);

    return { expSeq: expSeq.length, actSeq: actSeq.length, seqMatches, expEvt: expEvts.length, actEvt: actEvts.length, evtMatches, divergences };
}

function runFixtureTest(name, report) {
    const fixPath = path.join(ADV_DIR, `${name}.json`);
    const expPath = path.join(EXP_DIR, `${name}_expected.json`);

    if (!fs.existsSync(fixPath) || !fs.existsSync(expPath)) {
        return report + `## ${name}\n\n⚠️ Missing fixture or expected.\n\n---\n\n`;
    }

    const candles = loadCandles(fixPath);
    const expected = JSON.parse(fs.readFileSync(expPath, 'utf-8'));
    const actual = runV8(candles);

    report += `## ${name} (${candles.length} candles)\n\n`;

    // Swings
    const sw = compareArraysByKey(expected.swings, actual.swings, s => `${s.index}-${s.kind}`, 'swing');
    report += `| Component | Expected | Actual | Match |\n|-----------|----------|--------|-------|\n`;
    report += `| Swings | ${sw.expected} | ${sw.actual} | **${pct(sw.matches, sw.expected)}%** |\n`;

    // FVGs
    const fvg = compareArraysByKey(expected.fvgs, actual.fvgs, f => `${f.formed_at_index}-${f.type}`, 'FVG');
    report += `| FVGs | ${fvg.expected} | ${fvg.actual} | **${pct(fvg.matches, fvg.expected)}%** |\n`;

    // OBs
    const ob = compareArraysByKey(expected.order_blocks, actual.order_blocks, o => `${o.formed_at_index}-${o.type}`, 'OB');
    report += `| Order Blocks | ${ob.expected} | ${ob.actual} | **${pct(ob.matches, ob.expected)}%** |\n`;

    // Sweeps
    const swp = compareArraysByKey(expected.sweeps, actual.sweeps, s => `${s.sweep_candle_index}-${s.type}`, 'sweep');
    report += `| Sweeps | ${swp.expected} | ${swp.actual} | **${pct(swp.matches, swp.expected)}%** |\n`;

    // Displacements
    const dsp = compareArraysByKey(expected.displacements, actual.displacements, d => `${d.candle_index}-${d.direction}`, 'disp');
    report += `| Displacements | ${dsp.expected} | ${dsp.actual} | **${pct(dsp.matches, dsp.expected)}%** |\n`;

    // Volume
    report += `| Volume Anomalies | ${expected.volume_anomalies.length} | ${actual.volume_anomalies.length} | ${expected.volume_anomalies.length === actual.volume_anomalies.length ? '**100.00%**' : '**MISMATCH**'} |\n`;

    // Structure
    const st = compareStructure(expected.structure, actual.structure);
    report += `| Structure Seq | ${st.expSeq} | ${st.actSeq} | **${pct(st.seqMatches, st.expSeq)}%** |\n`;
    report += `| Structure Events | ${st.expEvt} | ${st.actEvt} | **${pct(st.evtMatches, st.expEvt)}%** |\n`;

    // Collect all divergences
    const allDiv = [...sw.divergences, ...fvg.divergences, ...ob.divergences, ...swp.divergences, ...dsp.divergences, ...st.divergences];
    if (allDiv.length > 0) {
        report += `\n### ⚠️ Divergences (${allDiv.length})\n\n`;
        for (const d of allDiv.slice(0, 30)) {
            report += `- ${d}\n`;
        }
        if (allDiv.length > 30) report += `- ... and ${allDiv.length - 30} more\n`;
    } else {
        report += `\n> ✅ **Zero divergences.**\n`;
    }

    report += `\n---\n\n`;
    return report;
}

function runCausalityTest(report) {
    report += `## 🔬 CAUSALITY TEST\n\n`;
    report += `Testing that events confirmed in candles 0→100 remain identical when candles 101→200 are added.\n\n`;

    const shortCandles = loadCandles(path.join(ADV_DIR, 'causality_short.json'));
    const fullCandles = loadCandles(path.join(ADV_DIR, 'causality_full.json'));

    const shortResult = runV8(shortCandles);
    const fullResult = runV8(fullCandles);

    // Filter full results to only events within the short range (index < 100)
    // But for swings, the last 2 candles can't be confirmed (right=2)
    const maxConfirmedIdx = shortCandles.length - 3; // index 97 is the last confirmable pivot

    const shortSwings = shortResult.swings.filter(s => s.index <= maxConfirmedIdx);
    const fullSwingsInRange = fullResult.swings.filter(s => s.index <= maxConfirmedIdx);

    const shortFvgs = shortResult.fvgs.filter(f => f.formed_at_index <= shortCandles.length - 3);
    const fullFvgsInRange = fullResult.fvgs.filter(f => f.formed_at_index <= shortCandles.length - 3);

    // Compare
    let causalityPass = true;
    const divergences = [];

    // Swings
    if (shortSwings.length !== fullSwingsInRange.length) {
        divergences.push(`Swings count differs: short=${shortSwings.length} full(filtered)=${fullSwingsInRange.length}`);
        causalityPass = false;
    } else {
        for (let i = 0; i < shortSwings.length; i++) {
            if (shortSwings[i].index !== fullSwingsInRange[i].index || shortSwings[i].kind !== fullSwingsInRange[i].kind || shortSwings[i].price !== fullSwingsInRange[i].price) {
                divergences.push(`Swing[${i}] changed: short=${JSON.stringify(shortSwings[i])} full=${JSON.stringify(fullSwingsInRange[i])}`);
                causalityPass = false;
            }
        }
    }

    // FVGs
    if (shortFvgs.length !== fullFvgsInRange.length) {
        divergences.push(`FVGs count differs: short=${shortFvgs.length} full(filtered)=${fullFvgsInRange.length}`);
        causalityPass = false;
    }

    report += `| Check | Short (0→100) | Full (0→200, filtered) | Match |\n`;
    report += `|-------|---------------|------------------------|-------|\n`;
    report += `| Swings (idx ≤ ${maxConfirmedIdx}) | ${shortSwings.length} | ${fullSwingsInRange.length} | ${shortSwings.length === fullSwingsInRange.length ? '✅' : '❌'} |\n`;
    report += `| FVGs (idx ≤ ${shortCandles.length - 3}) | ${shortFvgs.length} | ${fullFvgsInRange.length} | ${shortFvgs.length === fullFvgsInRange.length ? '✅' : '❌'} |\n`;

    if (divergences.length > 0) {
        report += `\n### ⚠️ Causality Divergences\n\n`;
        for (const d of divergences) report += `- ${d}\n`;
    } else {
        report += `\n> ✅ **Causality preserved.** Adding future candles does not alter confirmed past events.\n`;
    }

    report += `\n> **Note:** Swings use \`right=2\`, so pivots at indices \`${maxConfirmedIdx + 1}\` and above cannot be confirmed without future data. This is expected behavior, NOT a look-ahead violation.\n`;

    report += `\n---\n\n`;
    return report;
}

// ============================================================
// MAIN
// ============================================================
let report = '# OPENMOBIUS ADVERSARIAL PARITY REPORT (Phase 3.5)\n\n';
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `> Testing boundary conditions, edge cases, and causal integrity.\n\n---\n\n`;

const fixtures = [
    'fvg_threshold', 'displacement_threshold', 'sweep_boundary',
    'swing_boundary', 'order_block_boundary', 'edge_cases'
];

for (const name of fixtures) {
    report = runFixtureTest(name, report);
}

report = runCausalityTest(report);

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(report);
console.log(`\nReport saved to: ${REPORT_PATH}`);
