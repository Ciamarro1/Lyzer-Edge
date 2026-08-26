#!/usr/bin/env node
/**
 * @fileoverview Lyzer Edge — Testnet Shadow & Prova Fisiológica Zero-REST sob VETO
 * 
 * Target: tests/verification/verify_zero_rest_under_veto.js
 * 
 * Verifications:
 * 1. Simulação de sinal de compra (BUY / LONG) sob epistemic_authority === 'VETO' (LHDS, SDS, ODM).
 * 2. Bloqueio físico determinístico de intenções de execução no último milissegundo pelo ExchangeExecution.
 * 3. Prova fisiológica com asserção estrita de ZERO requisições HTTP/REST enviadas à Binance (testnet.binance.vision / api.binance.com).
 * 4. Verificação multi-vetorial de VETOs do TruthKernel e da Corte Constitucional ECA (C-CLIST, Arrogância de Confiança, Hard Limits).
 * 5. Calibração e sensibilidade do monitor de rede (Positive Control Calibration) e Fail-Closed de Chaves Faltantes.
 * 6. Validação do Air-Gap de Hardware/Software em Shadow Trading Mode.
 */

import assert from 'assert';
import http from 'http';
import https from 'https';

// Set environment for deterministic test isolation
process.env.COURT_SECRET_KEY = process.env.COURT_SECRET_KEY || 'test_court_secret_key_32_bytes_ok';
process.env.ARL_MODE = 'TESTNET';
process.env.BINANCE_API_KEY = 'mock_binance_api_key_testnet_123';
process.env.BINANCE_API_SECRET = 'mock_binance_api_secret_testnet_456';
process.env.NODE_ENV = 'test';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';
process.env.DISABLED_PROVIDERS = '';

import { ExchangeExecution } from '../../backend/exchangeExecution.js';
import { StreamEngine } from '../../backend/streamEngine.js';
import { ConstitutionalCourt } from '../../../packages/lyzer-constitution/src/eca/court.js';
import { PermissionToken } from '../../../packages/lyzer-constitution/src/eca/permission.js';

// ============================================================================
// 1. PHYSIOLOGICAL NETWORK SPY & AIR-GAP PROBER
// ============================================================================

class PhysiologicalNetworkSpy {
  constructor() {
    this.recordedCalls = [];
    this.originalFetch = globalThis.fetch;
    this.originalHttpRequest = http.request;
    this.originalHttpGet = http.get;
    this.originalHttpsRequest = https.request;
    this.originalHttpsGet = https.get;
    this.isInstalled = false;
  }

  install() {
    if (this.isInstalled) return;
    this.recordedCalls = [];

    // 1. Hook Global Fetch
    globalThis.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : (input?.url || String(input));
      const method = (init?.method || 'GET').toUpperCase();
      const headers = init?.headers || {};
      const body = init?.body || null;

      const record = {
        type: 'FETCH',
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
        isBinance: url.includes('binance.com') || url.includes('binance.vision'),
        isOrderEndpoint: url.includes('/api/v3/order') || url.includes('/api/v3/openOrders')
      };
      this.recordedCalls.push(record);

      // Return synthetic filled/ok response without ever making real external TCP connection
      return new Response(
        JSON.stringify({
          orderId: 888777666,
          symbol: 'BTCUSDT',
          status: 'FILLED',
          clientOrderId: 'mock_testnet_order',
          executedQty: '0.001',
          cummulativeQuoteQty: '50.00'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    };

    // 2. Hook node:http & node:https
    const createHttpHook = (origFn, protocol) => {
      const self = this;
      return function (urlOrOptions, optionsOrCallback, callback) {
        let urlStr = '';
        if (typeof urlOrOptions === 'string' || urlOrOptions instanceof URL) {
          urlStr = urlOrOptions.toString();
        } else if (urlOrOptions && typeof urlOrOptions === 'object') {
          urlStr = `${protocol}://${urlOrOptions.hostname || urlOrOptions.host || 'localhost'}:${urlOrOptions.port || (protocol === 'https' ? 443 : 80)}${urlOrOptions.path || '/'}`;
        }

        self.recordedCalls.push({
          type: protocol.toUpperCase(),
          url: urlStr,
          timestamp: Date.now(),
          isBinance: urlStr.includes('binance.com') || urlStr.includes('binance.vision'),
          isOrderEndpoint: urlStr.includes('/api/v3/order') || urlStr.includes('/api/v3/openOrders')
        });

        // Delegate to original
        return origFn.apply(protocol === 'https' ? https : http, arguments);
      };
    };

    http.request = createHttpHook(this.originalHttpRequest, 'http');
    http.get = createHttpHook(this.originalHttpGet, 'http');
    https.request = createHttpHook(this.originalHttpsRequest, 'https');
    https.get = createHttpHook(this.originalHttpsGet, 'https');

    this.isInstalled = true;
  }

  get totalCalls() {
    return this.recordedCalls.length;
  }

  get binanceCalls() {
    return this.recordedCalls.filter(c => c.isBinance);
  }

  get binanceOrderCalls() {
    return this.recordedCalls.filter(c => c.isOrderEndpoint);
  }

  reset() {
    this.recordedCalls = [];
  }

  uninstall() {
    if (!this.isInstalled) return;
    globalThis.fetch = this.originalFetch;
    http.request = this.originalHttpRequest;
    http.get = this.originalHttpGet;
    https.request = this.originalHttpsRequest;
    https.get = this.originalHttpsGet;
    this.isInstalled = false;
  }

  assertZeroRestRequests(context = '') {
    const binanceRequests = this.binanceCalls;
    if (binanceRequests.length > 0) {
      console.error(`🚨 ZERO-REST LEAK DETECTED in [${context}]: Found ${binanceRequests.length} REST requests to Binance!`);
      for (const req of binanceRequests) {
        console.error(`   -> [${req.method}] ${req.url} (${req.type})`);
      }
      assert.strictEqual(
        binanceRequests.length,
        0,
        `Physiological Zero-REST Violation: ${binanceRequests.length} HTTP request(s) leaked to Binance in context: ${context}`
      );
    }
  }
}

// ============================================================================
// 2. TEST HARNESS & SUITE EXECUTION
// ============================================================================

const networkSpy = new PhysiologicalNetworkSpy();
networkSpy.install();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

async function runTest(testName, testFn) {
  totalTests++;
  networkSpy.reset();
  console.log(`\n----------------------------------------------------------------`);
  console.log(`[TEST ${totalTests}] ${testName}`);
  console.log(`----------------------------------------------------------------`);

  try {
    await testFn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(`     Stack: ${err.stack.split('\n').slice(1, 4).join('\n')}`);
    }
    failures.push({ testName, error: err.message });
  }
}

// Synthetic Candle Generator
function generateSyntheticCandle(openTime, basePrice = 50000, spread = 20, volume = 500) {
  return {
    openTime,
    timestamp: openTime,
    open: basePrice,
    high: basePrice + spread,
    low: basePrice - 5,
    close: basePrice + spread - 2,
    volume,
    closed: true
  };
}

// Setup a warmed-up StreamEngine instance in TESTNET mode
async function createTestnetStreamEngine(options = {}) {
  const engine = new StreamEngine({
    symbol: options.symbol || 'BTCUSDT',
    interval: '1m',
    mode: 'TESTNET',
    disabledProviders: [],
    stabilizationWindowMs: 0
  });

  // Inject execution layer with mock credentials
  engine.execution = new ExchangeExecution(
    'mock_binance_api_key_testnet_123',
    'mock_binance_api_secret_testnet_456',
    true // isTestnet
  );

  // Warmup with baseline synthetic candles
  const now = Date.now();
  for (let i = 120; i >= 1; i--) {
    const c = generateSyntheticCandle(now - i * 60000, 50000 + Math.sin(i / 10) * 10, 10, 100);
    engine.updateMtfCandles(c);
  }

  return engine;
}

// ============================================================================
// 3. VERIFICATION SUITE IMPLEMENTATION
// ============================================================================

async function main() {
  console.log('================================================================');
  console.log('  LYZER EDGE — TESTNET SHADOW & PROVA FISIOLÓGICA ZERO-REST');
  console.log('  STATUS: AUDIT & CERTIFICATION');
  console.log('================================================================');

  // --------------------------------------------------------------------------
  // TEST 1: Reality Divergence (LHDS > Limit) -> VETO -> Zero REST to Binance
  // --------------------------------------------------------------------------
  await runTest('T1: Buy signal under LHDS VETO (Reality Divergence) produces ZERO REST calls', async () => {
    const engine = await createTestnetStreamEngine();
    
    // Spy on placeOrder to guarantee last-millisecond interception
    let placeOrderCalls = 0;
    const origPlaceOrder = engine.execution.placeOrder.bind(engine.execution);
    engine.execution.placeOrder = async (...args) => {
      placeOrderCalls++;
      return origPlaceOrder(...args);
    };

    // Construct high LHDS tick (> 0.95 limit) with a candidate LONG breakout candle
    const now = Date.now();
    const candidateCandle = generateSyntheticCandle(now, 50500, 50, 2000);

    // Provide providers with strong bullish signal
    const providers = {
      v1: { signal: 'BUY', confidence: 95, strength: 0.9, direction: 1, upper_bound: 51000, lower_bound: 50400 },
      v2: { signal: 'BUY', confidence: 90, strength: 0.85, direction: 1 },
      v3: { signal: 'BUY', confidence: 88, strength: 0.8, direction: 1 }
    };

    // Evaluate TruthKernel directly to verify VETO generation
    const kernelResult = engine.truthKernel.evaluate(providers, {
      lhds: 0.98, // Extreme Reality Divergence
      scaleDivergence: 0.20,
      liquidityDivergence: 1.0,
      oppScore: 3,
      imbalance: 0.9
    });

    assert.strictEqual(kernelResult.epistemic_authority, 'VETO', 'TruthKernel must declare epistemic_authority === VETO');
    assert.strictEqual(kernelResult.eef, false, 'EEF flag must be false under reality divergence');
    assert.ok(kernelResult.reason_codes.includes('VETO_REALITY_DIVERGENCE'), 'Reason must include VETO_REALITY_DIVERGENCE');

    // Force engine's TruthKernel to replicate this VETO on next candle evaluation
    engine.truthKernel.evaluate = () => kernelResult;

    // Process candle through the entire production pipeline
    await engine.processCandle(candidateCandle, 121);

    // Verify engine state
    assert.strictEqual(engine.activePosition, null, 'Active position must NOT be opened under VETO');
    assert.strictEqual(placeOrderCalls, 0, 'ExchangeExecution.placeOrder must NEVER be called');
    
    // PROVA FISIOLÓGICA: Strict Zero-REST assert
    networkSpy.assertZeroRestRequests('T1_LHDS_VETO');
    assert.strictEqual(networkSpy.binanceCalls.length, 0, 'Strict Zero-REST: Exactly 0 requests sent to Binance');
    assert.strictEqual(networkSpy.binanceOrderCalls.length, 0, 'Strict Zero-REST: Exactly 0 order requests sent');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Ontological Collapse (SDS > 0.7 & TRG >= 0.7) -> VETO -> Zero REST
  // --------------------------------------------------------------------------
  await runTest('T2: Buy signal under Ontological Collapse VETO (SDS > 0.7 & TRG >= 0.7) produces ZERO REST calls', async () => {
    const engine = await createTestnetStreamEngine();
    
    let placeOrderCalls = 0;
    engine.execution.placeOrder = async () => {
      placeOrderCalls++;
      throw new Error('UNAUTHORIZED_CALL_UNDER_VETO');
    };

    const providers = {
      v1: { signal: 'BUY', confidence: 92, strength: 0.9, direction: 1 },
      v2: { signal: 'SELL', confidence: 95, strength: 0.9, direction: -1 } // Creates high TRG divergence
    };

    // SDS = 0.85 (> 0.70) with high TRG collapse
    const kernelResult = engine.truthKernel.evaluate(providers, {
      scaleDivergence: 0.85,
      lhds: 0.20,
      liquidityDivergence: 1.0
    });

    assert.strictEqual(kernelResult.epistemic_authority, 'VETO', 'Must be VETO under Ontological Collapse');
    assert.strictEqual(kernelResult.eef, false, 'EEF must be false under Ontological Collapse');
    assert.ok(kernelResult.reason_codes.includes('VETO_ONTOLOGICAL_COLLAPSE'), 'Reason must include VETO_ONTOLOGICAL_COLLAPSE');

    engine.truthKernel.evaluate = () => kernelResult;

    const candle = generateSyntheticCandle(Date.now(), 50600, 30, 1500);
    await engine.processCandle(candle, 122);

    assert.strictEqual(engine.activePosition, null, 'Active position must remain null');
    assert.strictEqual(placeOrderCalls, 0, 'Execution.placeOrder must not be called');
    networkSpy.assertZeroRestRequests('T2_ONTOLOGICAL_COLLAPSE');
    assert.strictEqual(networkSpy.binanceCalls.length, 0, 'Zero REST calls verified under Ontological Collapse');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Observer Divergence Metric (ODM >= 0.60) -> VETO -> Zero REST
  // --------------------------------------------------------------------------
  await runTest('T3: Buy signal under Observer Divergence VETO (ODM >= 0.60) produces ZERO REST calls', async () => {
    const engine = await createTestnetStreamEngine();

    let placeOrderCalls = 0;
    engine.execution.placeOrder = async () => {
      placeOrderCalls++;
    };

    const providers = {
      v1: { signal: 'BUY', confidence: 85, strength: 0.8, direction: 1 },
      v2: { signal: 'SELL', confidence: 80, strength: 0.75, direction: -1 } // TRG > threshold
    };

    const kernelResult = engine.truthKernel.evaluate(providers, {
      scaleDivergence: 0.15,
      lhds: 0.10,
      odm: 0.75 // Observer Divergence >= 0.60
    });

    assert.strictEqual(kernelResult.epistemic_authority, 'VETO', 'Must be VETO under ODM >= 0.60');
    assert.strictEqual(kernelResult.eef, false, 'EEF must be false under ODM VETO');
    assert.ok(kernelResult.reason_codes.includes('VETO_OBSERVER_DIVERGENCE_ODM'), 'Reason must include VETO_OBSERVER_DIVERGENCE_ODM');

    engine.truthKernel.evaluate = () => kernelResult;

    const candle = generateSyntheticCandle(Date.now(), 50700, 40, 1800);
    await engine.processCandle(candle, 123);

    assert.strictEqual(engine.activePosition, null, 'Active position must remain null');
    assert.strictEqual(placeOrderCalls, 0, 'placeOrder must not be invoked');
    networkSpy.assertZeroRestRequests('T3_ODM_VETO');
    assert.strictEqual(networkSpy.binanceCalls.length, 0, 'Zero REST calls verified under ODM VETO');
  });

  // --------------------------------------------------------------------------
  // TEST 4: ECA Court C-CLIST Stress (Lethal Illusion) -> VETO -> Zero REST
  // --------------------------------------------------------------------------
  await runTest('T4: Buy signal under C-CLIST Lethal Illusion VETO produces ZERO REST calls', async () => {
    const engine = await createTestnetStreamEngine();

    // Reconfigure Court's C-CLIST with high accumulated stress
    const court = new ConstitutionalCourt({
      dvfFloor: 0.1,
      stressAccumulation: 0.05,
      lethalIllusionLimit: 0.9,
      stressRelease: 0.1
    }, { sclThreshold: 3, stabilizationWindowMs: 0 });

    // Manually push C-CLIST into lethal illusion state
    court.cclist.stressLevel = 0.95;
    engine.court = court;

    let placeOrderCalls = 0;
    engine.execution.placeOrder = async () => {
      placeOrderCalls++;
    };

    // Even if Kernel emitted ALLOW, the Court must block it
    const fakeKernelResult = {
      eef: true,
      epistemic_authority: 'ALLOW',
      reason_codes: ['PASS'],
      dvf: 0.05,
      trg: 0.60,
      dynamic_limits: {}
    };
    engine.truthKernel.evaluate = () => fakeKernelResult;

    const candle = generateSyntheticCandle(Date.now(), 50800, 25, 1200);
    await engine.processCandle(candle, 124);

    assert.strictEqual(engine.activePosition, null, 'Court VETO must prevent position opening');
    assert.strictEqual(placeOrderCalls, 0, 'placeOrder must never be called');
    networkSpy.assertZeroRestRequests('T4_CCLIST_LETHAL_ILLUSION');
    assert.strictEqual(networkSpy.binanceCalls.length, 0, 'Zero REST calls verified under Lethal Illusion');
  });

  // --------------------------------------------------------------------------
  // TEST 5: ECA Court "Never Learn" (Confidence Arrogance) -> VETO -> Zero REST
  // --------------------------------------------------------------------------
  await runTest('T5: Contaminated rawState (Confidence Arrogance) triggers VETO and ZERO REST calls', async () => {
    const engine = await createTestnetStreamEngine();

    const court = new ConstitutionalCourt({}, { stabilizationWindowMs: 0 });
    engine.court = court;

    // Test court directly with illegal AI confidence parameter
    const contaminatedState = { confidence: 0.99, trg: 0.70, dvf: 0.50 };
    const payload = { size: 0.001 };

    const token = court.requestPermission('EXECUTE_TRADE', contaminatedState, payload);
    assert.strictEqual(token.granted, false, 'Court must reject confidence arrogance');
    assert.strictEqual(token.reason, 'VETO_CONFIDENCE_ARROGANCE', 'Must cite VETO_CONFIDENCE_ARROGANCE');

    // Verify through StreamEngine
    let placeOrderCalls = 0;
    engine.execution.placeOrder = async () => { placeOrderCalls++; };

    // Inject state into StreamEngine processCandle
    const candle = generateSyntheticCandle(Date.now(), 50900, 20, 1100);
    engine.truthKernel.evaluate = () => ({
      eef: true,
      epistemic_authority: 'ALLOW',
      reason_codes: ['PASS'],
      dvf: 0.4,
      trg: 0.6
    });

    // Mock Court requestPermission to enforce the confidence veto
    court.requestPermission = () => token;

    await engine.processCandle(candle, 125);

    assert.strictEqual(engine.activePosition, null, 'Active position must remain null');
    assert.strictEqual(placeOrderCalls, 0, 'placeOrder must not be called');
    networkSpy.assertZeroRestRequests('T5_CONFIDENCE_ARROGANCE');
    assert.strictEqual(networkSpy.binanceCalls.length, 0, 'Zero REST calls verified under Confidence Arrogance');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Positive Control Calibration (Proves Network Spy Is Armed & Sensitive)
  // --------------------------------------------------------------------------
  await runTest('T6: Positive Control Calibration (Arming check: verifies spy captures calls when authorized)', async () => {
    const execution = new ExchangeExecution(
      'mock_binance_api_key_testnet_123',
      'mock_binance_api_secret_testnet_456',
      true // isTestnet
    );

    networkSpy.reset();
    assert.strictEqual(networkSpy.totalCalls, 0, 'Initial calls must be 0');

    // Generate a cryptographically valid PermissionToken
    const validToken = new PermissionToken('EXECUTE_TRADE', true, 'AUTHORIZED');

    // Dispatch a single authorized direct order to test the network sensor tap
    const orderResult = await execution.placeOrder(
      'BTCUSDT',
      'BUY',
      'LIMIT',
      0.001,
      50000,
      { lotDecimals: 3, priceDecimals: 2 },
      validToken
    );
    
    assert.ok(orderResult, 'Order result must be returned');
    assert.strictEqual(orderResult.orderId, 888777666, 'Mock order ID must match spy response');
    assert.strictEqual(networkSpy.totalCalls, 1, 'Spy must capture exactly 1 network egress attempt');
    assert.strictEqual(networkSpy.binanceCalls.length, 1, 'Spy must detect 1 Binance REST request');
    assert.ok(networkSpy.binanceCalls[0].url.startsWith('https://testnet.binance.vision/api/v3/order'), 'Request must target Binance Testnet order endpoint');
    assert.strictEqual(networkSpy.binanceCalls[0].method, 'POST', 'HTTP Method must be POST');

    console.log('    -> Positive control verified: Network Spy successfully detected & trapped outbound order call.');
    networkSpy.reset();
  });

  // --------------------------------------------------------------------------
  // TEST 7: Physical Gate & Fail-Closed Protection (Missing Keys / Tokens -> Zero REST)
  // --------------------------------------------------------------------------
  await runTest('T7: Physical Gate & Fail-Closed multi-layer protection blocks unpermitted orders (ZERO REST)', async () => {
    networkSpy.reset();

    const execution = new ExchangeExecution(
      'mock_binance_api_key_testnet_123',
      'mock_binance_api_secret_testnet_456',
      true
    );

    // 1. Missing PermissionToken must throw PHYSICAL_GATE_VIOLATION and send 0 REST requests
    let missingTokenBlocked = false;
    try {
      await execution.placeOrder('BTCUSDT', 'BUY', 'MARKET', 0.001, null, { lotDecimals: 3, priceDecimals: 2 }, null);
    } catch (e) {
      missingTokenBlocked = e.message.includes('PHYSICAL_GATE_VIOLATION');
    }
    assert.strictEqual(missingTokenBlocked, true, 'Must block when permissionToken is missing');
    networkSpy.assertZeroRestRequests('T7_MISSING_TOKEN');

    // 2. Denied PermissionToken (e.g. VETO reason) must throw and send 0 REST requests
    const deniedToken = new PermissionToken('EXECUTE_TRADE', false, 'VETO_REALITY_DIVERGENCE');
    let deniedTokenBlocked = false;
    try {
      await execution.placeOrder('BTCUSDT', 'BUY', 'MARKET', 0.001, null, { lotDecimals: 3, priceDecimals: 2 }, deniedToken);
    } catch (e) {
      deniedTokenBlocked = e.message.includes('PHYSICAL_GATE_VIOLATION');
    }
    assert.strictEqual(deniedTokenBlocked, true, 'Must block when permissionToken is not granted');
    networkSpy.assertZeroRestRequests('T7_DENIED_TOKEN');

    // 3. Valid Token with Missing Credentials must fail-closed with 0 REST requests
    const executionNoKeys = new ExchangeExecution(null, null, true);
    const validToken = new PermissionToken('EXECUTE_TRADE', true, 'AUTHORIZED');
    let missingKeysBlocked = false;
    try {
      await executionNoKeys.placeOrder('BTCUSDT', 'BUY', 'MARKET', 0.001, null, { lotDecimals: 3, priceDecimals: 2 }, validToken);
    } catch (e) {
      missingKeysBlocked = e.message.includes('required');
    }
    assert.strictEqual(missingKeysBlocked, true, 'Must block when API keys are missing');
    networkSpy.assertZeroRestRequests('T7_MISSING_KEYS_FAIL_CLOSED');

    assert.strictEqual(networkSpy.totalCalls, 0, 'Zero REST requests must be made across all physical gate tests');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Shadow Mode Physical Air-Gap (Execution Object Nullification)
  // --------------------------------------------------------------------------
  await runTest('T8: Shadow Mode enforces total execution object air-gap (engine.execution === null)', async () => {
    // In LIVE mode with shadow trading enabled, execution is nullified
    process.env.SHADOW_TRADING_ENABLED = 'true';
    process.env.LIVE_TRADING_ENABLED = 'true';
    process.env.MAX_DAILY_CAPITAL = '1000';

    const engine = new StreamEngine({
      symbol: 'BTCUSDT',
      interval: '1m',
      mode: 'LIVE',
      disabledProviders: [],
      stabilizationWindowMs: 0
    });

    engine.initializeExecution();
    assert.strictEqual(engine.execution, null, 'In Shadow Mode, engine.execution MUST be null (Hardware Air-Gap)');

    // Even if candle processes an ALLOW signal, it cannot physically execute
    const candle = generateSyntheticCandle(Date.now(), 51000, 30, 1000);
    await engine.processCandle(candle, 126);

    networkSpy.assertZeroRestRequests('T8_SHADOW_MODE_AIR_GAP');
    assert.strictEqual(networkSpy.binanceCalls.length, 0, 'Strict Zero-REST confirmed in Shadow Air-Gap mode');

    // Reset env
    process.env.SHADOW_TRADING_ENABLED = 'false';
    process.env.ARL_MODE = 'TESTNET';
  });

  // ==========================================================================
  // FINAL REPORT & SUMMARY
  // ==========================================================================
  networkSpy.uninstall();

  console.log('\n================================================================');
  console.log(`  AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('  STATUS: ✅ CERTIFIED — 100% PHYSIOLOGICAL ZERO-REST UNDER VETO');
    console.log('  Zero HTTP REST packets leaked to Binance during all VETO conditions.');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error(`  STATUS: 🔴 FAILED — ${failedTests} TEST(S) FAILED`);
    for (const f of failures) {
      console.error(`   - ${f.testName}: ${f.error}`);
    }
    console.log('================================================================\n');
    process.exit(1);
  }
}

// Run test suite
main().catch(err => {
  networkSpy.uninstall();
  console.error('Fatal execution error in test suite:', err);
  process.exit(1);
});
