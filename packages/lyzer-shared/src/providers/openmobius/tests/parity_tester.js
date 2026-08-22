/**
 * OPENMOBIUS PARITY TESTER — Component-by-Component Divergence Report
 * Compares Python Oracle ground truth vs Node.js V8 Engine output.
 * Does NOT produce simple PASS/FAIL — produces a full divergence report.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findSwings } from '../pivots.js';
import { analyzeStructure } from '../structure.js';
import { find_fvgs, find_displacements, find_volume_anomalies, calc_atr } from '../imbalance.js';
import { find_sweeps } from '../liquidity.js';
import { find_order_blocks } from '../orderBlocks.js';
import { analyze_dealing_range } from '../location.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const EXPECTED_DIR = path.join(FIXTURES_DIR, 'expected');
const REPORT_PATH = path.join(__dirname, 'OPENMOBIUS_PARITY_REPORT.md');

function loadCandles(fixturePath) {
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    return data.candles.map(c => ({
        time: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5] || 0,
        is_bullish: c[4] >= c[1]
    }));
}

function compareSwings(expected, actual) {
    const divergences = [];
    let matches = 0;
    const expMap = new Map();
    for (const s of expected) {
        expMap.set(`${s.index}-${s.kind}`, s.price);
    }
    const actMap = new Map();
    for (const s of actual) {
        actMap.set(`${s.index}-${s.kind}`, s.price);
    }
    // Check expected against actual
    for (const [key, price] of expMap.entries()) {
        if (actMap.has(key) && actMap.get(key) === price) {
            matches++;
        } else if (actMap.has(key)) {
            divergences.push(`bar=${key}: price mismatch expected=${price} actual=${actMap.get(key)}`);
        } else {
            divergences.push(`bar=${key}: expected swing MISSING in actual (price=${price})`);
        }
    }
    for (const [key, price] of actMap.entries()) {
        if (!expMap.has(key)) {
            divergences.push(`bar=${key}: EXTRA swing in actual (price=${price})`);
        }
    }
    return { expected: expected.length, actual: actual.length, matches, divergences };
}

function compareFvgs(expected, actual) {
    const divergences = [];
    let matches = 0;
    // FVGs keyed by formed_at_index + type
    const expMap = new Map();
    for (const f of expected) {
        const key = `${f.formed_at_index}-${f.type}`;
        expMap.set(key, f);
    }
    const actMap = new Map();
    for (const f of actual) {
        const key = `${f.formed_at_index}-${f.type}`;
        actMap.set(key, f);
    }
    for (const [key, exp] of expMap.entries()) {
        if (actMap.has(key)) {
            const act = actMap.get(key);
            // Check top/bottom bounds
            if (Math.abs(exp.top - act.top) < 0.01 && Math.abs(exp.bottom - act.bottom) < 0.01) {
                matches++;
            } else {
                divergences.push(`bar=${key}: bounds mismatch exp=[${exp.bottom},${exp.top}] act=[${act.bottom},${act.top}]`);
            }
        } else {
            divergences.push(`bar=${key}: expected FVG MISSING in actual`);
        }
    }
    for (const [key] of actMap.entries()) {
        if (!expMap.has(key)) {
            divergences.push(`bar=${key}: EXTRA FVG in actual`);
        }
    }
    return { expected: expected.length, actual: actual.length, matches, divergences };
}

function compareOrderBlocks(expected, actual) {
    const divergences = [];
    let matches = 0;
    const expMap = new Map();
    for (const ob of expected) {
        expMap.set(`${ob.formed_at_index}-${ob.type}`, ob);
    }
    const actMap = new Map();
    for (const ob of actual) {
        actMap.set(`${ob.formed_at_index}-${ob.type}`, ob);
    }
    for (const [key, exp] of expMap.entries()) {
        if (actMap.has(key)) {
            matches++;
        } else {
            divergences.push(`bar=${key}: expected OB MISSING in actual`);
        }
    }
    for (const [key] of actMap.entries()) {
        if (!expMap.has(key)) {
            divergences.push(`bar=${key}: EXTRA OB in actual`);
        }
    }
    return { expected: expected.length, actual: actual.length, matches, divergences };
}

function compareSweeps(expected, actual) {
    const divergences = [];
    let matches = 0;
    const expMap = new Map();
    for (const s of expected) {
        expMap.set(`${s.sweep_candle_index}-${s.type}`, s);
    }
    const actMap = new Map();
    for (const s of actual) {
        actMap.set(`${s.sweep_candle_index}-${s.type}`, s);
    }
    for (const [key] of expMap.entries()) {
        if (actMap.has(key)) {
            matches++;
        } else {
            divergences.push(`bar=${key}: expected sweep MISSING in actual`);
        }
    }
    for (const [key] of actMap.entries()) {
        if (!expMap.has(key)) {
            divergences.push(`bar=${key}: EXTRA sweep in actual`);
        }
    }
    return { expected: expected.length, actual: actual.length, matches, divergences };
}

function compareStructure(expected, actual) {
    const divergences = [];
    let seqMatches = 0;
    let evtMatches = 0;

    const expSeq = expected.sequence || [];
    const actSeq = actual.sequence || [];
    const minSeq = Math.min(expSeq.length, actSeq.length);
    for (let i = 0; i < minSeq; i++) {
        if (expSeq[i].label === actSeq[i].label && expSeq[i].index === actSeq[i].index) {
            seqMatches++;
        } else {
            divergences.push(`sequence[${i}]: expected=${JSON.stringify(expSeq[i])} actual=${JSON.stringify(actSeq[i])}`);
        }
    }
    if (expSeq.length !== actSeq.length) {
        divergences.push(`sequence length: expected=${expSeq.length} actual=${actSeq.length}`);
    }

    const expEvts = expected.events || [];
    const actEvts = actual.events || [];
    const minEvt = Math.min(expEvts.length, actEvts.length);
    for (let i = 0; i < minEvt; i++) {
        if (expEvts[i].type === actEvts[i].type && expEvts[i].index === actEvts[i].index) {
            evtMatches++;
        } else {
            divergences.push(`event[${i}]: expected=${JSON.stringify(expEvts[i])} actual=${JSON.stringify(actEvts[i])}`);
        }
    }
    if (expEvts.length !== actEvts.length) {
        divergences.push(`events length: expected=${expEvts.length} actual=${actEvts.length}`);
    }

    return {
        expectedSeq: expSeq.length, actualSeq: actSeq.length, seqMatches,
        expectedEvt: expEvts.length, actualEvt: actEvts.length, evtMatches,
        divergences
    };
}

function pct(matches, total) {
    if (total === 0) return '100.00';
    return ((matches / total) * 100).toFixed(2);
}

function runParity() {
    const fixtures = [
        'openmobius_trending',
        'openmobius_ranging',
        'openmobius_edge_cases'
    ];

    let report = '# OPENMOBIUS PARITY REPORT\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const name of fixtures) {
        const fixPath = path.join(FIXTURES_DIR, `${name}.json`);
        const expPath = path.join(EXPECTED_DIR, `${name}_expected.json`);

        if (!fs.existsSync(fixPath) || !fs.existsSync(expPath)) {
            report += `## ${name}\n\n⚠️ Missing fixture or expected file.\n\n---\n\n`;
            continue;
        }

        const candles = loadCandles(fixPath);
        const expected = JSON.parse(fs.readFileSync(expPath, 'utf-8'));

        // Run Node V8 components
        const nodeSwings = findSwings(candles);
        const nodeStructure = analyzeStructure(nodeSwings);
        const nodeFvgs = find_fvgs(candles);
        const nodeObs = find_order_blocks(candles);
        const nodeSweeps = find_sweeps(candles, nodeSwings);
        const nodeDisps = find_displacements(candles);
        const nodeVols = find_volume_anomalies(candles);

        report += `## Fixture: ${name} (${candles.length} candles)\n\n`;

        // Pivots / Swings
        const swRes = compareSwings(expected.swings, nodeSwings);
        report += `### Pivots/Swings\n`;
        report += `- Expected: **${swRes.expected}**\n`;
        report += `- Actual:   **${swRes.actual}**\n`;
        report += `- Match:    **${pct(swRes.matches, swRes.expected)}%**\n`;
        if (swRes.divergences.length > 0) {
            report += `\n**Divergences (${swRes.divergences.length}):**\n`;
            for (const d of swRes.divergences.slice(0, 20)) {
                report += `- ${d}\n`;
            }
            if (swRes.divergences.length > 20) report += `- ... and ${swRes.divergences.length - 20} more\n`;
        }
        report += `\n`;

        // FVGs
        const fvgRes = compareFvgs(expected.fvgs, nodeFvgs);
        report += `### FVG (Fair Value Gaps)\n`;
        report += `- Expected: **${fvgRes.expected}**\n`;
        report += `- Actual:   **${fvgRes.actual}**\n`;
        report += `- Match:    **${pct(fvgRes.matches, fvgRes.expected)}%**\n`;
        if (fvgRes.divergences.length > 0) {
            report += `\n**Divergences (${fvgRes.divergences.length}):**\n`;
            for (const d of fvgRes.divergences.slice(0, 20)) {
                report += `- ${d}\n`;
            }
            if (fvgRes.divergences.length > 20) report += `- ... and ${fvgRes.divergences.length - 20} more\n`;
        }
        report += `\n`;

        // Order Blocks
        const obRes = compareOrderBlocks(expected.order_blocks, nodeObs);
        report += `### Order Blocks\n`;
        report += `- Expected: **${obRes.expected}**\n`;
        report += `- Actual:   **${obRes.actual}**\n`;
        report += `- Match:    **${pct(obRes.matches, obRes.expected)}%**\n`;
        if (obRes.divergences.length > 0) {
            report += `\n**Divergences (${obRes.divergences.length}):**\n`;
            for (const d of obRes.divergences.slice(0, 20)) {
                report += `- ${d}\n`;
            }
            if (obRes.divergences.length > 20) report += `- ... and ${obRes.divergences.length - 20} more\n`;
        }
        report += `\n`;

        // Sweeps
        const swpRes = compareSweeps(expected.sweeps, nodeSweeps);
        report += `### Liquidity Sweeps\n`;
        report += `- Expected: **${swpRes.expected}**\n`;
        report += `- Actual:   **${swpRes.actual}**\n`;
        report += `- Match:    **${pct(swpRes.matches, swpRes.expected)}%**\n`;
        if (swpRes.divergences.length > 0) {
            report += `\n**Divergences (${swpRes.divergences.length}):**\n`;
            for (const d of swpRes.divergences.slice(0, 20)) {
                report += `- ${d}\n`;
            }
            if (swpRes.divergences.length > 20) report += `- ... and ${swpRes.divergences.length - 20} more\n`;
        }
        report += `\n`;

        // Structure
        const stRes = compareStructure(expected.structure, nodeStructure);
        report += `### Market Structure (BOS/CHoCH)\n`;
        report += `- Sequence: Expected **${stRes.expectedSeq}** / Actual **${stRes.actualSeq}** / Match **${pct(stRes.seqMatches, stRes.expectedSeq)}%**\n`;
        report += `- Events:   Expected **${stRes.expectedEvt}** / Actual **${stRes.actualEvt}** / Match **${pct(stRes.evtMatches, stRes.expectedEvt)}%**\n`;
        if (stRes.divergences.length > 0) {
            report += `\n**Divergences (${stRes.divergences.length}):**\n`;
            for (const d of stRes.divergences.slice(0, 20)) {
                report += `- ${d}\n`;
            }
            if (stRes.divergences.length > 20) report += `- ... and ${stRes.divergences.length - 20} more\n`;
        }
        report += `\n`;

        // Displacements
        report += `### Displacements\n`;
        report += `- Expected: **${expected.displacements.length}**\n`;
        report += `- Actual:   **${nodeDisps.length}**\n`;
        report += `\n`;

        // Volume Anomalies
        report += `### Volume Anomalies\n`;
        report += `- Expected: **${expected.volume_anomalies.length}**\n`;
        report += `- Actual:   **${nodeVols.length}**\n`;
        report += `\n`;

        report += `---\n\n`;
    }

    fs.writeFileSync(REPORT_PATH, report, 'utf-8');
    console.log(report);
    console.log(`\nReport saved to: ${REPORT_PATH}`);
}

runParity();
