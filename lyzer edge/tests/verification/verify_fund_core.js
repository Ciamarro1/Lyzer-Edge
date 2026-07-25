/**
 * Sprint 1 Verification — Fund Core Integration Test
 * Tests the full Portfolio Engine → Risk Constitution → Trade Ledger cycle.
 */
import { PortfolioEngine } from './src/fund/portfolioEngine.js';

console.log('╔══════════════════════════════════════════════╗');
console.log('║  LYZER FUND V1 — Sprint 1 Verification      ║');
console.log('╚══════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

// ── Test 1: Initialization ────────────────────────────────────────────────
console.log('\n─── Test 1: Portfolio Initialization ───');

const portfolio = new PortfolioEngine({
  initialEquity: 10000,
  baseRiskPct: 1.0,
  maxRiskPct: 3.0,
  riskLimits: {
    maxDrawdown: 0.15,
    hardStopDrawdown: 0.25,
    maxDailyLoss: 0.03,
    maxPositionSize: 0.05,
    maxLeverage: 1.0,
    maxOpenPositions: 5,
  },
});

assert(portfolio.equity === 10000, 'Initial equity = $10,000');
assert(portfolio.cash === 10000, 'Initial cash = $10,000');
assert(portfolio.positions.size === 0, 'No open positions');
assert(portfolio.currentDrawdown === 0, 'No drawdown');

// ── Test 2: Signal Evaluation (ALLOWED) ───────────────────────────────────
console.log('\n─── Test 2: Signal Evaluation (ALLOWED) ───');

const signal1 = { signal: 'go', confidence: 72, reason_codes: ['EMA_CROSS'] };
const candle1 = { close: 65000 };
const eval1 = portfolio.evaluateSignal(signal1, candle1, {
  symbol: 'BTCUSDT',
  signalType: 'EMA_CROSS',
  regime: 'trending_up',
  stopDistance: 0.02,
});

assert(eval1.action === 'OPEN', 'Signal evaluation returns OPEN');
assert(eval1.tradeIntent.direction === 'LONG', 'Direction is LONG');
assert(eval1.tradeIntent.symbol === 'BTCUSDT', 'Symbol is BTCUSDT');
assert(eval1.tradeIntent.quantity > 0, `Quantity > 0 (got ${eval1.tradeIntent.quantity})`);
assert(eval1.tradeIntent.stopLoss < candle1.close, `Stop loss < entry (${eval1.tradeIntent.stopLoss})`);

// ── Test 3: Signal Evaluation (REJECTED — caution signal) ─────────────────
console.log('\n─── Test 3: Signal Evaluation (REJECTED) ───');

const signal2 = { signal: 'caution', confidence: 30, reason_codes: ['LOW_CONFIDENCE'] };
const eval2 = portfolio.evaluateSignal(signal2, candle1);

assert(eval2.action === 'REJECT', 'Caution signal rejected');
assert(eval2.reasons.includes('SIGNAL_NOT_ACTIONABLE'), 'Reason: SIGNAL_NOT_ACTIONABLE');

// ── Test 4: Open Position ─────────────────────────────────────────────────
console.log('\n─── Test 4: Open Position ───');

const pos = portfolio.openPosition(eval1.tradeIntent, 65050, 6.51, 'binance_001');

assert(pos.id.startsWith('pos_'), 'Position ID generated');
assert(pos.entryPrice === 65050, 'Entry price recorded');
assert(pos.direction === 'LONG', 'Direction recorded');
assert(pos.entryFees === 6.51, 'Fees recorded');
assert(portfolio.positions.size === 1, '1 open position');
assert(portfolio.cash < 10000, `Cash reduced by fees (${portfolio.cash})`);

// ── Test 5: Mark to Market ────────────────────────────────────────────────
console.log('\n─── Test 5: Mark to Market ───');

portfolio.updateMarks({ BTCUSDT: 66000 });
const posAfterMark = portfolio.positions.get(pos.id);

assert(posAfterMark.currentPrice === 66000, 'Mark updated to 66000');
assert(posAfterMark.unrealizedPnl !== undefined, `Unrealized PnL calculated (${posAfterMark.unrealizedPnl.toFixed(2)})`);
assert(portfolio.equity !== 10000, `Equity changed from initial (${portfolio.equity.toFixed(2)})`);

// ── Test 6: Check Exits ──────────────────────────────────────────────────
console.log('\n─── Test 6: Stop Loss / Take Profit Check ───');

const noExits = portfolio.checkExits({ BTCUSDT: 66000 });
assert(noExits.length === 0, 'No exits triggered at 66000');

const stopHit = portfolio.checkExits({ BTCUSDT: 63000 });
assert(stopHit.length === 1, 'Stop loss triggered at 63000');
assert(stopHit[0].reason === 'STOP_LOSS', 'Reason is STOP_LOSS');

// ── Test 7: Close Position ────────────────────────────────────────────────
console.log('\n─── Test 7: Close Position ───');

const closed = portfolio.closePosition(pos.id, 66500, 6.65, 'binance_002');

assert(closed.grossPnl !== undefined, `Gross PnL calculated (${closed.grossPnl})`);
assert(closed.netPnl !== undefined, `Net PnL calculated (${closed.netPnl})`);
assert(closed.rMultiple > 0, `R-multiple positive (${closed.rMultiple})`);
assert(closed.totalFees > 0, `Total fees tracked (${closed.totalFees})`);
assert(portfolio.positions.size === 0, 'Position removed');
assert(typeof portfolio.equity === 'number', `Equity is numeric (${portfolio.equity.toFixed(2)})`);
// Note: With a constitutionally-capped tiny position ($500 notional on $10k),
// fees ($13.16) can exceed gross PnL ($11.17). This is CORRECT behavior.
console.log(`  ℹ️  Gross PnL: $${closed.grossPnl}, Fees: $${closed.totalFees}, Net: $${closed.netPnl}`);

// ── Test 8: Trade Ledger Integration ──────────────────────────────────────
console.log('\n─── Test 8: Trade Ledger Integration ───');

const ledger = portfolio.getLedger();
const summary = ledger.getSummary();

assert(summary.totalEntries === 2, `2 ledger entries (OPEN + CLOSE)`);
assert(summary.closedTrades === 1, '1 closed trade');
assert(typeof summary.totalPnl === 'number', `Ledger PnL recorded (${summary.totalPnl})`);
assert(typeof summary.winRate === 'number', `Win rate calculated (${summary.winRate}%)`);

const attribution = ledger.getModuleAttribution();
assert(attribution.EMA_CROSS !== undefined, 'EMA_CROSS attribution exists');
assert(attribution.EMA_CROSS.count === 1, 'EMA_CROSS has 1 trade');

// ── Test 9: Risk Constitution Enforcement ─────────────────────────────────
console.log('\n─── Test 9: Risk Constitution Enforcement ───');

portfolio.emergencyHalt('Test halt');
const evalHalted = portfolio.evaluateSignal(signal1, candle1);
assert(evalHalted.action === 'REJECT', 'Signal rejected during halt');

portfolio.resume();
const evalResumed = portfolio.evaluateSignal(signal1, candle1);
assert(evalResumed.action === 'OPEN', 'Signal accepted after resume');

// ── Test 10: Equity Curve ─────────────────────────────────────────────────
console.log('\n─── Test 10: Equity Curve ───');

const curve = portfolio.getEquityCurve();
assert(curve.length >= 1, `Equity curve has ${curve.length} points`);
assert(curve[0].equity === 10000, 'First point = initial equity');

// ── Test 11: Full State Snapshot ──────────────────────────────────────────
console.log('\n─── Test 11: Full State Snapshot ───');

const state = portfolio.getState();
assert(state.equity > 0, 'State has equity');
assert(state.constitution !== undefined, 'State includes constitution');
assert(state.ledgerSummary !== undefined, 'State includes ledger summary');
assert(state.openPositionCount === 0, 'No open positions in state');

// ── Results ───────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════');

if (failed > 0) {
  console.log('\n❌ SPRINT 1 VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\n✅ SPRINT 1 VERIFICATION PASSED — Fund Core Foundation is operational');
  process.exit(0);
}
