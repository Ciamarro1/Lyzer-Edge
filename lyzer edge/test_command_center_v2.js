/**
 * Lyzer Edge Command Center v2 — Mandatory Verification Suite
 * Tests 7 required fiduciary invariants and read-only boundaries.
 */

import assert from 'assert';
import { dataProvider } from './src/services/dashboard/dashboardDataProvider.js';
import { metricValidator } from './src/services/dashboard/metricValidator.js';
import { realityTagValidator } from './src/services/dashboard/realityTagValidator.js';
import { lineageVerifier } from './src/services/dashboard/lineageVerifier.js';
import { securityGuard } from './src/services/dashboard/dashboardSecurityGuard.js';

import { ExecutiveOverview } from './src/components/commandCenter/ExecutiveOverview.js';
import { RealityObservatory } from './src/components/commandCenter/RealityObservatory.js';
import { AlphaIntegrityMonitor } from './src/components/commandCenter/AlphaIntegrityMonitor.js';
import { ShadowExecutionCenter } from './src/components/commandCenter/ShadowExecutionCenter.js';
import { OperationalSurvivalCenter } from './src/components/commandCenter/OperationalSurvivalCenter.js';
import { BlackSwanDefensePanel } from './src/components/commandCenter/BlackSwanDefensePanel.js';
import { DataLineageForensics } from './src/components/commandCenter/DataLineageForensics.js';
import { HumanOversightPanel } from './src/components/commandCenter/HumanOversightPanel.js';

async function runCommandCenterTests() {
  console.log("🏛️ STARTING LYZER EDGE COMMAND CENTER v2 VERIFICATION SUITE...\n");
  let passedCount = 0;
  const totalTests = 7;

  // Test 1: Dashboard carrega sem dados reais
  try {
    dataProvider.reset();
    const execOverview = new ExecutiveOverview(dataProvider);
    const realityObs = new RealityObservatory(dataProvider);
    const alphaMon = new AlphaIntegrityMonitor(dataProvider);
    const shadowCenter = new ShadowExecutionCenter(dataProvider);
    const survivalCenter = new OperationalSurvivalCenter(dataProvider);
    const blackSwan = new BlackSwanDefensePanel(dataProvider);
    const forensics = new DataLineageForensics(dataProvider);
    const oversight = new HumanOversightPanel(dataProvider);

    assert(execOverview && realityObs && alphaMon && shadowCenter && survivalCenter && blackSwan && forensics && oversight, "Components failed to instantiate");
    console.log("✅ TEST 1 PASSED: Dashboard carrega sem dados reais (All 8 components instantiated cleanly)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 1 FAILED:", err.message);
  }

  // Test 2: Dados OBSERVED_REALITY aparecem corretamente
  try {
    dataProvider.reset();
    const res = dataProvider.ingest({
      name: "RealityGapScore",
      value: 96,
      reality_tag: "OBSERVED_REALITY",
      timestamp: new Date().toISOString(),
      source: "RealityGapMonitor"
    });
    assert.strictEqual(res.success, true, "Ingestion should succeed for valid OBSERVED_REALITY");
    assert.strictEqual(dataProvider.getObservedMetrics().length, 1, "Should store 1 observed metric");
    assert.strictEqual(dataProvider.getSyntheticMetrics().length, 0, "Should store 0 synthetic metrics");
    console.log("✅ TEST 2 PASSED: Dados OBSERVED_REALITY aparecem corretamente e armazenados isoladamente");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 2 FAILED:", err.message);
  }

  // Test 3: Dados SYNTHETIC_REALITY aparecem separados
  try {
    dataProvider.reset();
    const res = dataProvider.ingest({
      name: "BlackSwanOutageTest",
      value: "PASSED",
      reality_tag: "SYNTHETIC_REALITY",
      timestamp: new Date().toISOString(),
      source: "ChaosEngine"
    });
    assert.strictEqual(res.success, true, "Ingestion should succeed for valid SYNTHETIC_REALITY");
    assert.strictEqual(dataProvider.getSyntheticMetrics().length, 1, "Should store 1 synthetic metric");
    assert.strictEqual(dataProvider.getObservedMetrics().length, 0, "Should store 0 observed metrics");
    console.log("✅ TEST 3 PASSED: Dados SYNTHETIC_REALITY aparecem separados da realidade física");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 3 FAILED:", err.message);
  }

  // Test 4: Mistura gera veto (OBSERVED_REALITY + SYNTHETIC_REALITY no mesmo batch)
  try {
    dataProvider.reset();
    const mixedBatch = [
      { name: "MetricA", value: 10, reality_tag: "OBSERVED_REALITY", timestamp: new Date().toISOString(), source: "A" },
      { name: "MetricB", value: 20, reality_tag: "SYNTHETIC_REALITY", timestamp: new Date().toISOString(), source: "B" }
    ];
    const res = dataProvider.ingest(mixedBatch);
    assert.strictEqual(res.success, false, "Ingestion must fail when reality tags are mixed");
    assert.strictEqual(res.veto, "EPISTEMIC_CONTAMINATION", "Must trigger EPISTEMIC_CONTAMINATION veto");
    console.log("✅ TEST 4 PASSED: Mistura gera veto (EPISTEMIC_CONTAMINATION interceptado com sucesso)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 4 FAILED:", err.message);
  }

  // Test 5: Tentativa de escrita gera veto (DASHBOARD_CONTROL_VETO)
  try {
    const vetoRes = securityGuard.inspect({
      method: "POST",
      action: "WRITE_ALPHA",
      payload: { newWeight: 0.8 },
      source: "UnauthorizedClient"
    });
    assert.strictEqual(vetoRes.allowed, false, "Security guard must block WRITE_ALPHA");
    assert.strictEqual(vetoRes.vetoEvent.event, "DASHBOARD_CONTROL_VETO", "Must log DASHBOARD_CONTROL_VETO");
    assert.strictEqual(vetoRes.status, 403, "Must return HTTP 403 status");

    const comp = new ExecutiveOverview(dataProvider);
    const compVeto = comp.triggerAction("MODIFY_PARAMETERS");
    assert.strictEqual(compVeto.allowed, false, "Component triggerAction must also be vetoed");
    console.log("✅ TEST 5 PASSED: Tentativa de escrita gera veto (DASHBOARD_CONTROL_VETO acionado para POST/WRITE_ALPHA)");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 5 FAILED:", err.message);
  }

  // Test 6: Hashes inválidos ficam RED / inválidos no LineageVerifier
  try {
    const validEvent = {
      origin: "TruthKernel",
      hash: "a8f5b2c9e7d1048372619405827364510928374655a1b2c3d4e5f60718293a4b",
      transformationChain: ["RAW"],
      timestamp: new Date().toISOString()
    };
    const invalidEvent = {
      origin: "TruthKernel",
      hash: "corrupted_short_hash_123",
      transformationChain: ["RAW"],
      timestamp: new Date().toISOString()
    };

    const validRes = lineageVerifier.verify(validEvent);
    const invalidRes = lineageVerifier.verify(invalidEvent);

    assert.strictEqual(validRes.valid, true, "Valid SHA256 must pass verification");
    assert.strictEqual(invalidRes.valid, false, "Invalid SHA256 must be rejected");
    assert(invalidRes.error.includes("Invalid or missing SHA-256 hash"), "Must indicate hash error");
    console.log("✅ TEST 6 PASSED: Hashes inválidos ficam RED e são rejeitados pelo LineageVerifier");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 6 FAILED:", err.message);
  }

  // Test 7: Schema inválido não renderiza (MetricValidator rejeita payload incompleto)
  try {
    const invalidMetric1 = { name: "MissingFields" }; // missing value, reality_tag, timestamp, source
    const invalidMetric2 = {
      name: "BadTimestamp",
      value: 100,
      reality_tag: "OBSERVED_REALITY",
      timestamp: "not-a-timestamp",
      source: "Test"
    };
    const invalidMetric3 = {
      name: "BadTag",
      value: 100,
      reality_tag: "UNKNOWN_TAG",
      timestamp: new Date().toISOString(),
      source: "Test"
    };

    assert.strictEqual(metricValidator.validate(invalidMetric1).valid, false, "Must reject missing fields");
    assert.strictEqual(metricValidator.validate(invalidMetric2).valid, false, "Must reject bad timestamp");
    assert.strictEqual(metricValidator.validate(invalidMetric3).valid, false, "Must reject bad reality tag");
    console.log("✅ TEST 7 PASSED: Schema inválido não renderiza e é barrado na camada de validação");
    passedCount++;
  } catch (err) {
    console.error("❌ TEST 7 FAILED:", err.message);
  }

  console.log(`\n====================================================`);
  console.log(`SUMMARY: ${passedCount}/${totalTests} TESTS PASSED`);
  if (passedCount === totalTests) {
    console.log("🏆 COMMAND CENTER v2 (ETAPA 1 & 2) COMPONENT AND SERVICE LAYER CERTIFIED!");
  } else {
    console.error("🚨 CERTIFICATION FAILURE: One or more tests failed.");
    process.exit(1);
  }
}

runCommandCenterTests();
