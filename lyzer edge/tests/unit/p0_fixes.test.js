/**
 * P0 Fix Regression Tests — Lyzer Edge
 *
 * Covers the highest-risk P0 fixes applied to the codebase:
 *   Fix A — MOL normalization in court.js (MOL was dead: always canExecute=true)
 *   Fix C — releaseDailyCapital() in streamEngine.js (daily capital never released)
 *   Fix D — getCourtSecret() strict env enforcement in permission.js
 *   Fix F — admin auth via headers only in server.js (query adminKey removed)
 *   Fix I — alphaDiscoveryEngine.js promise rejection propagation (hang fix)
 *
 * Note: permission.js requires process.env.COURT_SECRET_KEY in a Node context;
 * every suite that touches the court/tokens sets it in beforeEach.
 */

import { test, expect, beforeEach, afterEach, describe, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { ConstitutionalCourt } from '../../packages/lyzer-constitution/src/eca/court.js';
import { MetaObservationLayer } from '../../packages/lyzer-constitution/src/eca/mol.js';
import { getCourtSecret, PermissionToken, verifyToken } from '../../packages/lyzer-constitution/src/eca/permission.js';
import { StreamEngine } from '../backend/streamEngine.js';
import { AlphaDiscoveryEngine } from '../backend/alphaDiscoveryEngine.js';

// ---------------------------------------------------------------------------
// Module mocks (hoisted) — used ONLY by the Fix F suite to boot server.js
// without opening sockets, hitting the network, or touching SQLite.
// The real StreamEngine/court/permission modules are intentionally NOT mocked.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => {
  const captured = { uses: [], gets: [], posts: [] };
  const app = {
    use: (...args) => { captured.uses.push(args); return app; },
    get: (...args) => { captured.gets.push(args); return app; },
    post: (...args) => { captured.posts.push(args); return app; },
  };
  return { captured, app };
});

vi.mock('dotenv/config', () => ({}));
vi.mock('express', () => {
  const fn = () => h.app;
  fn.json = () => (req, res, next) => next();
  fn.static = () => (req, res, next) => next();
  return { default: fn };
});
vi.mock('http', () => ({
  default: { createServer: () => ({ listen: () => {}, on: () => {} }) },
}));
vi.mock('ws', () => ({ WebSocketServer: class { on() {} } }));
vi.mock('../backend/statePersistence.js', () => ({
  loadEngineState: () => {},
  saveEngineState: () => {},
  clearEngineState: () => {},
}));
vi.mock('../backend/telegram.js', () => ({
  sendTelegramAlert: async () => ({}),
  formatTradeAlert: () => '',
  formatSystemAlert: () => '',
}));
vi.mock('../backend/db.js', () => ({
  default: {
    insertExperimentTrade: async () => {},
    getExperiment: async () => null,
    getExperimentSnapshot: async () => null,
    getExperimentTrades: async () => [],
  },
}));
vi.mock('../backend/experimentManager.js', () => ({
  ExperimentManager: class {
    constructor() { this.alphaDiscoveryEngine = { discoverAlpha: async () => ({}) }; }
    initialize() { return Promise.resolve(); }
    getActiveExperiment() { return Promise.resolve(null); }
    getDashboardData() { return Promise.resolve({}); }
    getRanking() { return Promise.resolve([]); }
  },
}));
vi.mock('../backend/lyzerArcheologist.js', () => ({
  LyzerArcheologist: class {
    constructor() {}
    analyzeCodebaseDNA() { return Promise.resolve({}); }
    getModuleImportanceRankings() { return []; }
    detectDeadCodeCandidates() { return []; }
    generatePhilosopherReport() { return {}; }
  },
}));
vi.mock('../backend/lyzerMindMRI.js', () => ({
  LyzerMindMRI: class {
    constructor() {}
    runFullMRI() { return Promise.resolve({}); }
  },
}));
vi.mock('../src/observability/index.js', () => ({
  register: { contentType: 'text/plain', metrics: async () => '' },
  recordTickReceived: () => {},
  recordTickDuration: () => {},
  recordCsrlDuration: () => {},
  recordCclistEvaluation: () => {},
  recordEcaEvaluation: () => {},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function flatCandles(n, price) {
  const list = [];
  const start = Date.now() - n * 60000;
  for (let i = 0; i < n; i++) {
    list.push({
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 10,
      openTime: start + i * 60000,
      timestamp: start + i * 60000,
      closed: true,
    });
  }
  return list;
}

function makeCandle(open, high, low, close) {
  const t = Date.now();
  return { open, high, low, close, volume: 10, openTime: t, timestamp: t, closed: true };
}

// ---------------------------------------------------------------------------
// Fix A — MOL normalization (court.js)
// ---------------------------------------------------------------------------
describe('Fix A — MOL normalization in court.requestPermission', () => {
  beforeEach(() => {
    process.env.COURT_SECRET_KEY = 'test-secret';
  });

  function freshCourt() {
    return new ConstitutionalCourt({}, { sclThreshold: 3, minCooldown: 3 });
  }

  test('(a) production convention — kernelResult passed as rawState → MOL enters VETO', () => {
    const c = freshCourt();
    // Production call site (streamEngine.js): court.requestPermission(action, kernelResult, { eef, reason })
    const kernelResult = {
      eef: false,
      dvf: 0,
      trg: 0,
      epistemic_authority: 'VETO',
      reason_codes: ['VETO_REALITY_DIVERGENCE'],
      raw_metrics: { scale_divergence: 0.9 },
    };
    const requestPayload = { eef: false, reason: 'VETO_REALITY_DIVERGENCE' };

    const token = c.requestPermission('EXECUTE_TRADE', kernelResult, requestPayload);

    expect(c.mol.state).toBe('VETO');
    expect(c.mol.canExecute).not.toBeDefined(); // MOL does not expose canExecute as state
    expect(token.granted).toBe(false);
    // MOL metrics are injected into the observed state for ledger traceability
    expect(kernelResult.mol_state).toBe('VETO');
    expect(kernelResult.doi).toBe(1);
    expect(kernelResult.scl).toBe(0);
  });

  test('(a2) requestPayload epistemic_authority takes precedence over rawState', () => {
    const c = freshCourt();
    // Even if rawState claims OBSERVED, an explicit VETO in the payload must veto
    const token = c.requestPermission(
      'EXECUTE_TRADE',
      { trg: 0, dvf: 0, epistemic_authority: 'OBSERVED', reason_codes: ['OK'] },
      { eef: false, epistemic_authority: 'VETO', reason_codes: ['VETO_KERNEL'] }
    );
    expect(c.mol.state).toBe('VETO');
    expect(token.granted).toBe(false);
  });

  test('(a3) scale_divergence is normalized from raw_metrics so false recovery is caught', () => {
    const c = freshCourt();
    // Enter VETO first
    c.requestPermission(
      'EXECUTE_TRADE',
      { trg: 0, dvf: 0, scale_divergence: 0.9 },
      { eef: false, epistemic_authority: 'VETO', reason_codes: ['VETO_X'] }
    );
    expect(c.mol.state).toBe('VETO');

    // Kernel claims recovery, but high SDS is hiding in raw_metrics (production kernel shape).
    // Without the raw_metrics normalization this would look like a stable tick (scl++) → false awakening.
    const rec = c.requestPermission(
      'EXECUTE_TRADE',
      { trg: 0.2, dvf: 0, eef: true, epistemic_authority: 'OBSERVED', reason_codes: ['OK'], raw_metrics: { scale_divergence: 0.9 } },
      { eef: true, reason: 'OK' }
    );
    expect(rec.reason).toBe('VETO_MOL_RECOVERY_PENDING');
    expect(c.mol.structuralCoherenceLock).toBe(0); // high SDS → coherence reset, not incremented
    expect(c.mol.state).toBe('RECOVERY');
  });

  test('(b) test convention — kernelResult passed as requestPayload → MOL enters VETO', () => {
    const c = freshCourt();
    const rawState = { trg: 0, dvf: 0, scale_divergence: 0.9 };
    const kernelResult = { eef: false, epistemic_authority: 'VETO', reason_codes: ['VETO_REALITY_DIVERGENCE'] };

    const token = c.requestPermission('EXECUTE_TRADE', rawState, kernelResult);

    expect(c.mol.state).toBe('VETO');
    expect(token.granted).toBe(false);
    expect(rawState.mol_state).toBe('VETO');
  });

  test('(c) RECOVERY blocks execution with VETO_MOL_RECOVERY_PENDING', () => {
    const c = freshCourt();

    // 1. kernel enters VETO
    const veto = c.requestPermission(
      'EXECUTE_TRADE',
      { trg: 0, dvf: 0, scale_divergence: 0.9 },
      { eef: false, epistemic_authority: 'VETO', reason_codes: ['VETO_ONTOLOGICAL_COLLAPSE'] }
    );
    expect(veto.granted).toBe(false);
    expect(c.mol.state).toBe('VETO');

    // 2. kernel claims recovery but MOL has not confirmed enough stable ticks
    const rec = c.requestPermission(
      'EXECUTE_TRADE',
      { trg: 0.2, dvf: 0, scale_divergence: 0.2 },
      { eef: true, epistemic_authority: 'OBSERVED', reason_codes: ['OK'] }
    );
    expect(rec.granted).toBe(false);
    expect(rec.reason).toBe('VETO_MOL_RECOVERY_PENDING');
    expect(c.mol.state).toBe('RECOVERY');
    expect(c.mol.structuralCoherenceLock).toBe(1);
  });

  test('(d) after sclThreshold stable ticks (sds<=0.7) → MOL awakens to EXECUTE', () => {
    const c = freshCourt();

    // VETO tick
    c.requestPermission(
      'EXECUTE_TRADE',
      { trg: 0, dvf: 0, scale_divergence: 0.9 },
      { eef: false, epistemic_authority: 'VETO', reason_codes: ['VETO_X'] }
    );
    expect(c.mol.state).toBe('VETO');

    // 3 stable recovery ticks
    let lastToken;
    for (let i = 1; i <= 3; i++) {
      lastToken = c.requestPermission(
        'EXECUTE_TRADE',
        { trg: 0.2, dvf: 0, scale_divergence: 0.5 },
        { eef: true, epistemic_authority: 'OBSERVED', reason_codes: ['OK'] }
      );
      if (i < 3) {
        expect(c.mol.state).toBe('RECOVERY');
        expect(lastToken.granted).toBe(false);
        expect(lastToken.reason).toBe('VETO_MOL_RECOVERY_PENDING');
        expect(c.mol.structuralCoherenceLock).toBe(i);
      }
    }

    expect(c.mol.state).toBe('EXECUTE');
    expect(c.mol.structuralCoherenceLock).toBe(0);
    expect(c.mol.durationOfInaction).toBe(0);
    expect(lastToken.granted).toBe(true);
  });

  test('MOL direct: sds exactly at 0.7 counts as a stable recovery tick', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 1, minCooldown: 1 });
    mol.state = 'RECOVERY';
    mol.durationOfInaction = 1;
    const s = mol.evaluateState({ scale_divergence: 0.7 }, { epistemic_authority: 'OBSERVED' });
    expect(s.molState).toBe('EXECUTE');
    expect(s.canExecute).toBe(true);
  });

  test('MOL direct: sds above 0.7 resets coherence (false awakening protection)', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 3, minCooldown: 1 });
    mol.state = 'RECOVERY';
    mol.durationOfInaction = 2;
    mol.structuralCoherenceLock = 2;
    const s = mol.evaluateState({ scale_divergence: 0.9 }, { epistemic_authority: 'INFERRED' });
    expect(s.molState).toBe('RECOVERY');
    expect(s.canExecute).toBe(false);
    expect(mol.structuralCoherenceLock).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fix C — releaseDailyCapital (streamEngine.js)
// ---------------------------------------------------------------------------
describe('Fix C — releaseDailyCapital', () => {
  beforeEach(() => {
    process.env.COURT_SECRET_KEY = 'test-secret';
    process.env.LIVE_TRADING_ENABLED = 'true';
    process.env.MAX_DAILY_CAPITAL = '1000000';
  });

  test('releaseDailyCapital deducts entryPrice × quantity from dailyCapitalUsed', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    engine.dailyCapitalUsed = 500;
    engine.releaseDailyCapital({ entryPrice: 100, quantity: 2.5 });
    expect(engine.dailyCapitalUsed).toBe(250);
  });

  test('releaseDailyCapital never goes negative when released exceeds used', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    engine.dailyCapitalUsed = 10;
    engine.releaseDailyCapital({ entryPrice: 100, quantity: 2.5 }); // 250 released, only 10 used
    expect(engine.dailyCapitalUsed).toBe(0);
    expect(engine.dailyCapitalUsed).toBeGreaterThanOrEqual(0);
  });

  test('full lifecycle: open position increments capital, SL close releases it back to 0', async () => {
    const engine = new StreamEngine({ mode: 'LIVE' });
    engine.maxDailyCapital = 1_000_000;
    engine.dailyCapitalUsed = 0;
    engine.stabilizationWindowMs = 0;
    engine.bootTime = Date.now();
    engine.execution = { placeOrder: async () => ({ orderId: 'test' }) };
    engine.dualMonitor = { calculateDivergence: async () => 0.0 };
    engine.divergenceDetector = { detect: () => 0.1 };
    engine.mtfCandles['1m'] = flatCandles(25, 100);
    engine.mtfCandles['5m'] = flatCandles(10, 100);
    engine.mtfCandles['15m'] = flatCandles(15, 100);
    engine.mtfCandles['1h'] = flatCandles(10, 100);
    engine.candles = flatCandles(25, 100);
    // Deterministic kernel: EXECUTE (court is real and must grant)
    engine.truthKernel = {
      evaluate: () => ({
        eef: true,
        dvf: 0.5,
        trg: 0.5,
        tension: 0.5,
        isConsensus: false,
        reason_codes: ['EXECUTABLE'],
        epistemic_authority: 'OBSERVED',
        raw_metrics: { scale_divergence: 0.1 },
      }),
    };

    // OPEN → dailyCapitalUsed must go above 0 (LIVE mode increments by est. cost)
    await engine.processCandle(makeCandle(100, 101, 99, 100), 1);
    expect(engine.activePosition).toBeDefined();
    expect(engine.dailyCapitalUsed).toBeGreaterThan(0);
    const pos = engine.activePosition;
    expect(engine.dailyCapitalUsed).toBeCloseTo(pos.entryPrice * pos.quantity, 8);

    // CLOSE via stop-loss (position is SHORT for flat signal → high >= stopLoss closes)
    engine.truthKernel = {
      evaluate: () => ({
        eef: false,
        dvf: 0,
        trg: 0,
        reason_codes: ['FLAT'],
        epistemic_authority: 'OBSERVED',
        raw_metrics: { scale_divergence: 0.1 },
      }),
    };
    await engine.processCandle(makeCandle(101.5, 103, 100, 102), 2);
    expect(engine.activePosition).toBeNull();
    expect(engine.dailyCapitalUsed).toBeCloseTo(0, 8);
    expect(engine.dailyCapitalUsed).toBeGreaterThanOrEqual(0);
    expect(engine.tradeHistory.length).toBe(1);
  });

  test('close path releases capital for an externally-managed position (manual close path)', async () => {
    const engine = new StreamEngine({ mode: 'LIVE' });
    engine.maxDailyCapital = 1_000_000;
    engine.stabilizationWindowMs = 0;
    engine.bootTime = Date.now();
    engine.execution = { placeOrder: async () => ({}) };
    engine.dualMonitor = { calculateDivergence: async () => 0.0 };
    engine.divergenceDetector = { detect: () => 0.1 };
    engine.mtfCandles['1m'] = flatCandles(25, 100);
    engine.mtfCandles['5m'] = flatCandles(10, 100);
    engine.mtfCandles['15m'] = flatCandles(15, 100);
    engine.mtfCandles['1h'] = flatCandles(10, 100);
    engine.candles = flatCandles(25, 100);
    engine.truthKernel = {
      evaluate: () => ({
        eef: false,
        dvf: 0,
        trg: 0,
        reason_codes: ['FLAT'],
        epistemic_authority: 'OBSERVED',
        raw_metrics: { scale_divergence: 0.1 },
      }),
    };

    // Seed an active position as if opened externally (server.js manual close path)
    engine.activePosition = {
      id: 'ext-1',
      timestamp: Date.now(),
      direction: 'SHORT',
      entryPrice: 100,
      stopLoss: 101.5,
      takeProfit: 98.5,
      quantity: 0.001,
      signal: { type: 'SHORT', confidence: 0.5 },
      regime: 'MTF_OBSERVATION',
      governanceDecision: 'ALLOW',
      openCandleIndex: 0,
    };
    engine.dailyCapitalUsed = 0.1; // 100 * 0.001

    await engine.processCandle(makeCandle(101.6, 102, 100, 101), 2);

    expect(engine.activePosition).toBeNull();
    expect(engine.dailyCapitalUsed).toBeCloseTo(0, 8);
    expect(engine.dailyCapitalUsed).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Fix D — getCourtSecret / PermissionToken HMAC (permission.js)
// ---------------------------------------------------------------------------
describe('Fix D — COURT_SECRET_KEY enforcement & HMAC tokens', () => {
  beforeEach(() => {
    process.env.COURT_SECRET_KEY = 'test-secret';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.COURT_SECRET_KEY;
  });

  test('getCourtSecret returns the secret from the environment', () => {
    expect(getCourtSecret()).toBe('test-secret');
  });

  test('getCourtSecret throws when COURT_SECRET_KEY is missing (no hardcoded fallback)', () => {
    vi.stubGlobal('window', undefined); // force the Node branch (non-browser)
    delete process.env.COURT_SECRET_KEY;
    expect(() => getCourtSecret()).toThrow(/COURT_SECRET_KEY/);
  });

  test('PermissionToken construction throws when secret is missing (no forgeable fallback)', () => {
    vi.stubGlobal('window', undefined);
    delete process.env.COURT_SECRET_KEY;
    expect(() => new PermissionToken('EXECUTE_TRADE', true, 'ALLOW')).toThrow(/COURT_SECRET_KEY/);
  });

  test('token signs the payload with HMAC-SHA256 and verifies with the same secret', () => {
    const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, 'test-secret');
    const payload = `${token.id}|${token.action}|${token.granted}|${token.reason}|${token.timestamp}`;
    const expected = crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');
    expect(token.signature).toBe(expected);
    expect(verifyToken(token, 'test-secret')).toBe(true);
    expect(Object.isFrozen(token)).toBe(true); // tokens are immutable
  });

  test('verifyToken rejects a token signed with a different secret', () => {
    const token = new PermissionToken('EXECUTE_TRADE', true, 'ALLOW', {}, 'secret-a');
    expect(verifyToken(token, 'secret-a')).toBe(true);
    expect(verifyToken(token, 'secret-b')).toBe(false);
  });

  test('default secret resolution uses env, so tokens self-verify', () => {
    const token = new PermissionToken('EXECUTE_TRADE', false, 'VETO_X');
    expect(verifyToken(token)).toBe(true);
  });

  test('verifyToken guards malformed tokens', () => {
    expect(verifyToken(null)).toBe(false);
    expect(verifyToken(undefined)).toBe(false);
    expect(verifyToken({})).toBe(false);
    expect(verifyToken({ id: 'x', signature: 'y' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fix F — admin auth via headers only (server.js)
// ---------------------------------------------------------------------------
describe('Fix F — admin auth: query adminKey removed (server.js routes)', () => {
  let exportRoute;
  let testTelegramRoute;

  beforeAll(async () => {
    vi.useFakeTimers();
    process.env.COURT_SECRET_KEY = 'test-secret';
    process.env.ADMIN_API_KEY = 'admin-secret-123';
    await import('../backend/server.js');
    exportRoute = h.captured.gets.find(([p]) => p === '/api/trades/export');
    testTelegramRoute = h.captured.gets.find(([p]) => p === '/api/test-telegram');
  });

  afterAll(() => {
    vi.useRealTimers();
    delete process.env.ADMIN_API_KEY;
    delete process.env.COURT_SECRET_KEY;
  });

  beforeEach(() => {
    process.env.ADMIN_API_KEY = 'admin-secret-123';
  });

  function callMiddleware(mw, req) {
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      setHeader() { return this; },
      end() { return this; },
    };
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
  }

  test('routes are registered with (path, middleware, handler)', () => {
    expect(exportRoute).toBeDefined();
    expect(exportRoute.length).toBe(3);
    expect(testTelegramRoute).toBeDefined();
    expect(testTelegramRoute.length).toBe(3);
  });

  test('?adminKey= query param no longer authenticates → 401', () => {
    const { res, nextCalled } = callMiddleware(exportRoute[1], {
      headers: {},
      query: { adminKey: 'admin-secret-123' },
    });
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  test('x-admin-key header authenticates → next()', () => {
    const { nextCalled } = callMiddleware(exportRoute[1], {
      headers: { 'x-admin-key': 'admin-secret-123' },
      query: {},
    });
    expect(nextCalled).toBe(true);
  });

  test('Authorization: Bearer <key> also authenticates → next()', () => {
    const { nextCalled } = callMiddleware(exportRoute[1], {
      headers: { authorization: 'Bearer admin-secret-123' },
      query: {},
    });
    expect(nextCalled).toBe(true);
  });

  test('missing or wrong credentials → 401', () => {
    const missing = callMiddleware(exportRoute[1], { headers: {}, query: {} });
    expect(missing.res.statusCode).toBe(401);
    expect(missing.nextCalled).toBe(false);

    const wrong = callMiddleware(exportRoute[1], { headers: { 'x-admin-key': 'wrong' }, query: {} });
    expect(wrong.res.statusCode).toBe(401);
    expect(wrong.nextCalled).toBe(false);
  });

  test('when ADMIN_API_KEY is unset, requests are not blocked', () => {
    delete process.env.ADMIN_API_KEY;
    const { nextCalled } = callMiddleware(exportRoute[1], { headers: {}, query: {} });
    expect(nextCalled).toBe(true);
  });

  test('/api/test-telegram is protected by the same middleware', () => {
    const bad = callMiddleware(testTelegramRoute[1], { headers: {}, query: { adminKey: 'admin-secret-123' } });
    expect(bad.res.statusCode).toBe(401);
    expect(bad.nextCalled).toBe(false);

    const ok = callMiddleware(testTelegramRoute[1], { headers: { 'x-admin-key': 'admin-secret-123' }, query: {} });
    expect(ok.nextCalled).toBe(true);
  });

  test('export endpoint serves data end-to-end with valid header auth', () => {
    const res = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k, v) { this.headers[k] = v; return this; },
      json(b) { this.body = b; return this; },
    };
    const req = { headers: { 'x-admin-key': 'admin-secret-123' }, query: {} };
    exportRoute[1](req, res, () => exportRoute[2](req, res));
    expect(res.body).not.toBeNull();
    expect(Array.isArray(res.body.trades)).toBe(true);
    expect(res.body.totalTrades).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fix I — alphaDiscoveryEngine promise propagation (hang fix)
// ---------------------------------------------------------------------------
describe('Fix I — alphaDiscoveryEngine promise propagation', () => {
  function makeDb({ rows = [], experiments = [], allError = null } = {}) {
    return {
      db: {
        all: (sql, params, cb) => {
          if (allError) return cb(allError, null);
          cb(null, rows);
        },
      },
      getAllExperiments: () => {
        if (experiments instanceof Error) return Promise.reject(experiments);
        return Promise.resolve(experiments);
      },
    };
  }

  function closedTrade(overrides = {}) {
    return {
      symbol: 'BTCUSDT',
      direction: 'LONG',
      regime: 'TRENDING',
      take_profit: 0.03,
      stop_loss: 0.015,
      pnl: 0.02,
      status: 'closed',
      experiment_id: 'e1',
      ...overrides,
    };
  }

  test('rejects (does not hang) when getAllExperiments rejects', async () => {
    const db = makeDb({ rows: [closedTrade()], experiments: new Error('db unavailable') });
    const engine = new AlphaDiscoveryEngine(db);
    // A 3s cap proves the promise settles instead of hanging forever.
    await expect(engine.discoverAlpha()).rejects.toThrow('db unavailable');
  }, 3000);

  test('rejects when db.all errors', async () => {
    const db = makeDb({ rows: [], allError: new Error('sqlite locked') });
    const engine = new AlphaDiscoveryEngine(db);
    await expect(engine.discoverAlpha()).rejects.toThrow('sqlite locked');
  }, 3000);

  test('resolves with aggregated payload when getAllExperiments resolves', async () => {
    const rows = [
      closedTrade({ symbol: 'BTCUSDT', direction: 'LONG', pnl: 0.02 }),
      closedTrade({ symbol: 'ETHUSDT', direction: 'SHORT', regime: 'RANGING', pnl: -0.01, experiment_id: 'e2' }),
    ];
    const db = makeDb({ rows, experiments: [{ experiment_id: 'e1' }, { experiment_id: 'e2' }] });
    const result = await new AlphaDiscoveryEngine(db).discoverAlpha();

    expect(result.totalExperiments).toBe(2);
    expect(result.totalTradesAnalyzed).toBe(2);
    expect(result.directionBreakdown.LONG.trades).toBe(1);
    expect(result.directionBreakdown.LONG.winRate).toBe(100);
    expect(result.directionBreakdown.SHORT.trades).toBe(1);
    expect(result.directionBreakdown.SHORT.winRate).toBe(0);
    expect(result.symbolBreakdown.BTCUSDT.trades).toBe(1);
    expect(result.conclusionSummary).toContain('2 experimentos');
  });

  test('resolves with empty-data summary when there are no closed trades', async () => {
    const db = makeDb({ rows: [], experiments: [] });
    const result = await new AlphaDiscoveryEngine(db).discoverAlpha();
    expect(result.totalTradesAnalyzed).toBe(0);
    expect(result.totalExperiments).toBe(0);
    expect(result.conclusionSummary).toContain('Dados insuficientes');
  });
});
