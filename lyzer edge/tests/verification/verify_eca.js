#!/usr/bin/env node
/**
 * @fileoverview Constitutional Test Suite (Deliverable L)
 * Verifies the integrity of the ECA Court, Edge Riding detection, and Governance Capture protections.
 */

import assert from 'assert';
import { court } from '../../../packages/lyzer-constitution/src/eca/court.js';
import { ledger } from '../../../packages/lyzer-constitution/src/eca/ledger.js';
import { KillSwitch } from '../../../packages/lyzer-constitution/src/eca/killSwitch.js';
import { verifyToken } from '../../../packages/lyzer-constitution/src/eca/permission.js';

function runConstitutionalTests() {
  console.log('='.repeat(72));
  console.log('  ECA CONSTITUTIONAL TEST SUITE (STATUS: AUDIT)');
  console.log('='.repeat(72));

  let testsPassed = 0;
  let testsTotal = 0;

  function runTest(name, fn) {
    testsTotal++;
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      testsPassed++;
    } catch (e) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${e.message}`);
    }
  }

  // 1. "The Court shall never learn" (VETO_CONFIDENCE_ARROGANCE)
  runTest('T1: VETO_CONFIDENCE_ARROGANCE is enforced', () => {
    const rawState = { confidence: 0.99, currentDrawdown: 0.01 }; // Illegal property 'confidence'
    const payload = { size: 0.5 };
    
    const token = court.requestPermission('ALLOCATE', rawState, payload);
    assert.strictEqual(token.granted, false, 'Court must reject states containing AI confidence');
    assert.strictEqual(token.reason, 'VETO_CONFIDENCE_ARROGANCE', 'Court must explicitly cite Arrogance veto');
    assert.ok(verifyToken(token), 'Token signature must be valid');
  });

  // 2. Deterministic HARD Limits (VETO_HARD_LIMIT_DRAWDOWN)
  runTest('T2: VETO_HARD_LIMIT_DRAWDOWN is enforced', () => {
    const rawState = { currentDrawdown: 0.06 }; // Above 0.05 limit
    const payload = { size: 0.5 };
    
    const token = court.requestPermission('ALLOCATE', rawState, payload);
    assert.strictEqual(token.granted, false, 'Court must reject drawdown > 5%');
    assert.strictEqual(token.reason, 'VETO_HARD_LIMIT_DRAWDOWN', 'Must cite Hard Limit Drawdown');
  });

  // 3. Edge Riding Detector (VETO_EDGE_RIDING)
  runTest('T3: VETO_EDGE_RIDING is enforced after accumulated near-misses', () => {
    // We simulate the system riding at 96% of the 5% drawdown limit (0.048) repeatedly.
    const rawState = { currentDrawdown: 0.048, requestedPositionSize: 0.1 };
    const payload = { size: 0.1 };

    // Reset ledger counters for this test
    ledger.edgeRidingCounters.drawdownNearMisses = 0;

    // Simulate 5 near misses (should pass)
    for (let i = 0; i < 5; i++) {
      const token = court.requestPermission('ALLOCATE', rawState, payload);
      assert.strictEqual(token.granted, true, `Iteration ${i} should be granted`);
    }

    // 6th near miss should trigger VETO_EDGE_RIDING
    const fatalToken = court.requestPermission('ALLOCATE', rawState, payload);
    assert.strictEqual(fatalToken.granted, false, '6th consecutive near miss must be rejected');
    assert.strictEqual(fatalToken.reason, 'VETO_EDGE_RIDING', 'Must cite Edge Riding');
  });

  // 4. Governance Capture Protection
  runTest('T4: VETO_PARAMETER_MUTATION (Governance Capture) is enforced', () => {
    // Attempt to mutate the immutable constraint engine
    let mutated = false;
    try {
      court.engine.CONSTRAINTS.HARD.MAX_DAILY_DRAWDOWN = 0.10; // Try to double drawdown limit
    } catch (e) {
      mutated = true; // TypeError in strict mode because Object.freeze
    }
    assert.strictEqual(mutated, true, 'Engine constraints must be strictly frozen');
    assert.ok(Object.isFrozen(court.engine.CONSTRAINTS.HARD), 'HARD constraints must be frozen');
    assert.ok(Object.isFrozen(court.engine.CONSTRAINTS.SOFT), 'SOFT constraints must be frozen');

    const rawState = { currentDrawdown: 0.01, requestedPositionSize: 0.1 };
    const payload = { size: 0.1 };
    
    // Test that the engine's internal check would reject if somehow mutated
    // Since we can't mutate it, we mock the internal property for a split second using a new ConstraintEngine
    const testEngine = new (court.engine.constructor)();
    // Simulate what happens if the code didn't freeze it and it was mutated
    // We recreate it without freeze just for testing the internal logic
    testEngine.CONSTRAINTS = { HARD: { MAX_DAILY_DRAWDOWN: 0.10, MAX_EDGE_RIDING_HITS: 5 }, SOFT: {} };
    
    const evaluation = testEngine.evaluate(rawState, ledger);
    assert.strictEqual(evaluation.passed, false, 'Court must reject operation if parameters were mutated');
    assert.strictEqual(evaluation.reason, 'VETO_PARAMETER_MUTATION', 'Must cite Governance Capture (Parameter Mutation)');
  });

  // 5. Kill Switch execution
  runTest('T5: Kill Switch executes SIGKILL simulation', () => {
    process.env.NODE_ENV = 'test'; // Ensure it throws instead of exiting
    assert.throws(() => {
      KillSwitch.executeHardKill();
    }, /SYSTEM_HALT_SIGKILL_EMULATED/, 'Kill Switch must terminate immediately');
  });

  console.log('='.repeat(72));
  if (testsPassed === testsTotal) {
    console.log('  🎉 ALL CONSTITUTIONAL TESTS PASSED');
    process.exit(0);
  } else {
    console.log(`  🔴 FAILED: ${testsTotal - testsPassed} tests failed.`);
    process.exit(1);
  }
}

runConstitutionalTests();
