import { Worker } from 'worker_threads';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runWorker(config) {
  return new Promise((res, rej) => {
    const worker = new Worker(resolve(__dirname, 'workers/batch013Worker.js'), {
      workerData: config
    });
    worker.on('message', msg => {
      if (msg.status === 'SUCCESS') res(msg.result);
      else rej(new Error(msg.error));
    });
    worker.on('error', rej);
    worker.on('exit', code => {
      if (code !== 0) rej(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

function generateSuites() {
  const configs = [];
  const baseConfig = {
    lookback: 60,
    feePct: 0.0008, 
    slippagePct: 0
  };

  // H009-A: Signal vs Negative Controls
  configs.push({ ...baseConfig, suite: 'CONTROL', mode: 'SPRING', volumeZScore: 2.5, minPierceATR: 1.0, horizon: 24 });
  configs.push({ ...baseConfig, suite: 'CONTROL', mode: 'CONTROL_CONT', horizon: 24 });
  // 5 Runs of Null Placebo to get average
  for (let i = 0; i < 5; i++) {
    configs.push({ ...baseConfig, suite: 'CONTROL', mode: 'CONTROL_NULL', horizon: 24 });
  }

  // H009-B: Dose Response (Volume Z-Score)
  const zScores = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
  for (const z of zScores) {
    configs.push({ ...baseConfig, suite: 'DOSE_RESPONSE', mode: 'SPRING', volumeZScore: z, minPierceATR: 1.0, horizon: 24 });
  }

  // H009-F: Horizon Sweep
  const horizons = [12, 24, 36, 48, 72];
  for (const h of horizons) {
    configs.push({ ...baseConfig, suite: 'HORIZON', mode: 'SPRING', volumeZScore: 2.5, minPierceATR: 1.0, horizon: h });
  }

  // H009-E: Friction Tolerance
  const slippages = [0, 0.0005, 0.0015, 0.0030]; // 0, 5, 15, 30 bps
  for (const s of slippages) {
    configs.push({ ...baseConfig, suite: 'FRICTION', mode: 'SPRING', volumeZScore: 2.5, minPierceATR: 1.0, horizon: 24, slippagePct: s });
  }

  return configs;
}

export async function runBatch013() {
  const t0 = performance.now();
  console.log('\n==============================================================================================================');
  console.log('🏛️ LYZER EDGE — BATCH 013: WYCKOFF SPRING DISCOVERY');
  console.log('==============================================================================================================');

  const configs = generateSuites();
  console.log(`\n▸ Launching ${configs.length} isolated workers for H009 Discovery...`);
  
  const CHUNK_SIZE = 10;
  const results = [];
  for (let i = 0; i < configs.length; i += CHUNK_SIZE) {
    const chunk = configs.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(cfg => runWorker(cfg));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    process.stdout.write(`\r   Progress: ${Math.min(i + CHUNK_SIZE, configs.length)} / ${configs.length}`);
  }
  
  console.log('\n✅ All Discovery suites completed successfully.');
  
  const elapsedSec = ((performance.now() - t0) / 1000).toFixed(1);
  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');

  // WRITE REPORTS
  let mdContent = `# 🏛️ LYZER EDGE — BATCH 013: DISCOVERY REPORT
**Execution Date:** ${new Date().toISOString()}  
**Elapsed Time:** ${elapsedSec}s  
**Hypothesis:** H009 (Wyckoff Spring / Volume Rejection)  
**Status:** EXPLORATORY  

## H009-A & D: SIGNAL VS NEGATIVE CONTROLS
Does the specific structure (Pierce + High Volume Rejection) contain more information than Continuation or Random Placebo?

| Mode | N Events | Mean Net | Win Rate | PF | WFA |
|---|---|---|---|---|---|
`;
  const controlResults = results.filter(r => r.config.suite === 'CONTROL');
  // Combine the 5 Null runs
  const nullRuns = controlResults.filter(r => r.config.mode === 'CONTROL_NULL');
  const avgNullNet = nullRuns.reduce((s, r) => s + r.meanNet, 0) / nullRuns.length;
  const avgNullWR = nullRuns.reduce((s, r) => s + r.winRate, 0) / nullRuns.length;
  const avgNullPF = nullRuns.reduce((s, r) => s + r.pf, 0) / nullRuns.length;
  const avgNullWFA = Math.round(nullRuns.reduce((s, r) => s + r.wfaScore, 0) / nullRuns.length);
  const avgNullN = Math.round(nullRuns.reduce((s, r) => s + r.nEvents, 0) / nullRuns.length);

  for (const r of controlResults.filter(r => r.config.mode !== 'CONTROL_NULL')) {
    mdContent += `| ${r.config.mode} | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 |\n`;
  }
  mdContent += `| PLACEBO (Avg of 5) | ${avgNullN} | ${(avgNullNet * 100).toFixed(2)}% | ${avgNullWR.toFixed(1)}% | ${avgNullPF.toFixed(2)} | ${avgNullWFA}/10 |\n`;

  mdContent += `\n## H009-B: DOSE-RESPONSE (Volume Z-Score)\nDoes higher volume rejection predict higher future return? (OLS Regression against Net Return)\n\n`;
  mdContent += `| Z-Score >= | N Events | Mean Net | Win Rate | PF | OLS Slope | R² |\n|---|---|---|---|---|---|---|\n`;
  const doseResults = results.filter(r => r.config.suite === 'DOSE_RESPONSE').sort((a,b) => a.config.volumeZScore - b.config.volumeZScore);
  for (const r of doseResults) {
    mdContent += `| ${r.config.volumeZScore.toFixed(1)} | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.ols.slope.toFixed(6)} | ${r.ols.r2.toFixed(4)} |\n`;
  }

  mdContent += `\n## H009-F: HORIZON SWEEP\nAt what horizon does the Reversion edge decay?\n\n`;
  mdContent += `| Horizon | N Events | Mean Net | Win Rate | PF | WFA |\n|---|---|---|---|---|---|\n`;
  const horizonResults = results.filter(r => r.config.suite === 'HORIZON').sort((a,b) => a.config.horizon - b.config.horizon);
  for (const r of horizonResults) {
    mdContent += `| ${r.config.horizon}h | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 |\n`;
  }

  mdContent += `\n## H009-E: FRICTION TOLERANCE\n\n`;
  mdContent += `| Slippage (bps) | N Events | Mean Net | Win Rate | PF | WFA |\n|---|---|---|---|---|---|\n`;
  const frictionResults = results.filter(r => r.config.suite === 'FRICTION').sort((a,b) => a.config.slippagePct - b.config.slippagePct);
  for (const r of frictionResults) {
    mdContent += `| ${r.config.slippagePct * 10000} | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 |\n`;
  }

  writeFileSync(resolve(resultsDir, 'BATCH_013_DISCOVERY_REPORT.md'), mdContent);

  const manifest = {
    batch: '013',
    hypothesis: 'H009',
    executionTimestamp: new Date().toISOString(),
    hypothesisCount: configs.length,
    results
  };
  writeFileSync(resolve(resultsDir, 'BATCH_013_MANIFEST.json'), JSON.stringify(manifest, null, 2));
}

runBatch013().catch(console.error);
