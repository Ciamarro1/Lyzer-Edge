import assert from 'assert';
import { ConstitutionalCourt, court } from '../../packages/lyzer-constitution/src/eca/court.js';
import { ConstitutionalLedger, ledger } from '../../packages/lyzer-constitution/src/eca/ledger.js';
import { ConstraintEngine } from '../../packages/lyzer-constitution/src/eca/constraintEngine.js';
import { PermissionToken, verifyToken, getCourtSecret } from '../../packages/lyzer-constitution/src/eca/permission.js';
import { KillSwitch } from '../../packages/lyzer-constitution/src/eca/killSwitch.js';

console.log('='.repeat(72));
console.log('  EMPIRICAL CHALLENGER STRESS HARNESS — ECA COURT LOGIC');
console.log('='.repeat(72));

let testCount = 0;
let passedCount = 0;

function runStressTest(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`[PASS] S${testCount}: ${name}`);
    passedCount++;
  } catch (e) {
    console.error(`[FAIL] S${testCount}: ${name}`);
    console.error(`       ${e.stack || e.message}`);
  }
}

// Ensure COURT_SECRET_KEY is set for tests
process.env.COURT_SECRET_KEY = process.env.COURT_SECRET_KEY || 'test_secret_key';

function resetLedgerState() {
  ledger.edgeRidingCounters.drawdownNearMisses = 0;
  ledger.edgeRidingCounters.slippageNearMisses = 0;
}

// Test S1: Valid Payload Permission Grant & Signature Verification
runStressTest('Valid Payload returns PERMISSION_GRANTED with valid signature', () => {
  resetLedgerState();
  const testCourt = new ConstitutionalCourt();
  const rawState = { currentDrawdown: 0.01, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.5 };
  const payload = { eef: true, size: 0.1, reason_codes: [] };
  
  const token = testCourt.requestPermission('EXECUTE_TRADE', rawState, payload);
  assert.strictEqual(token.granted, true, 'Token must be granted for valid payload');
  assert.strictEqual(token.reason, null, 'Reason should be null when granted');
  assert.strictEqual(token.action, 'EXECUTE_TRADE');
  assert.ok(verifyToken(token), 'Signature must verify with correct secret key');
  assert.strictEqual(verifyToken(token, 'invalid_key_123'), false, 'Signature must fail with invalid secret key');
});

// Test S2: Forged Token Tampering Detection
runStressTest('Tampered Token payload invalidates HMAC signature', () => {
  resetLedgerState();
  const token = new PermissionToken('EXECUTE_TRADE', true, null, {}, 'test_secret_key');
  assert.ok(verifyToken(token, 'test_secret_key'));

  // Create a tampered copy
  const tamperedToken = { ...token, granted: false };
  assert.strictEqual(verifyToken(tamperedToken, 'test_secret_key'), false, 'Tampered token must fail signature verification');
});

// Test S3: Environment enforcement for secret key
runStressTest('getCourtSecret throws when COURT_SECRET_KEY is missing in Node environment', () => {
  const originalEnv = process.env.COURT_SECRET_KEY;
  try {
    delete process.env.COURT_SECRET_KEY;
    assert.throws(() => getCourtSecret(), /COURT_SECRET_KEY env required/, 'Must throw if secret is missing');
  } finally {
    process.env.COURT_SECRET_KEY = originalEnv;
  }
});

// Test S4: VETO_HARD_LIMIT_DRAWDOWN boundary condition
runStressTest('Hard limit drawdown exact boundary test', () => {
  resetLedgerState();
  const testCourt = new ConstitutionalCourt();
  
  // 0.0499 drawdown (below 0.05 limit) -> granted
  const safeState = { currentDrawdown: 0.0499, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.5 };
  const safeToken = testCourt.requestPermission('ALLOCATE', safeState, { eef: true });
  assert.strictEqual(safeToken.granted, true, '0.0499 drawdown should be granted (unless edge riding triggers)');

  // 0.05 drawdown (exact limit) -> vetoed
  const limitState = { currentDrawdown: 0.05, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.5 };
  const limitToken = testCourt.requestPermission('ALLOCATE', limitState, { eef: true });
  assert.strictEqual(limitToken.granted, false, '0.05 drawdown must be vetoed');
  assert.strictEqual(limitToken.reason, 'VETO_HARD_LIMIT_DRAWDOWN');

  // 0.06 drawdown (above limit) -> vetoed
  const overState = { currentDrawdown: 0.06, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.5 };
  const overToken = testCourt.requestPermission('ALLOCATE', overState, { eef: true });
  assert.strictEqual(overToken.granted, false, '0.06 drawdown must be vetoed');
  assert.strictEqual(overToken.reason, 'VETO_HARD_LIMIT_DRAWDOWN');
});

// Test S5: VETO_EDGE_RIDING accumulation & decay mechanics
runStressTest('Edge Riding near-miss accumulation and decay', () => {
  resetLedgerState();
  const testCourt = new ConstitutionalCourt();
  const nearMissState = { currentDrawdown: 0.048, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.5 };
  const payload = { eef: true };

  // Generate 4 near misses
  for (let i = 1; i <= 4; i++) {
    const token = testCourt.requestPermission('ALLOCATE', nearMissState, payload);
    assert.strictEqual(token.granted, true);
  }

  // Check ledger counter
  assert.strictEqual(ledger.getNearMissCount('drawdown'), 4, 'Near miss count should be 4');

  // Now send 2 safe state requests (< 0.0475) to test decay
  const safeState = { currentDrawdown: 0.01, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.5 };
  testCourt.requestPermission('ALLOCATE', safeState, payload);
  assert.strictEqual(ledger.getNearMissCount('drawdown'), 3, 'Near miss count should decay to 3');

  testCourt.requestPermission('ALLOCATE', safeState, payload);
  assert.strictEqual(ledger.getNearMissCount('drawdown'), 2, 'Near miss count should decay to 2');

  // Now push to 5 hits (need 3 more near misses: current 2 + 3 = 5)
  testCourt.requestPermission('ALLOCATE', nearMissState, payload); // 3
  testCourt.requestPermission('ALLOCATE', nearMissState, payload); // 4
  const token5 = testCourt.requestPermission('ALLOCATE', nearMissState, payload); // 5 -> Reaches 5!

  // 6th call should trigger VETO_EDGE_RIDING
  const fatalToken = testCourt.requestPermission('ALLOCATE', nearMissState, payload);
  assert.strictEqual(fatalToken.granted, false, 'Should be vetoed when hit count reaches threshold');
  assert.strictEqual(fatalToken.reason, 'VETO_EDGE_RIDING');
});

// Test S6: VETO_PARAMETER_MUTATION engine defense
runStressTest('ConstraintEngine immunity to parameter mutations', () => {
  resetLedgerState();
  const engine = new ConstraintEngine();
  assert.ok(Object.isFrozen(engine.CONSTRAINTS));
  assert.ok(Object.isFrozen(engine.CONSTRAINTS.HARD));
  assert.ok(Object.isFrozen(engine.CONSTRAINTS.SOFT));

  // Verify direct modification throws TypeError in strict mode or fails
  assert.throws(() => {
    'use strict';
    engine.CONSTRAINTS.HARD.MAX_DAILY_DRAWDOWN = 0.50;
  }, TypeError);

  // Verify evaluate() checks integrity if mutated internally via non-frozen fake object
  const hackedEngine = new ConstraintEngine();
  Object.defineProperty(hackedEngine, 'CONSTRAINTS', {
    value: { HARD: { MAX_DAILY_DRAWDOWN: 0.99, MAX_EDGE_RIDING_HITS: 10 } },
    writable: true
  });
  const res = hackedEngine.evaluate({ currentDrawdown: 0.01 }, ledger);
  assert.strictEqual(res.passed, false);
  assert.strictEqual(res.reason, 'VETO_PARAMETER_MUTATION');
});

// Test S7: C-CLIST Stability Illusion stress accumulation
runStressTest('C-CLIST Lethal Stability Illusion veto trigger', () => {
  resetLedgerState();
  const testCourt = new ConstitutionalCourt({ dvfFloor: 0.1, stressAccumulation: 0.2, lethalIllusionLimit: 0.8 });
  const lowDvfState = { currentDrawdown: 0.01, requestedPositionSize: 0.1, trg: 0.1, dvf: 0.01 };
  const payload = { eef: true };

  const t1 = testCourt.requestPermission('ALLOCATE', lowDvfState, payload);
  assert.strictEqual(t1.granted, true, `Call 1 expected granted=true, got granted=${t1.granted}, reason=${t1.reason}`);

  const t2 = testCourt.requestPermission('ALLOCATE', lowDvfState, payload);
  assert.strictEqual(t2.granted, true, `Call 2 expected granted=true, got granted=${t2.granted}, reason=${t2.reason}`);

  const t3 = testCourt.requestPermission('ALLOCATE', lowDvfState, payload);
  assert.strictEqual(t3.granted, true, `Call 3 expected granted=true, got granted=${t3.granted}, reason=${t3.reason}`);

  const t4 = testCourt.requestPermission('ALLOCATE', lowDvfState, payload);
  assert.strictEqual(t4.granted, false, `Call 4 expected granted=false, got granted=${t4.granted}, reason=${t4.reason}`);
  assert.strictEqual(t4.reason, 'VETO_LETHAL_STABILITY_ILLUSION');
});

// Test S8: Meta-Observation Layer (MOL) VETO and recovery protocol
runStressTest('MOL VETO state transition and False Awakening blocking', () => {
  resetLedgerState();
  const testCourt = new ConstitutionalCourt({}, { sclThreshold: 3, minCooldown: 5 });
  const rawState = { currentDrawdown: 0.01, scale_divergence: 0.2, trg: 0.1, dvf: 0.5 };

  // Tick 1: Kernel issues VETO authority (eef=false so Court rejects with VETO_NO_SURVIVAL_NECESSITY while MOL enters VETO state)
  const payloadVeto = { eef: false, epistemic_authority: 'VETO' };
  const vetoToken = testCourt.requestPermission('ALLOCATE', rawState, payloadVeto);
  assert.strictEqual(vetoToken.granted, false);

  // Tick 2: Kernel attempts to execute again (eef=true, authority=OBSERVED).
  // MOL is now in RECOVERY state and blocks False Awakening with VETO_MOL_RECOVERY_PENDING.
  const payloadRecover = { eef: true, epistemic_authority: 'OBSERVED' };
  const recoverToken = testCourt.requestPermission('ALLOCATE', rawState, payloadRecover);
  
  assert.strictEqual(recoverToken.granted, false, 'MOL must block premature recovery');
  assert.strictEqual(recoverToken.reason, 'VETO_MOL_RECOVERY_PENDING', 'Must cite MOL recovery pending');
});

// Test S9: Ledger immutability & safe export
runStressTest('Ledger entries original immutability & export isolation', () => {
  resetLedgerState();
  const testLedger = new ConstitutionalLedger();
  const dummyToken = new PermissionToken('TEST', true, null, {}, 'test_secret_key');
  testLedger.appendRecord({ test: 1 }, dummyToken, { state: 'ok' });

  // 1. Check original entry immutability
  assert.ok(Object.isFrozen(testLedger.entries[0]), 'Original ledger entry must be frozen');
  assert.throws(() => {
    'use strict';
    testLedger.entries[0].reason = 'MUTATED';
  }, TypeError, 'Direct mutation of original ledger entry must throw TypeError');

  // 2. Check export isolation (mutating exported clone does not corrupt internal ledger)
  const exported = testLedger.exportLedger();
  exported[0].reason = 'TAMPERED_IN_EXPORT';
  assert.strictEqual(testLedger.entries[0].reason, null, 'Internal ledger entry must remain pristine');
});

// Test S10: Kill Switch hard kill emulated throw in test env
runStressTest('Kill Switch hard kill emulation in test environment', () => {
  resetLedgerState();
  process.env.NODE_ENV = 'test';
  assert.throws(() => {
    KillSwitch.executeHardKill();
  }, /SYSTEM_HALT_SIGKILL_EMULATED/);
});

console.log('='.repeat(72));
console.log(`STRESS TEST RESULTS: ${passedCount} / ${testCount} PASSED`);
if (passedCount === testCount) {
  console.log('  🎉 ALL STRESS TESTS PASSED SUCCESSFULLY');
  process.exit(0);
} else {
  console.error(`  🔴 STRESS TEST FAILURE: ${testCount - passedCount} failed`);
  process.exit(1);
}
