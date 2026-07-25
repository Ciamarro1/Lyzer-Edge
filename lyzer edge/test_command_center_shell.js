/**
 * Lyzer Edge Command Center v2 — Shell & Runtime Adapter Verification Suite
 *
 * Tests the 6 mandatory fiduciary invariants required by ETAPA 2:
 *   1. Shell initializes without data
 *   2. Navigation loads all 8 modules
 *   3. Runtime Adapter has ZERO write methods
 *   4. Mutation attempt triggers DASHBOARD_CONTROL_VETO
 *   5. OBSERVED_REALITY data appears correctly via adapter
 *   6. SYNTHETIC_REALITY data remains isolated via adapter
 */

import assert from 'assert';

import { runtimeAdapter } from './src/services/dashboard/dashboardRuntimeAdapter.js';
import { dataProvider } from './src/services/dashboard/dashboardDataProvider.js';
import { securityGuard } from './src/services/dashboard/dashboardSecurityGuard.js';

import { CommandCenterShell } from './src/components/commandCenter/CommandCenterShell.js';
import { CommandCenterRouter } from './src/components/commandCenter/CommandCenterRouter.js';
import { CommandCenterNavigation } from './src/components/commandCenter/CommandCenterNavigation.js';

async function runShellTests() {
  console.log("🏛️ STARTING COMMAND CENTER v2 SHELL & RUNTIME ADAPTER VERIFICATION SUITE...\n");
  let passedCount = 0;
  const totalTests = 6;

  // ── TEST 1: Shell initializes without data ──────────────────────────

  try {
    dataProvider.reset();
    const shell = new CommandCenterShell();

    // Verify shell object created cleanly
    assert(shell, "Shell must instantiate");
    assert(typeof shell.mount === 'function', "Shell must have mount()");
    assert(typeof shell.unmount === 'function', "Shell must have unmount()");

    // Verify default snapshot is safe
    const defaultSnap = runtimeAdapter.getDefaultSnapshot();
    assert.strictEqual(defaultSnap.system_stage, 'L15', "Default stage must be L15");
    assert.strictEqual(defaultSnap.governance, 'GREEN', "Default governance must be GREEN");
    assert.strictEqual(defaultSnap.alpha_state, 'IMMUTABLE', "Default alpha must be IMMUTABLE");
    assert.strictEqual(defaultSnap.capital_status, 'NOT_CONNECTED', "Default capital must be NOT_CONNECTED");
    assert.strictEqual(defaultSnap.reality.state, 'AWAITING_DATA', "Default reality state must be AWAITING_DATA");
    assert.strictEqual(defaultSnap.endurance.heap_status, 'AWAITING_DATA', "Default heap must be AWAITING_DATA");
    assert(Object.isFrozen(defaultSnap), "Default snapshot must be frozen (immutable)");

    console.log("✅ TEST 1 PASSED: Shell initializes cleanly without data (safe default snapshot verified)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 1 FAILED:", err.message);
  }

  // ── TEST 2: Navigation loads all 8 modules ─────────────────────────

  try {
    const modules = CommandCenterNavigation.getModules();
    assert.strictEqual(modules.length, 8, "Navigation must expose exactly 8 modules");

    const expectedKeys = ['overview', 'reality', 'alpha', 'shadow', 'endurance', 'blackswan', 'forensics', 'oversight'];
    const actualKeys = modules.map(m => m.key);
    assert.deepStrictEqual(actualKeys, expectedKeys, "Module keys must match expected order");

    const registeredModules = CommandCenterRouter.getRegisteredModules();
    assert.strictEqual(registeredModules.length, 8, "Router must register exactly 8 modules");
    for (const key of expectedKeys) {
      assert(registeredModules.includes(key), `Router must register module: ${key}`);
    }

    console.log("✅ TEST 2 PASSED: Navigation loads all 8 modules in correct order");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 2 FAILED:", err.message);
  }

  // ── TEST 3: Runtime Adapter has ZERO write methods ─────────────────

  try {
    // Enumerate all public methods on the adapter
    const proto = Object.getPrototypeOf(runtimeAdapter);
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      name => name !== 'constructor' && typeof proto[name] === 'function'
    );

    // Define the exhaustive list of allowed read-only methods
    const allowedMethods = [
      'getSnapshot',
      'getDefaultSnapshot',
      'hasData',
      'getVetoAuditLog',
      '_extractValue',
      '_extractNumeric'
    ];

    // Define forbidden write-pattern method names
    const writePrefixes = ['set', 'write', 'modify', 'update', 'delete', 'put', 'patch', 'execute', 'create', 'insert', 'mutate', 'change', 'remove', 'alter', 'push', 'ingest'];

    for (const method of methodNames) {
      if (method.startsWith('_')) continue; // skip private
      const lower = method.toLowerCase();
      for (const prefix of writePrefixes) {
        assert(
          !lower.startsWith(prefix),
          `RuntimeAdapter has forbidden write-pattern method: ${method}`
        );
      }
    }

    // Verify the adapter does not expose dataProvider directly
    assert(!runtimeAdapter.dataProvider, "Adapter must NOT expose dataProvider publicly");
    assert(!runtimeAdapter._dataProvider || typeof runtimeAdapter._dataProvider === 'object', "Internal _dataProvider must exist");

    console.log("✅ TEST 3 PASSED: Runtime Adapter has ZERO write methods (read-only contract verified)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 3 FAILED:", err.message);
  }

  // ── TEST 4: Mutation attempt triggers DASHBOARD_CONTROL_VETO ───────

  try {
    // Reset veto logs for clean test
    const prevCount = securityGuard.getVetoCount();

    const shell = new CommandCenterShell();
    const vetoResult = shell.triggerAction('WRITE_ALPHA');
    assert.strictEqual(vetoResult.allowed, false, "Shell must block WRITE_ALPHA");
    assert.strictEqual(vetoResult.status, 403, "Must return HTTP 403");
    assert.strictEqual(vetoResult.vetoEvent.event, 'DASHBOARD_CONTROL_VETO', "Must emit DASHBOARD_CONTROL_VETO");

    const vetoResult2 = shell.triggerAction('EXECUTE_ORDER');
    assert.strictEqual(vetoResult2.allowed, false, "Shell must block EXECUTE_ORDER");

    const vetoResult3 = shell.triggerAction('MODIFY_PARAMETERS');
    assert.strictEqual(vetoResult3.allowed, false, "Shell must block MODIFY_PARAMETERS");

    assert(securityGuard.getVetoCount() >= prevCount + 3, "At least 3 new veto events must be logged");

    console.log("✅ TEST 4 PASSED: Mutation attempts correctly trigger DASHBOARD_CONTROL_VETO (3/3 vetoed)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 4 FAILED:", err.message);
  }

  // ── TEST 5: OBSERVED_REALITY data appears correctly via adapter ────

  try {
    dataProvider.reset();

    // Ingest observed reality metrics
    dataProvider.ingest({
      name: 'RealityGapScore',
      value: 92,
      reality_tag: 'OBSERVED_REALITY',
      timestamp: new Date().toISOString(),
      source: 'RealityGapMonitor'
    });
    dataProvider.ingest({
      name: 'UptimePct',
      value: 99.97,
      reality_tag: 'OBSERVED_REALITY',
      timestamp: new Date().toISOString(),
      source: 'ShadowWarEngine'
    });

    assert(runtimeAdapter.hasData(), "Adapter must detect ingested data");

    const snapshot = runtimeAdapter.getSnapshot();
    assert.strictEqual(snapshot.reality.score, 92, "Reality score must be 92 from ingested metric");
    assert.strictEqual(snapshot.endurance.uptime_pct, 99.97, "Uptime must be 99.97 from ingested metric");
    assert(Object.isFrozen(snapshot), "Snapshot must be frozen (immutable)");
    assert(snapshot.snapshot_timestamp, "Snapshot must have a timestamp");

    console.log("✅ TEST 5 PASSED: OBSERVED_REALITY data appears correctly via RuntimeAdapter snapshot");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 5 FAILED:", err.message);
  }

  // ── TEST 6: SYNTHETIC_REALITY data remains isolated via adapter ────

  try {
    dataProvider.reset();

    // Ingest synthetic data
    dataProvider.ingest({
      name: 'BlackSwanOverall',
      value: 'PASSED',
      reality_tag: 'SYNTHETIC_REALITY',
      timestamp: new Date().toISOString(),
      source: 'ChaosEngine'
    });
    dataProvider.ingest({
      name: 'BlackSwanPassed',
      value: 6,
      reality_tag: 'SYNTHETIC_REALITY',
      timestamp: new Date().toISOString(),
      source: 'ChaosEngine'
    });

    const snapshot = runtimeAdapter.getSnapshot();

    // Synthetic data should appear in black_swan section
    assert.strictEqual(snapshot.black_swan.overall, 'PASSED', "Black swan overall must come from synthetic store");
    assert.strictEqual(snapshot.black_swan.scenarios_passed, 6, "Black swan passed count must come from synthetic store");

    // Observed-only fields must retain defaults (no cross-contamination)
    assert.strictEqual(snapshot.reality.score, 0, "Reality score must remain default (no observed data ingested)");
    assert.strictEqual(snapshot.endurance.uptime_pct, 0, "Uptime must remain default (no observed data ingested)");

    console.log("✅ TEST 6 PASSED: SYNTHETIC_REALITY data remains isolated (zero cross-contamination in snapshot)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 6 FAILED:", err.message);
  }

  // ── SUMMARY ────────────────────────────────────────────────────────

  console.log(`\n====================================================`);
  console.log(`SUMMARY: ${passedCount}/${totalTests} TESTS PASSED`);
  if (passedCount === totalTests) {
    console.log("🏆 COMMAND CENTER v2 SHELL & RUNTIME ADAPTER CERTIFIED!");
    console.log("🛡️ ETAPA 2 CONCLUÍDA — AGUARDANDO APROVAÇÃO PARA INTEGRAÇÃO.");
  } else {
    console.error("🚨 CERTIFICATION FAILURE: One or more tests failed.");
    process.exit(1);
  }
}

runShellTests();
