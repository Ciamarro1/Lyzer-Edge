#!/usr/bin/env node
/**
 * @fileoverview Lyzer Edge — v0.3 Config Tournament (Offline)
 *
 * AUTHORITY: This script is the ONLY offline authority for v0.3 config selection.
 * It is MUTUALLY EXCLUSIVE with verify_v02.js per execution cycle.
 * Running both in the same cycle creates config oscillation — DO NOT DO IT.
 *
 * WHAT IT DOES:
 *   - Generates up to 10 config candidates (varying confidenceThreshold)
 *   - Runs a full backtest for each candidate
 *   - Applies pre-score FILTERS (eliminate before scoring)
 *   - Applies a FIXED score function (property of v0.3, not of data)
 *   - Selects 1 winner — publishes as activeConfig.js
 *
 * INVARIANTS (contract):
 *   1. Runtime never reads candidate metrics
 *   2. Only 1 config is active at any time
 *   3. Score function belongs to system version v0.3 — not to market data
 *   4. Filters eliminate. Score ranks. Runtime executes.
 *   5. Candidate count capped at 10
 *
 * Usage: node verify_v03.js
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Imports ───────────────────────────────────────────────────────────────────

import { getHistoricalCandles } from '../../../packages/lyzer-shared/src/db/historicalData.js';
import { SignalEngine } from '../../src/engine/signalEngine.js';
import { TruthKernel } from '../../src/engine/kernel.js';
import { activeConfig } from '../../../packages/lyzer-shared/src/db/activeConfig.js';

// ── Governance Constants ──────────────────────────────────────────────────────

const FILTERS = Object.freeze({
  MIN_TRADES:       30,    // Candidate disqualified if below this
  MAX_DD:           10.0,  // Candidate disqualified if drawdown exceeds this (%)
  MIN_ROBUSTNESS:   60,    // Candidate disqualified if robustness score below this
});

const SCORE_WEIGHTS = Object.freeze({
  ERR:         0.40,   // Edge Retention Ratio weight
  ROBUSTNESS:  0.30,   // Robustness score weight
  STABILITY:   0.30,   // Stability (1 - fragility) weight
});
// IMPORTANT: These weights are FIXED for system version v0.3.
// Changing them requires a new system version (v0.4), not a data cycle update.

// ── Audit Fingerprint ─────────────────────────────────────────────────────────

const executionId = `v03-${Date.now()}`;
const executionTimestamp = new Date().toISOString();
const source = 'v0.3';

// ── Config Candidates (max 10 per invariant 5) ────────────────────────────────

// 9 candidates — confidenceThreshold sweeping the valid range
const CANDIDATE_THRESHOLDS = [45, 50, 55, 60, 65, 70, 75, 80, 85];
// Candidate count: 9 (≤ cap of 10) ✓

// ── Backtest Engine ───────────────────────────────────────────────────────────

function runBacktest(candles, threshold) {
  const signalEngine = new SignalEngine();
  const kernel = new TruthKernel({ masterSwitchThreshold: threshold });

  let balance = 10000;
  const initialBalance = 10000;
  let peakBalance = 10000;
  let maxDD = 0;
  let position = null;
  const trades = [];

  const R_DISTANCE = 0.10;
  const RISK_REWARD = 2;
  const START_INDEX = 100;

  for (let i = START_INDEX; i < candles.length; i++) {
    const candle = candles[i];
    const sigResult = signalEngine.evaluate(candles, i);

    const ema100 = signalEngine.calculateEMA(candles.slice(0, i + 1), 100);
    const timeframeSignal = candle.close > ema100 ? 'go' : 'no-go';

    const verdict = kernel.evaluate({
      regime: { 
        signal: sigResult.signal, 
        confidence: sigResult.confidence, 
        reason_codes: sigResult.reasons,
        market_regime: sigResult.regime,
        trend_strength: sigResult.trendStrength
      },
      timeframe: { signal: timeframeSignal, confidence: 75, reason_codes: [] },
      correlation: { signal: 'caution', confidence: 60, reason_codes: [] },
      behavior: { signal: 'caution', confidence: 50, reason_codes: [] },
    });

    const closePrice = candle.close;

    // Exit
    if (position) {
      let closed = false;
      let exitPrice = closePrice;
      let pnl = 0;

      if (position.type === 'LONG') {
        if (candle.low <= position.stopLoss) { exitPrice = position.stopLoss; closed = true; }
        else if (candle.high >= position.takeProfit) { exitPrice = position.takeProfit; closed = true; }
        else if (verdict.signal === 'no-go') { closed = true; }
        if (closed) pnl = (exitPrice - position.entryPrice) * position.amount;
      } else {
        if (candle.high >= position.stopLoss) { exitPrice = position.stopLoss; closed = true; }
        else if (candle.low <= position.takeProfit) { exitPrice = position.takeProfit; closed = true; }
        else if (verdict.signal === 'go') { closed = true; }
        if (closed) pnl = (position.entryPrice - exitPrice) * position.amount;
      }

      if (closed) {
        balance += pnl;
        trades.push({ pnl, type: position.type, entryIndex: position.entryIndex, exitIndex: i });
        position = null;
      }
    }

    // Entry
    if (!position && verdict.signal !== 'caution') {
      const R = closePrice * R_DISTANCE;
      const amount = (balance * 0.25) / closePrice;
      if (verdict.signal === 'go') {
        position = { type: 'LONG', entryPrice: closePrice, entryIndex: i, amount, takeProfit: closePrice + RISK_REWARD * R, stopLoss: closePrice - R };
      } else {
        position = { type: 'SHORT', entryPrice: closePrice, entryIndex: i, amount, takeProfit: closePrice - RISK_REWARD * R, stopLoss: closePrice + R };
      }
    }

    // Drawdown tracking
    const floatingPnL = position
      ? (position.type === 'LONG' ? (closePrice - position.entryPrice) * position.amount : (position.entryPrice - closePrice) * position.amount)
      : 0;
    const equity = balance + floatingPnL;
    if (equity > peakBalance) peakBalance = equity;
    const dd = ((peakBalance - equity) / peakBalance) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  const netPnlPct = ((balance - initialBalance) / initialBalance) * 100;
  return { trades, netPnlPct, maxDD, tradeCount: trades.length };
}

// ── Robustness: Reverse Dataset ───────────────────────────────────────────────

function runReverseBacktest(candles, threshold) {
  return runBacktest([...candles].reverse(), threshold);
}

// ── Robustness Score (simplified for tournament) ──────────────────────────────
// Full robustness uses 10 tests (verify_mne.js). Tournament uses 3 for speed.

function calculateCandidateRobustness(threshold, btcCandles) {
  const baseline = runBacktest(btcCandles, threshold);
  const reverse = runReverseBacktest(btcCandles, threshold);

  // 1. Baseline continuity (40 points)
  const baselineScore = baseline.netPnlPct > 0 ? 40 : (baseline.netPnlPct > -2 ? 20 : 0);

  // 2. Reverse resilience (30 points) — less loss in reverse = better
  const reverseScore = reverse.maxDD < 5 ? 30 : (reverse.maxDD < 15 ? 15 : 0);

  // 3. DD stability (30 points)
  const ddScore = baseline.maxDD < 2 ? 30 : (baseline.maxDD < 5 ? 20 : (baseline.maxDD < 10 ? 10 : 0));

  const robustnessScore = baselineScore + reverseScore + ddScore;
  const fragilityIndex = baseline.maxDD > 0 ? Math.min(1, baseline.maxDD / 20) : 0;

  return { baseline, reverse, robustnessScore, fragilityIndex };
}

// ── Score Function (FIXED for v0.3) ──────────────────────────────────────────

function computeScore(candidate) {
  // ERR: how well does the candidate retain edge vs baseline?
  // We approximate ERR as netPnlPct normalized against the maximum observed PnL
  const errApprox = Math.max(0, Math.min(1, (candidate.netPnlPct / 15))); // 15% = expected ceiling
  const stabilityScore = 1 - candidate.fragilityIndex;

  return (
    errApprox * SCORE_WEIGHTS.ERR +
    (candidate.robustnessScore / 100) * SCORE_WEIGHTS.ROBUSTNESS +
    stabilityScore * SCORE_WEIGHTS.STABILITY
  );
}

// ── Main Tournament ───────────────────────────────────────────────────────────

console.log('='.repeat(65));
console.log('  LYZER EDGE — v0.3 CONFIG TOURNAMENT (OFFLINE)');
console.log('='.repeat(65));
console.log(`  Execution ID : ${executionId}`);
console.log(`  Timestamp    : ${executionTimestamp}`);
console.log(`  Authority    : ${source} (EXCLUSIVE — do not run with v0.2 in same cycle)`);
console.log(`  Current      : threshold=${activeConfig.confidenceThreshold}, version=${activeConfig.version}`);
console.log(`  Candidates   : ${CANDIDATE_THRESHOLDS.length} (cap: 10)`);
console.log('='.repeat(65));

const { BTCUSDT: btcCandles } = getHistoricalCandles();

// ── Phase 1: Simulate all candidates ─────────────────────────────────────────

console.log('\n[1/3] Simulating candidates...');
const allCandidates = [];

for (const threshold of CANDIDATE_THRESHOLDS) {
  process.stdout.write(`      threshold=${threshold}... `);
  const { baseline, robustnessScore, fragilityIndex } = calculateCandidateRobustness(threshold, btcCandles);
  const candidate = {
    version: `0.3.t${threshold}`,
    confidenceThreshold: threshold,
    netPnlPct: baseline.netPnlPct,
    expectedDD: baseline.maxDD,
    tradeCount: baseline.tradeCount,
    robustnessScore,
    fragilityIndex,
    stabilityScore: 1 - fragilityIndex,
    score: 0, // computed after filtering
  };
  allCandidates.push(candidate);
  console.log(`trades=${baseline.tradeCount} pnl=${baseline.netPnlPct.toFixed(2)}% dd=${baseline.maxDD.toFixed(2)}% rob=${robustnessScore}`);
}

// ── Phase 2: FILTER (eliminates before scoring — key invariant) ───────────────

console.log('\n[2/3] Filtering candidates (filters eliminate — score only ranks survivors)...');
const filtered = allCandidates.filter(c => {
  const passTradeCount = c.tradeCount >= FILTERS.MIN_TRADES;
  const passDD = c.expectedDD <= FILTERS.MAX_DD;
  const passRobustness = c.robustnessScore >= FILTERS.MIN_ROBUSTNESS;
  const passes = passTradeCount && passDD && passRobustness;
  if (!passes) {
    console.log(`      ELIMINATED threshold=${c.confidenceThreshold}: trades=${c.tradeCount}(≥${FILTERS.MIN_TRADES}:${passTradeCount}), dd=${c.expectedDD.toFixed(2)}%(≤${FILTERS.MAX_DD}:${passDD}), rob=${c.robustnessScore}(≥${FILTERS.MIN_ROBUSTNESS}:${passRobustness})`);
  }
  return passes;
});

console.log(`      Survivors: ${filtered.length} / ${allCandidates.length}`);

if (filtered.length === 0) {
  console.log('\n⚠️  No candidates passed all filters. Retaining current config.');
  console.log('    This may indicate insufficient data or a structural regime shift.');
  console.log('    Run verify_mne.js for deeper diagnostics.');
  console.log('\n✅ Result: NO_CHANGE (all candidates eliminated)');
  process.exit(0);
}

// ── Phase 3: SCORE survivors (fixed weights — v0.3 law) ──────────────────────

console.log('\n[3/3] Scoring survivors (score function fixed for v0.3)...');
console.log(`      Weights: ERR×${SCORE_WEIGHTS.ERR} + Robustness×${SCORE_WEIGHTS.ROBUSTNESS} + Stability×${SCORE_WEIGHTS.STABILITY}`);

for (const c of filtered) {
  c.score = computeScore(c);
}

filtered.sort((a, b) => b.score - a.score);

// ── Registry (ephemeral — audit only, never read by runtime) ──────────────────
const registry = {
  executionId,
  timestamp: executionTimestamp,
  source,
  activeConfig: { ...activeConfig },
  candidates: allCandidates,
  survivors: filtered,
  winner: filtered[0],
};

console.log('\n  Scored candidates (survivors only):');
console.log('  ' + '─'.repeat(60));
console.log('  Threshold | Trades | PnL%    | MaxDD%  | Rob | Score');
console.log('  ' + '─'.repeat(60));
for (const c of filtered) {
  const mark = c === filtered[0] ? ' ← WINNER' : '';
  console.log(`  ${String(c.confidenceThreshold).padStart(9)} | ${String(c.tradeCount).padStart(6)} | ${c.netPnlPct.toFixed(2).padStart(7)} | ${c.expectedDD.toFixed(2).padStart(7)} | ${String(c.robustnessScore).padStart(3)} | ${c.score.toFixed(4)}${mark}`);
}

// ── Publish winner ────────────────────────────────────────────────────────────

const winner = filtered[0];
const newVersion = `0.3.${winner.confidenceThreshold}`;

console.log('\n' + '='.repeat(65));
console.log('  TOURNAMENT RESULT');
console.log('='.repeat(65));
console.log(`  Winner threshold : ${winner.confidenceThreshold}`);
console.log(`  Score            : ${winner.score.toFixed(4)} (ERR×0.4 + Rob×0.3 + Stab×0.3)`);
console.log(`  Net PnL          : ${winner.netPnlPct.toFixed(2)}%`);
console.log(`  Max DD           : ${winner.expectedDD.toFixed(2)}%`);
console.log(`  Robustness       : ${winner.robustnessScore}/100`);
console.log(`  Fragility Index  : ${winner.fragilityIndex.toFixed(4)}`);
console.log('='.repeat(65));

const changedThreshold = winner.confidenceThreshold !== activeConfig.confidenceThreshold;
const decision = changedThreshold ? 'NEW_CONFIG_PUBLISHED' : 'WINNER_MATCHES_CURRENT';

const configContent = `/**
 * @fileoverview Lyzer Edge — Active Runtime Configuration
 *
 * @generated
 * THIS FILE IS A GENERATED ARTIFACT.
 * DO NOT EDIT MANUALLY.
 *
 * Generated by   : ${source}
 * Execution ID   : ${executionId}
 * Timestamp      : ${executionTimestamp}
 * Decision       : ${decision}
 * Tournament     : ${allCandidates.length} candidates → ${filtered.length} survivors → 1 winner
 * Winner Score   : ${winner.score.toFixed(4)} (ERR×0.4 + Rob×0.3 + Stab×0.3)
 * Previous       : threshold=${activeConfig.confidenceThreshold}, version=${activeConfig.version}
 *
 * @invariant Runtime receives configuration. Runtime never resolves configuration.
 * @invariant Filters eliminate. Score ranks. Runtime executes.
 */

/** @type {Readonly<{ version: string, validFrom: string, confidenceThreshold: number }>} */
export const activeConfig = Object.freeze({
  version: '${newVersion}',
  validFrom: '${executionTimestamp}',
  confidenceThreshold: ${winner.confidenceThreshold},
});
`;

const configPath = path.join(__dirname, 'src', 'db', 'activeConfig.js');
writeFileSync(configPath, configContent, 'utf8');

console.log(`\n  Written: src/db/activeConfig.js`);
console.log(`  Version: ${activeConfig.version} → ${newVersion}`);
console.log(`  Threshold: ${activeConfig.confidenceThreshold} → ${winner.confidenceThreshold}`);
console.log(`\n✅ Result: ${decision}`);
console.log('='.repeat(65));
