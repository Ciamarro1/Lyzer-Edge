#!/usr/bin/env node
/**
 * @fileoverview Lyzer Edge — v0.2 Parameter Updater (Offline)
 *
 * AUTHORITY: This script is the ONLY offline authority for v0.2 parameter updates.
 * It is MUTUALLY EXCLUSIVE with verify_v03.js per execution cycle.
 * Running both in the same cycle creates config oscillation — DO NOT DO IT.
 *
 * WHAT IT DOES:
 *   - Runs a rolling backtest on recent historical data
 *   - Reads the current activeConfig
 *   - Applies clamp-bounded threshold adjustment based on performance
 *   - Writes a new activeConfig.js if adjustment is warranted
 *
 * WHAT IT NEVER DOES:
 *   - Does not read market data in real-time
 *   - Does not run during runtime execution
 *   - Does not lower threshold after recent drawdown (anti-revenge rule)
 *
 * Usage: node verify_v02.js
 */

import { createRequire } from 'module';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Imports ───────────────────────────────────────────────────────────────────

import { getHistoricalCandles } from './src/db/historicalData.js';
import { SignalEngine } from './src/engine/signalEngine.js';
import { TruthKernel } from './src/engine/kernel.js';
import { activeConfig } from './src/db/activeConfig.js';

// ── Governance Clamps (Law of Iron) ──────────────────────────────────────────

const CLAMPS = Object.freeze({
  MIN_THRESHOLD:      45,   // Absolute floor — never go below this
  MAX_THRESHOLD:      85,   // Absolute ceiling — never go above this
  MAX_STEP:            2,   // Max adjustment per cycle (percentage points)
  MIN_TRADES:         30,   // Minimum trades to allow any update
  TARGET_ERR:       0.70,   // Edge Retention Ratio target
  MAX_ALLOWED_DD:   10.0,   // Max drawdown % before tightening
  RECENT_DRAWDOWN_LOOKBACK: 20, // Trades to look back for recent DD detection
});

// ── Audit Fingerprint ─────────────────────────────────────────────────────────

const executionId = `v02-${Date.now()}`;
const executionTimestamp = new Date().toISOString();
const source = 'v0.2';

// ── Backtest Engine ───────────────────────────────────────────────────────────

function runBacktest(candles, threshold, startIndex = 100) {
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

  for (let i = startIndex; i < candles.length; i++) {
    const candle = candles[i];
    const sigResult = signalEngine.evaluate(candles, i);

    // HTF timeframe signal (EMA100)
    const ema100 = signalEngine.calculateEMA(candles.slice(0, i + 1), 100);
    const timeframeSignal = candle.close > ema100 ? 'go' : 'no-go';

    const enginesInput = {
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
    };

    const verdict = kernel.evaluate(enginesInput);
    const closePrice = candle.close;

    // Exit logic
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

    // Entry logic
    if (!position && verdict.signal !== 'caution') {
      const R = closePrice * R_DISTANCE;
      const amount = (balance * 0.25) / closePrice;
      if (verdict.signal === 'go') {
        position = { type: 'LONG', entryPrice: closePrice, entryIndex: i, amount, takeProfit: closePrice + RISK_REWARD * R, stopLoss: closePrice - R };
      } else if (verdict.signal === 'no-go') {
        position = { type: 'SHORT', entryPrice: closePrice, entryIndex: i, amount, takeProfit: closePrice - RISK_REWARD * R, stopLoss: closePrice + R };
      }
    }

    // Track drawdown
    const equity = balance + (position
      ? (position.type === 'LONG' ? (closePrice - position.entryPrice) * position.amount : (position.entryPrice - closePrice) * position.amount)
      : 0);
    if (equity > peakBalance) peakBalance = equity;
    const dd = ((peakBalance - equity) / peakBalance) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  const netPnlPct = ((balance - initialBalance) / initialBalance) * 100;
  return { trades, netPnlPct, maxDD, tradeCount: trades.length };
}

// ── ERR Calculation ────────────────────────────────────────────────────────────

function calculateERR(baselineResult, perturbedResult) {
  if (baselineResult.netPnlPct === 0) return NaN;
  return perturbedResult.netPnlPct / baselineResult.netPnlPct;
}

// ── Recent Drawdown Detection ──────────────────────────────────────────────────

function hasRecentDrawdown(trades, lookback, maxAllowedDD) {
  const recent = trades.slice(-lookback);
  let cumulativePnl = 0;
  let peak = 0;
  for (const t of recent) {
    cumulativePnl += t.pnl;
    if (cumulativePnl > peak) peak = cumulativePnl;
    const dd = peak > 0 ? ((peak - cumulativePnl) / Math.abs(peak)) * 100 : 0;
    if (dd > maxAllowedDD) return true;
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('='.repeat(65));
console.log('  LYZER EDGE — v0.2 PARAMETER UPDATER (OFFLINE)');
console.log('='.repeat(65));
console.log(`  Execution ID : ${executionId}`);
console.log(`  Timestamp    : ${executionTimestamp}`);
console.log(`  Authority    : ${source} (EXCLUSIVE — do not run with v0.3 in same cycle)`);
console.log(`  Current Config: threshold=${activeConfig.confidenceThreshold}, version=${activeConfig.version}`);
console.log('='.repeat(65));

const { BTCUSDT: btcCandles } = getHistoricalCandles();
const currentThreshold = activeConfig.confidenceThreshold;

// Step 1: Run baseline backtest
console.log('\n[1/4] Running baseline backtest...');
const baseline = runBacktest(btcCandles, currentThreshold);
console.log(`      Trades: ${baseline.tradeCount} | Net PnL: ${baseline.netPnlPct.toFixed(2)}% | Max DD: ${baseline.maxDD.toFixed(2)}%`);

// Step 2: Check minimum trade count
if (baseline.tradeCount < CLAMPS.MIN_TRADES) {
  console.log(`\n[GOVERNANCE] Insufficient trade count (${baseline.tradeCount} < ${CLAMPS.MIN_TRADES}).`);
  console.log('             No update applied. Current config retained.');
  console.log('\n✅ Result: NO_CHANGE (insufficient data)');
  process.exit(0);
}

// Step 3: Calculate ERR via perturbed run
console.log('\n[2/4] Running perturbed confidence backtest (ERR calculation)...');
const perturbed = runBacktest(btcCandles, currentThreshold + 10, 100); // +10 threshold = tighter filter
const rollingERR = calculateERR(baseline, perturbed);
console.log(`      Perturbed Trades: ${perturbed.tradeCount} | Perturbed PnL: ${perturbed.netPnlPct.toFixed(2)}%`);
console.log(`      Edge Retention Ratio (ERR): ${isNaN(rollingERR) ? 'NaN' : rollingERR.toFixed(4)} (target > ${CLAMPS.TARGET_ERR})`);

// Step 4: Determine adjustment decision
console.log('\n[3/4] Evaluating adjustment rules...');

let newThreshold = currentThreshold;
let decision = 'NO_CHANGE';
let reason = '';

const recentDD = hasRecentDrawdown(baseline.trades, CLAMPS.RECENT_DRAWDOWN_LOOKBACK, CLAMPS.MAX_ALLOWED_DD);

if (baseline.maxDD > CLAMPS.MAX_ALLOWED_DD) {
  // Tighten — performance is poor
  newThreshold = Math.min(CLAMPS.MAX_THRESHOLD, currentThreshold + CLAMPS.MAX_STEP);
  decision = 'TIGHTENED';
  reason = `maxDD=${baseline.maxDD.toFixed(2)}% > limit=${CLAMPS.MAX_ALLOWED_DD}%`;
} else if (!isNaN(rollingERR) && rollingERR > CLAMPS.TARGET_ERR && !recentDD) {
  // Relax — ERR is healthy and no recent drawdown (anti-revenge rule)
  newThreshold = Math.max(CLAMPS.MIN_THRESHOLD, currentThreshold - CLAMPS.MAX_STEP);
  decision = 'RELAXED';
  reason = `ERR=${rollingERR.toFixed(4)} > target=${CLAMPS.TARGET_ERR}, no recent DD`;
} else if (recentDD) {
  // Never relax after recent drawdown — this is the anti-revenge rule
  decision = 'NO_CHANGE';
  reason = `TRAVA_DD_RECENTE: recent drawdown detected within last ${CLAMPS.RECENT_DRAWDOWN_LOOKBACK} trades`;
} else {
  decision = 'NO_CHANGE';
  reason = `ERR=${isNaN(rollingERR) ? 'NaN' : rollingERR.toFixed(4)} insufficient or maxDD within bounds`;
}

// Apply absolute clamps
newThreshold = Math.max(CLAMPS.MIN_THRESHOLD, Math.min(CLAMPS.MAX_THRESHOLD, newThreshold));

console.log(`      Decision  : ${decision}`);
console.log(`      Reason    : ${reason}`);
console.log(`      Threshold : ${currentThreshold} → ${newThreshold}`);
console.log(`      Clamps    : [${CLAMPS.MIN_THRESHOLD}, ${CLAMPS.MAX_THRESHOLD}]`);

// Step 5: Write new config if changed
console.log('\n[4/4] Writing new activeConfig.js...');

if (decision === 'NO_CHANGE') {
  console.log('      No change required. activeConfig.js not modified.');
  console.log('\n✅ Result: NO_CHANGE');
  console.log('='.repeat(65));
  process.exit(0);
}

const newVersion = incrementVersion(activeConfig.version);

const configContent = `/**
 * @fileoverview Lyzer Edge — Active Runtime Configuration
 *
 * @generated
 * THIS FILE IS A GENERATED ARTIFACT.
 * DO NOT EDIT MANUALLY.
 *
 * Generated by  : ${source}
 * Execution ID  : ${executionId}
 * Timestamp     : ${executionTimestamp}
 * Decision      : ${decision}
 * Reason        : ${reason}
 * Previous      : threshold=${currentThreshold}, version=${activeConfig.version}
 *
 * @invariant Runtime receives configuration. Runtime never resolves configuration.
 */

/** @type {Readonly<{ version: string, validFrom: string, confidenceThreshold: number }>} */
export const activeConfig = Object.freeze({
  version: '${newVersion}',
  validFrom: '${executionTimestamp}',
  confidenceThreshold: ${newThreshold},
});
`;

const configPath = path.join(__dirname, 'src', 'db', 'activeConfig.js');
writeFileSync(configPath, configContent, 'utf8');

console.log(`      Written: src/db/activeConfig.js`);
console.log(`      Version: ${activeConfig.version} → ${newVersion}`);
console.log(`      Threshold: ${currentThreshold} → ${newThreshold}`);
console.log(`\n✅ Result: ${decision} — ${reason}`);
console.log('='.repeat(65));

// ── Helpers ───────────────────────────────────────────────────────────────────

function incrementVersion(version) {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}
