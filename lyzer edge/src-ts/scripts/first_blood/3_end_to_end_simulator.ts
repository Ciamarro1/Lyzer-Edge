import fs from 'fs';
import path from 'path';

// Import the stubs representing the architectural layers
import { FeatureGeneration } from '../../discovery/feature_generation';
import { AnomalyDetection, StatisticalAnomaly } from '../../discovery/anomaly_detection';
import { HypothesisForge, HypothesisCandidate } from '../../discovery/hypothesis_forge';
import { EmbargoEngine } from '../../validation/embargo_engine';
import { PurgedWalkForward } from '../../validation/purged_walkforward';
import { RobustnessTests } from '../../validation/robustness_tests';
import { ValidationVerdict, FinalVerdict } from '../../validation/validation_verdict';

/**
 * Stage C, D, E: The End-to-End Simulator (First Blood)
 * 
 * Orchestrates the full empirical flow:
 * Reality -> Observation -> Discovery -> Validation -> Epistemology (Death Registry)
 */

const DATA_DIR = path.join(__dirname, '../../../data/empirical');
const INPUT_FILE = path.join(DATA_DIR, 'btcusdt_1h_5y.json');
const DEATH_REGISTRY_FILE = path.join(DATA_DIR, 'death_registry.json');
const AUTOPSY_FILE = path.join(DATA_DIR, 'first_blood_autopsy.md');

async function runSimulation() {
  console.log(`[SIMULATOR] Starting End-to-End Execution (First Blood)`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`[ERROR] Dataset not found at ${INPUT_FILE}. Run Stage A first.`);
    return;
  }

  const bars: any[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`[SIMULATOR] Ingested ${bars.length} Reality Bars`);

  // Initialize Architecture
  const featureGen = new FeatureGeneration();
  const anomalyDet = new AnomalyDetection();
  const forge = new HypothesisForge();
  
  const embargoEngine = new EmbargoEngine();
  const walkForward = new PurgedWalkForward(embargoEngine);
  const robustness = new RobustnessTests();
  const verdict = new ValidationVerdict();

  const generatedHypotheses: HypothesisCandidate[] = [];
  const verdicts: FinalVerdict[] = [];
  const deathRegistry: any[] = [];

  // Stage C & D: Observation & Discovery Run
  // We simulate a rolling window across history
  console.log(`[SIMULATOR] Running Observation & Discovery over timeline...`);
  
  let activeAnomalies: StatisticalAnomaly[] = [];
  
  for (let i = 10; i < bars.length; i++) {
    // Window of bars available up to point i
    const window = bars.slice(i - 10, i + 1);
    const currentBar = bars[i];
    
    // 1. Feature Gen
    const features = featureGen.generatePrimitives(window);
    if (!features) continue;

    // 2. Anomaly Det
    const newAnomalies = anomalyDet.detectAnomalies(features);
    activeAnomalies.push(...newAnomalies);

    // Filter expired anomalies (Necromancy Check)
    activeAnomalies = activeAnomalies.filter(a => currentBar.timestampMs <= a.expiresAtMs);

    // 3. Hypothesis Forge
    for (const anomaly of activeAnomalies) {
      // Stub Context
      const ctx = { volatilityRegime: 'NORMAL' as any, trendRegime: 'CHOP' as any, timestampMs: currentBar.timestampMs };
      
      const hyp = forge.forgeHypothesis(anomaly, ctx, currentBar.timestampMs);
      if (hyp) {
        generatedHypotheses.push(hyp);
        // Remove anomaly so we don't spam duplicate hypotheses for the exact same anomaly trigger
        activeAnomalies = activeAnomalies.filter(a => a.anomalyId !== anomaly.anomalyId);
      }
    }
  }

  console.log(`[SIMULATOR] Discovery complete. Forged ${generatedHypotheses.length} hypotheses.`);

  // Stage E: Validation Kill Floor
  console.log(`[SIMULATOR] Engaging Validation Kill Floor...`);
  
  let survived = 0;
  let killedByPWF = 0;
  let killedByRobustness = 0;

  for (const hyp of generatedHypotheses) {
    const wfResult = walkForward.execute(hyp, bars);
    const robResult = robustness.executeAttacks(hyp);
    
    const finalVerdict = verdict.issueVerdict(hyp, wfResult, robResult);
    verdicts.push(finalVerdict);

    if (finalVerdict.verdict === 'VALIDATED') {
      survived++;
    } else {
      // Add to Death Registry
      deathRegistry.push({
        id: hyp.hypothesisId,
        originAnomalyId: hyp.originAnomalyId,
        condition: hyp.condition,
        asset: hyp.symbol,
        horizon: hyp.horizonMinutes,
        killed_by: wfResult.passedPValue ? 'robustness_tests' : 'purged_walkforward',
        reason: finalVerdict.reasoning,
        metrics: {
          sharpe: wfResult.sharpeRatio,
          maxDrawdown: wfResult.maxDrawdown
        },
        timestampMs: hyp.forgedAtMs
      });

      if (!wfResult.passedPValue) killedByPWF++;
      else killedByRobustness++;
    }
  }

  // Write Death Registry
  fs.writeFileSync(DEATH_REGISTRY_FILE, JSON.stringify(deathRegistry, null, 2));
  console.log(`[SIMULATOR] Saved Death Registry to ${DEATH_REGISTRY_FILE}`);

  // Write Autopsy Report
  const autopsyContent = `# 🩸 First Blood Autopsy Report\n\n` +
    `## Execution Summary\n` +
    `- **Historical Bars Processed:** ${bars.length}\n` +
    `- **Total Hypotheses Forged:** ${generatedHypotheses.length}\n\n` +
    `## Validation Kill Floor Results\n` +
    `- **Survivors (VALIDATED):** ${survived}\n` +
    `- **Killed by Temporal Leakage (Purged Walk-Forward):** ${killedByPWF}\n` +
    `- **Killed by Fragility (Robustness Tests):** ${killedByRobustness}\n\n` +
    `## Scientific Verdict\n` +
    `The Empirical Architecture executed successfully. ` +
    `Dead hypotheses exported to \`death_registry.json\` for future Epistemic study.`;

  fs.writeFileSync(AUTOPSY_FILE, autopsyContent);
  console.log(`[SIMULATOR] Saved Autopsy Report to ${AUTOPSY_FILE}`);
}

runSimulation().catch(console.error);
