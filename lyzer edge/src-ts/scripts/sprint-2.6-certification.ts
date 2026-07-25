import assert from 'assert';
import { eventBus } from '../../src/lib/eventBus.js';
import { CapitalIntelligenceMonitor } from '../../src/intelligence/CapitalIntelligenceMonitor.js';
import { SystemMetacognitionLayer } from '../../src/engine/sml.js';
import { FailureModeCartography } from '../../src/engine/fmc.js';
import { MetaInsightLayer } from '../../src/intelligence/MetaInsightLayer.js';
import { CilPreparation } from '../../src/intelligence/CilPreparation.js';

async function runCertificationSuite() {
  console.log('='.repeat(80));
  console.log('  LYZER LABS - SPRINT 2.6 INTEGRATION CERTIFICATION SUITE');
  console.log('='.repeat(80));

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${e.stack || e.message}`);
    }
  }

  // 1. CIM & SML Alerts integration (Thermodynamic Drift, Capital Lock)
  await test('T1: Capital Intelligence Monitor (CIM) Alert Propagation to SML', () => {
    const cim = new CapitalIntelligenceMonitor(10);
    const sml = new SystemMetacognitionLayer({ windowSize: 10 });
    
    // Simulate capital lock conditions: retention=1.0 while opportunity entropy is high
    eventBus.emit('research:opportunity_entropy', {
      entropy: 0.8,
      triggerEvent: 'VOLATILITY_SHOCK',
      activeOpportunityCount: 5,
      timestamp: Date.now()
    });

    for (let i = 0; i < 5; i++) {
      eventBus.emit('observational:trajectory_update', {
        timestamp: Date.now(),
        capitalAgeAvg: 5000,
        capitalVelocity: 0.0,
        capitalConcentration: 0.5,
        capitalRetention: 1.0,
        allocations: {}
      });
    }

    cim.evaluateAndEmitSummary();

    // Verify CIM lockAlert is active
    assert.ok(sml.lastCapitalSummary, 'SML must ingest CIM summary');
    assert.strictEqual(sml.lastCapitalSummary.lockAlert, true, 'CIM should raise lockAlert');

    // Simulate SML snapshot ingestion and analysis
    for (let i = 0; i < 5; i++) {
      sml.ingestSnapshot({
        layers: {
          kernel: { signal: 'caution', confidence: 70 },
          stl: { signal: 'NOMINAL' },
          rdm: { signal: 'STABLE', raw_metrics: { realityDriftIndex: 0.1 } }
        }
      });
    }

    const smlReport = sml.analyze();
    const lockDetection = smlReport.detections.find(d => d.type === 'CAPITAL_LOCK');
    assert.ok(lockDetection, 'SML should detect CAPITAL_LOCK from CIM alerts');
    assert.strictEqual(lockDetection.severity, 'WARNING', 'CAPITAL_LOCK severity must be WARNING');
  });

  // 2. Failure Mode Cartography (FMC) Governance Metastability & Thermodynamic Decay
  await test('T2: FMC Governance Metastability Elevation & Thermodynamic Decay Mapping', () => {
    const sml = new SystemMetacognitionLayer({ windowSize: 15 });
    const fmc = new FailureModeCartography();

    // Ingest 10 snapshots to satisfy FMC minimum length boundary
    for (let i = 0; i < 10; i++) {
      sml.ingestSnapshot({
        layers: {
          kernel: { signal: 'caution', confidence: 70 },
          stl: { signal: 'NOMINAL', raw_metrics: { net_energy: 0.5 } },
          rdm: { signal: 'STABLE', raw_metrics: { realityDriftIndex: 0.1 } }
        }
      });
    }

    // 1. Test CAPITAL_LOCK elevating GOVERNANCE_METASTABILITY
    sml.lastCapitalSummary = {
      timestamp: Date.now(),
      averageStress: 0.5,
      averageRatio: 1.5,
      feeBleedVelocity: 0,
      capitalVelocity: 0,
      capitalRetention: 1.0,
      opportunityEntropy: 0.8,
      driftAlert: false,
      lockAlert: true,
      churnAlert: false
    };

    // Trigger CAPITAL_LOCK detection in SML
    let smlReport = sml.analyze();
    let fmcReport = fmc.evaluateFailureModes(smlReport, sml.snapshots);

    // Verify threat contains GOVERNANCE_METASTABILITY
    let govMetastability = fmcReport.activeThreats.find(t => t.mode === 'GOVERNANCE_METASTABILITY');
    assert.ok(govMetastability, 'FMC should flag GOVERNANCE_METASTABILITY when SML reports CAPITAL_LOCK');
    assert.strictEqual(govMetastability.severity, 'CRITICAL', 'GOVERNANCE_METASTABILITY must be CRITICAL');

    // 2. Test Thermodynamic Drift or Churn triggering THERMODYNAMIC_DECAY
    sml.lastCapitalSummary = {
      timestamp: Date.now(),
      averageStress: 0.95,
      averageRatio: 1.05,
      feeBleedVelocity: 25.0,
      capitalVelocity: 0.5,
      capitalRetention: 0.5,
      opportunityEntropy: 0.6,
      driftAlert: true, // Drift alert active
      lockAlert: false,
      churnAlert: true   // Churn alert active
    };

    smlReport = sml.analyze();
    fmcReport = fmc.evaluateFailureModes(smlReport, sml.snapshots);

    let thermodynamicDecay = fmcReport.activeThreats.find(t => t.mode === 'THERMODYNAMIC_DECAY');
    assert.ok(thermodynamicDecay, 'FMC should map THERMODYNAMIC_DECAY when SML flags thermodynamic drift/churn');
    assert.strictEqual(thermodynamicDecay.severity, 'CRITICAL', 'THERMODYNAMIC_DECAY must be CRITICAL');
  });

  // 3. FMC CAPITAL_ATTRITION_SPIRAL detection
  await test('T3: FMC CAPITAL_ATTRITION_SPIRAL Threat Signature Detection', () => {
    const sml = new SystemMetacognitionLayer({ windowSize: 15 });
    const fmc = new FailureModeCartography();

    // Ingest 10 snapshots to satisfy FMC minimum length boundary
    for (let i = 0; i < 10; i++) {
      sml.ingestSnapshot({
        layers: {
          kernel: { signal: 'caution', confidence: 70 },
          stl: { signal: 'NOMINAL', raw_metrics: { net_energy: 0.5 } },
          rdm: { signal: 'STABLE', raw_metrics: { realityDriftIndex: 0.1 } }
        }
      });
    }

    // Setup an SML report containing a summary with capital attrition loop metrics:
    // high velocity/fee bleed velocity + increasing stress + dropping TR
    sml.lastCapitalSummary = {
      timestamp: Date.now(),
      averageStress: 0.85, // Stress > 0.7
      averageRatio: 1.15,  // TR < 1.3
      feeBleedVelocity: 15.0, // fee bleed velocity > 5.0
      capitalVelocity: 0.6,
      capitalRetention: 0.4,
      opportunityEntropy: 0.5,
      driftAlert: true,
      lockAlert: false,
      churnAlert: true
    };

    const smlReport = sml.analyze();
    const fmcReport = fmc.evaluateFailureModes(smlReport, sml.snapshots);

    const attritionSpiral = fmcReport.activeThreats.find(t => t.mode === 'CAPITAL_ATTRITION_SPIRAL');
    assert.ok(attritionSpiral, 'FMC should detect CAPITAL_ATTRITION_SPIRAL');
    assert.strictEqual(attritionSpiral.severity, 'CRITICAL', 'CAPITAL_ATTRITION_SPIRAL must be CRITICAL');
  });

  // 4. Meta Insight Layer (MIL) COSUP, Missed Alpha, and Governance Blindness
  await test('T4: MIL Counterfactual Opportunity Suppression (COSUP) & Governance Blindness', () => {
    const mil = new MetaInsightLayer();
    let cosupAlertReceived = false;
    let alertedPnl = 0;

    // Listen to COSUP alerts
    eventBus.on('mil:cosup_alert', (data: any) => {
      cosupAlertReceived = true;
      alertedPnl = data.suppressedGain;
    });

    const timestamp = Date.now();
    // Simulate STL publishing a vetoed opportunity
    // Expected Gain = 100, Cost = 50 -> TR = 2.0. Let's say threshold was 2.5, so allowed=false
    eventBus.emit('thermodynamics:ratio', {
      ratio: 2.0,
      expectedGain: 100,
      migrationCost: 50,
      threshold: 2.5,
      allowed: false,
      timestamp
    });

    const vetoed = mil.getVetoedOpportunities();
    assert.strictEqual(vetoed.length, 1, 'MIL should record 1 vetoed opportunity');

    // Resolve the opportunity's actual realized performance (e.g. +800 profit)
    const optId = vetoed[0].id;
    mil.recordOpportunityOutcome(optId, 800);

    // Verify COSUP Alert was emitted
    assert.strictEqual(cosupAlertReceived, true, 'COSUP alert should trigger when vetoed opt turns out profitable');
    assert.strictEqual(alertedPnl, 800, 'COSUP alert should carry the realized gain');

    // Missed Alpha = Best Counterfactual Path (10000 + 800 - 50 = 10750) - Current Baseline Equity (10000) = 750
    const missed = mil.detectMissedAlpha();
    assert.strictEqual(missed.missedAlpha, 750, 'Missed alpha should be 750');
    assert.strictEqual(missed.ratio, 0.075, 'Missed alpha ratio should be 7.5%');

    // Governance Blindness Check: ratio 7.5% > 5% should trigger RESTRICTIVE blindness
    const blindness = mil.detectGovernanceBlindness();
    assert.strictEqual(blindness.blindnessDetected, true, 'Governance blindness must be detected');
    assert.strictEqual(blindness.type, 'RESTRICTIVE', 'Blindness type should be RESTRICTIVE');
  });

  // 5. CIL Preparation Causal Dataset Builder (Cause -> Intervention -> Outcome)
  await test('T5: CIL Preparation Cause -> Intervention -> Outcome Mapping', async () => {
    const cil = new CilPreparation();
    let recordReceived = false;
    let receivedRecord: any = null;

    eventBus.on('cil:causal_record', (data: any) => {
      recordReceived = true;
      receivedRecord = data;
    });

    // 1. Emit Cause
    eventBus.emit('research:opportunity_entropy', {
      entropy: 0.8,
      triggerEvent: 'VOLATILITY_SHOCK',
      activeOpportunityCount: 3,
      timestamp: Date.now()
    });

    // 2. Emit Intervention (Veto)
    eventBus.emit('thermodynamics:ratio', {
      ratio: 0.9,
      expectedGain: 90,
      migrationCost: 100,
      threshold: 1.5,
      allowed: false,
      timestamp: Date.now()
    });

    // 3. Resolve transition using capital intelligence summary update
    eventBus.emit('capital:intelligence_summary', {
      timestamp: Date.now(),
      averageStress: 0.95,
      averageRatio: 0.95,
      feeBleedVelocity: 0,
      capitalVelocity: 0,
      capitalRetention: 1.0,
      opportunityEntropy: 0.8,
      driftAlert: true,
      lockAlert: true,
      churnAlert: false
    });

    // Wait for the deferred CIL Prep macro-task to execute
    await new Promise(resolve => setTimeout(resolve, 15));

    // Verify causal record was logged and structured correctly
    assert.strictEqual(recordReceived, true, 'Causal record should be emitted');
    assert.strictEqual(receivedRecord.cause, 'VOLATILITY_SHOCK', 'Cause should be VOLATILITY_SHOCK');
    assert.strictEqual(receivedRecord.intervention, 'TR_VETO', 'Intervention should be TR_VETO');
    assert.strictEqual(receivedRecord.observedOutcome, 'Capital Lock (Veto Active)', 'Observed outcome should resolve to Capital Lock');
    assert.strictEqual(receivedRecord.counterfactualOutcome, 'Rotation Allowed but Bleed Incurred', 'Counterfactual outcome should map correctly');

    const dataset = cil.getDataset();
    assert.strictEqual(dataset.length, 1, 'Causal dataset should have 1 record');
  });

  console.log('='.repeat(80));
  if (passed === total) {
    console.log(`  🎉 ALL INTEGRATION CERTIFICATION TESTS PASSED: ${passed}/${total}`);
    process.exit(0);
  } else {
    console.error(`  🔴 FAILURE: ${total - passed} certification tests failed.`);
    process.exit(1);
  }
}

runCertificationSuite().catch((err) => {
  console.error('Fatal crash in certification suite:', err);
  process.exit(1);
});
