import assert from 'assert';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eventBus } from '../../src/lib/eventBus.js';
import * as ArchiveCML from '../../src/capital/CapitalMigrationLogic.js';
import * as ArchiveOCE from '../../src/capital/OpportunityCostEngine.js';
import { SystemThermodynamicsLayer } from '../../src/governance/SystemThermodynamicsLayer.js';
import { CapitalOpportunitySurface } from '../../src/research/CapitalOpportunitySurface.js';
import { CapitalMemoryLayer } from '../../src/capital/CapitalMemoryLayer.js';
import { CapitalRotationStudy, SimulationTrade } from '../../src/research/CapitalRotationStudy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCertificationSuite() {
  console.log('='.repeat(72));
  console.log('  LYZER LABS - SPRINT 2.5 REVISION CERTIFICATION SUITE');
  console.log('='.repeat(72));

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${e.message}`);
    }
  }

  // 1. Governance Archive Verification
  test('T1: Governance Archive Deprecation & Freeze', () => {
    // Check CapitalMigrationLogic
    assert.strictEqual(ArchiveCML.STATUS, 'DEPRECATED_BY_GOVERNANCE', 'CML archive status must match');
    assert.ok(ArchiveCML.ARCHIVED_AT, 'CML archive date must be present');
    
    // Check OpportunityCostEngine
    assert.strictEqual(ArchiveOCE.STATUS, 'DEPRECATED_BY_GOVERNANCE', 'OCE archive status must match');
    assert.ok(ArchiveOCE.ARCHIVED_AT, 'OCE archive date must be present');

    // Confirm no execution triggers exist
    const cmlKeys = Object.keys(ArchiveCML);
    const oceKeys = Object.keys(ArchiveOCE);
    assert.ok(!cmlKeys.includes('migrate'), 'No active migration triggers allowed');
    assert.ok(!oceKeys.includes('calculateOpportunityCost'), 'No active opportunity calculations allowed');
  });

  // 2. STL Veto & Publication Verification
  test('T2: STL Thermodynamic Ratio (TR) Veto Logic & SML Publication', () => {
    const stl = new SystemThermodynamicsLayer({ threshold: 1.5 });
    let publishedRatio: number | null = null;
    let publishedAllowed: boolean | null = null;

    // Set up SML listener simulation
    eventBus.on('thermodynamics:ratio', (data: any) => {
      publishedRatio = data.ratio;
      publishedAllowed = data.allowed;
    });

    // Test A: Veto (TR <= 1.5)
    // Expected Gain = 100, Migration Cost = 80 -> TR = 1.25 <= 1.5 (Vetoed)
    const evalVeto = stl.evaluateMigration(100, 80);
    assert.strictEqual(evalVeto.allowed, false, 'Should veto when TR <= threshold');
    assert.strictEqual(evalVeto.ratio, 1.25, 'TR ratio should be 1.25');
    assert.strictEqual(evalVeto.reason, 'VETO_THERMODYNAMIC_DEFICIT', 'Should cite veto reason');
    
    // Verify NATS/EventBus publication
    assert.strictEqual(publishedRatio, 1.25, 'Should publish TR 1.25 to event bus');
    assert.strictEqual(publishedAllowed, false, 'Should publish allowed=false to event bus');

    // Test B: Allow (TR > 1.5)
    // Expected Gain = 200, Migration Cost = 100 -> TR = 2.0 > 1.5 (Allowed)
    const evalAllow = stl.evaluateMigration(200, 100);
    assert.strictEqual(evalAllow.allowed, true, 'Should allow when TR > threshold');
    assert.strictEqual(evalAllow.ratio, 2.0, 'TR ratio should be 2.0');
    assert.strictEqual(evalAllow.reason, 'TR_EXCEEDS_THRESHOLD', 'Should cite allow reason');
    
    // Verify NATS/EventBus publication
    assert.strictEqual(publishedRatio, 2.0, 'Should publish TR 2.0 to event bus');
    assert.strictEqual(publishedAllowed, true, 'Should publish allowed=true to event bus');
  });

  // 3. COS Event-Driven Snapshots & FMC Publication Verification
  test('T3: COS Event-Driven Snapshots & FMC Opportunity Entropy', () => {
    const cos = new CapitalOpportunitySurface();
    let publishedEntropy: number | null = null;
    let publishedTrigger: string | null = null;

    // Set up FMC listener simulation
    eventBus.on('research:opportunity_entropy', (data: any) => {
      publishedEntropy = data.entropy;
      publishedTrigger = data.triggerEvent;
    });

    // Register test opportunities
    cos.updateOpportunity({ id: 'opt_1', symbol: 'BTCUSDT', expectedEdge: 3.5, confidence: 80 });
    cos.updateOpportunity({ id: 'opt_2', symbol: 'ETHUSDT', expectedEdge: 1.5, confidence: 70 });

    // Emit event-driven snapshot trigger (regime:changed)
    eventBus.emit('regime:changed', { regime: 'bull' });

    // Shannon Entropy check:
    // Edges: 3.5, 1.5 -> Total: 5.0
    // p1 = 3.5/5 = 0.7, p2 = 1.5/5 = 0.3
    // H = -(0.7 * log2(0.7) + 0.3 * log2(0.3)) = -(-0.3602 - 0.5211) = 0.8813
    assert.ok(publishedEntropy !== null, 'Entropy should be calculated and published');
    assert.strictEqual(publishedTrigger, 'REGIME_CHANGE', 'Trigger event should match');
    assert.ok(Math.abs(publishedEntropy - 0.8813) < 0.001, `Entropy calculation discrepancy: got ${publishedEntropy}`);
  });

  // 4. CML Trajectory calculations
  test('T4: CML Historical Capital Trajectories & Observational Logging', () => {
    const cml = new CapitalMemoryLayer();
    let trajectoryUpdate: any = null;

    eventBus.on('observational:trajectory_update', (data: any) => {
      trajectoryUpdate = data;
    });

    // Initial allocations:
    // Strat_A: $5,000, Strat_B: $5,000
    const allocations1 = { Strat_A: 5000, Strat_B: 5000 };
    cml.handleAllocationUpdate({ allocations: allocations1 });

    assert.ok(trajectoryUpdate !== null, 'Trajectory update should be emitted');
    // Concentration (HHI) for equal weights: (0.5^2 + 0.5^2) = 0.5
    assert.strictEqual(trajectoryUpdate.capitalConcentration, 0.5, 'Equal weights should yield 0.5 HHI');
    assert.strictEqual(trajectoryUpdate.capitalVelocity, 0, 'Initial state should have 0 velocity');
    assert.strictEqual(trajectoryUpdate.capitalRetention, 1.0, 'Initial state should have 1.0 retention');

    // Simulate allocation rotation (allocation change):
    // Rotate to Strat_A: $8,000, Strat_B: $2,000
    const allocations2 = { Strat_A: 8000, Strat_B: 2000 };
    // Trigger allocation change event
    eventBus.emit('allocation:change', { allocations: allocations2 });

    assert.ok(trajectoryUpdate.capitalConcentration > 0.5, 'Concentrated weight should increase HHI');
    // HHI = 0.8^2 + 0.2^2 = 0.64 + 0.04 = 0.68
    assert.strictEqual(trajectoryUpdate.capitalConcentration, 0.68, 'HHI should match 0.68');

    // Velocity = sum(abs(current - last)) / (2 * sum(last))
    // Diff: A = +3000, B = -3000 -> SumAbsDiff = 6000
    // Total last = 10000
    // Velocity = 6000 / 20000 = 0.3
    assert.strictEqual(trajectoryUpdate.capitalVelocity, 0.3, 'Velocity should match 0.3');
    assert.strictEqual(trajectoryUpdate.capitalRetention, 0.7, 'Retention should match 0.7');
    assert.ok(trajectoryUpdate.capitalAgeAvg >= 0, 'Capital Age should be logged');
  });

  // 5. CRS Counterfactual Paths & Study Report Verification
  test('T5: CRS Counterfactual Paths Simulation & Research Report', () => {
    const study = new CapitalRotationStudy(10000);
    const mockTrades: SimulationTrade[] = [
      { id: 't1', timestamp: Date.now() - 3600000 * 5, symbol: 'BTCUSDT', expectedEdge: 2.0, realizedPnl: 200, durationMs: 60000 },
      { id: 't2', timestamp: Date.now() - 3600000 * 4, symbol: 'ETHUSDT', expectedEdge: 1.5, realizedPnl: -100, durationMs: 60000 },
      { id: 't3', timestamp: Date.now() - 3600000 * 3, symbol: 'SOLUSDT', expectedEdge: 3.0, realizedPnl: 400, durationMs: 60000 },
      { id: 't4', timestamp: Date.now() - 3600000 * 2, symbol: 'BTCUSDT', expectedEdge: 2.5, realizedPnl: 150, durationMs: 60000 },
      { id: 't5', timestamp: Date.now() - 3600000 * 1, symbol: 'ETHUSDT', expectedEdge: 1.0, realizedPnl: -50, durationMs: 60000 },
    ];

    // Simulate with 15bps friction, forcing 2 rotation points
    const result = study.simulate(mockTrades, 15, 2);
    
    // Verify paths exist and contain baseline/migration steps
    assert.strictEqual(result.baselinePath.length, mockTrades.length + 1, 'Baseline path points should match');
    assert.strictEqual(result.migrationPath.length, mockTrades.length + 1, 'Migration path points should match');
    
    // Check metric calculations
    assert.ok(result.metrics.baselineFinalEquity > 0, 'Baseline final equity should be logged');
    assert.ok(result.metrics.feeBleedTotal > 0, 'Fee bleed total must be simulated');
    assert.ok(result.metrics.netDivergence !== 0, 'Net divergence must be computed');

    // Generate study report
    const report = study.generateReport(result);
    assert.ok(report.includes('CAPITAL ROTATION STUDY'), 'Report header must be present');
    assert.ok(report.includes('VERDICT'), 'Report verdict must be present');
    
    console.log('\n--- RESEARCH STUDY REPORT ---');
    console.log(report);
  });

  // 6. Programmatic Import Graph Audit (Governance Archive Integrity)
  test('T6: Governance Archive Import Graph Audit', () => {
    function walkDir(dir: string, callback: (filePath: string) => void) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath, callback);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
          callback(filePath);
        }
      }
    }

    const srcDir = path.resolve(__dirname, '../../src');
    const forbiddenImports = ['CapitalMigrationLogic', 'OpportunityCostEngine'];
    let violationCount = 0;

    walkDir(srcDir, (filePath) => {
      // Exclude the deprecated files themselves
      if (filePath.includes('CapitalMigrationLogic') || filePath.includes('OpportunityCostEngine')) {
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      for (const forbidden of forbiddenImports) {
        if (content.includes(forbidden)) {
          // Double check if it's a real import/require
          if (content.match(new RegExp(`import\\s+.*from\\s+['\"].*${forbidden}['\"]`)) ||
              content.match(new RegExp(`require\\s*\\(\\s*['\"].*${forbidden}['\"]\\s*\\)`))) {
            console.error(`      [VIOLATION] Active file ${path.basename(filePath)} imports forbidden module ${forbidden}`);
            violationCount++;
          }
        }
      }
    });

    assert.strictEqual(violationCount, 0, 'No active files are allowed to import from Governance Archive');
  });

  // 7. Programmatic Boundary Isolation & Research Containment Audit
  test('T7: Research Layer Boundary Isolation & Containment Audit', () => {
    const researchDir = path.resolve(__dirname, '../../src/research');
    const forbiddenImports = ['src/fund', 'src/eca', 'src/engine/allocation', 'court', 'KillSwitch'];
    let violationCount = 0;

    const files = fs.readdirSync(researchDir);
    for (const file of files) {
      const filePath = path.join(researchDir, file);
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const forbidden of forbiddenImports) {
          if (content.includes(forbidden)) {
            // Check if it's an import/require
            if (content.match(new RegExp(`import\\s+.*from\\s+['\"].*${forbidden}['\"]`)) ||
                content.match(new RegExp(`require\\s*\\(\\s*['\"].*${forbidden}['\"]\\s*\\)`))) {
              console.error(`      [VIOLATION] Research file ${file} imports execution/allocation module: ${forbidden}`);
              violationCount++;
            }
          }
        }
      }
    }

    assert.strictEqual(violationCount, 0, 'Research Layer must be isolated from execution/allocation states');
  });

  // 8. Scenario TR = 0.99 Veto Audit
  test('T8: STL Scenario TR = 0.99 Veto Audit', () => {
    const stl = new SystemThermodynamicsLayer({ threshold: 1.0 });
    
    // Expected Gain = 99, Migration Cost = 100 -> TR = 0.99 <= 1.0 (Vetoed)
    const result = stl.evaluateMigration(99, 100);
    assert.strictEqual(result.allowed, false, 'Should veto when TR = 0.99 (threshold 1.0)');
    assert.strictEqual(result.ratio, 0.99, 'TR should be exactly 0.99');
    assert.strictEqual(result.reason, 'VETO_THERMODYNAMIC_DEFICIT', 'Must cite veto reason');
  });

  console.log('='.repeat(72));
  if (passed === total) {
    console.log(`  🎉 ALL CERTIFICATION TESTS PASSED: ${passed}/${total}`);
    process.exit(0);
  } else {
    console.error(`  🔴 FAILURE: ${total - passed} certification tests failed.`);
    process.exit(1);
  }
}

runCertificationSuite();
