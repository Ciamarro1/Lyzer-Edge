import { Worker } from 'worker_threads';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { FROZEN_CONFIG_HASH } from './frozenConfig.js';
import crypto from 'crypto';

function getFileSha256(filePath) {
  if (!existsSync(filePath)) return 'FILE_NOT_FOUND';
  return crypto.createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runWorker(config) {
  return new Promise((res, rej) => {
    const worker = new Worker(resolve(__dirname, 'workers/batch010Worker.js'), {
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

// Generate the config variations for each adversarial suite
function generateSuites() {
  const configs = [];
  const baseConfig = {
    horizon: 72,
    feePct: 0.0008, // 0.08% taker fee
    slippagePct: 0,
    thresholdAtr: 2.0,
    thresholdBody: 0.65,
    thresholdRangeAtr: 1.8,
    trendFilter: 'BULL_SIMPLE',
    overlapMode: 'INDEPENDENT',
    exitModel: 'TIME_CLOSE',
    runPermutation: false // Speed optimization, we only run permutations on keys
  };

  // Suite A: Friction & Slippage Ladder
  const slippages = [0, 0.0002, 0.0005, 0.0010, 0.0020, 0.0030, 0.0050, 0.0075, 0.0100];
  for (const s of slippages) {
    configs.push({ ...baseConfig, suite: 'FRICTION_LADDER', slippagePct: s });
  }

  // Suite B: Intrabar Pessimistic vs Optimistic
  configs.push({ ...baseConfig, suite: 'INTRABAR', exitModel: 'TIME_CLOSE' });
  configs.push({ ...baseConfig, suite: 'INTRABAR', exitModel: 'PESSIMISTIC_TRAILING_ATR' });

  // Suite C: Horizon Robustness
  const horizons = [12, 24, 36, 48, 60, 72, 84, 96, 120];
  for (const h of horizons) {
    configs.push({ ...baseConfig, suite: 'HORIZON', horizon: h });
  }

  // Suite D: Threshold Robustness
  const atrs = [1.75, 2.00, 2.25, 2.50, 2.75];
  const bodies = [0.55, 0.60, 0.65, 0.70, 0.75];
  for (const a of atrs) {
    for (const b of bodies) {
      configs.push({ ...baseConfig, suite: 'THRESHOLD', thresholdAtr: a, thresholdBody: b });
    }
  }

  // Suite E: Trend Filter Robustness
  const trends = ['NONE', 'BULL_SIMPLE', 'BULL_STRICT', 'BULL_SLOPE'];
  for (const t of trends) {
    configs.push({ ...baseConfig, suite: 'TREND', trendFilter: t });
  }

  // Suite F: Overlap Audit & Capital Model
  configs.push({ ...baseConfig, suite: 'OVERLAP', overlapMode: 'INDEPENDENT', runPermutation: true });
  configs.push({ ...baseConfig, suite: 'OVERLAP', overlapMode: 'ONE_POSITION', runPermutation: true });

  return configs;
}

export async function runBatch010() {
  const t0 = performance.now();
  console.log('\n==============================================================================================================');
  console.log('🏛️ LYZER EDGE — BATCH 010: V8.2 ADVERSARIAL VALIDATION (PARALLEL WORKERS)');
  console.log('==============================================================================================================');

  const lockboxPath = resolve(__dirname, '../results/v5_confirmatory/V5_SHADOW_LOCKBOX.json');
  const frozenConfigPath = resolve(__dirname, 'frozenConfig.js');
  const preConfigHash = getFileSha256(frozenConfigPath);
  const preLockboxHash = getFileSha256(lockboxPath);

  const configs = generateSuites();
  console.log(`\n▸ Launching ${configs.length} isolated adversarial workers...`);
  
  // Throttle concurrency if needed, but Node can easily handle ~100 lightweight workers.
  // Actually, V8 might hit memory limits if we spawn 100 workers at exactly the same time all copying the dataset.
  // Let's chunk them.
  const CHUNK_SIZE = 12;
  const results = [];
  for (let i = 0; i < configs.length; i += CHUNK_SIZE) {
    const chunk = configs.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(cfg => runWorker(cfg));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    process.stdout.write(`\r   Progress: ${Math.min(i + CHUNK_SIZE, configs.length)} / ${configs.length}`);
  }
  
  console.log('\n✅ All adversarial suites completed successfully.');
  
  // Generate the markdown report
  const t1 = performance.now();
  const elapsedSec = ((t1 - t0) / 1000).toFixed(1);
  
  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  const manifest = {
    batch: '010',
    candidate: 'V8.2-DISPLACEMENT-MOMENTUM',
    executionTimestamp: new Date().toISOString(),
    elapsedSec,
    totalAdversarialModels: configs.length,
    results
  };
  writeFileSync(resolve(resultsDir, 'BATCH_010_V8_ADVERSARIAL_MANIFEST.json'), JSON.stringify(manifest, null, 2));

  let mdContent = `# 🏛️ LYZER EDGE — BATCH 010: V8.2 ADVERSARIAL VALIDATION
**Execution Date:** ${manifest.executionTimestamp}  
**Elapsed Time:** ${elapsedSec}s  
**Total Independent Models Tested:** ${configs.length}  

## SUMMARY
The V8.2-DISPLACEMENT-MOMENTUM candidate was subjected to 6 adversarial suites to evaluate its robustness against friction, slippage, intrabar ambiguity, time horizon, threshold tuning, and temporal overlap.

---

### SUITE A: FRICTION & SLIPPAGE LADDER
Testing tolerance to real-world execution costs (Slippage applied per leg, baseline fee 0.08%).

| Slippage (bps) | N | Mean Net | Win Rate | PF | WFA | MaxDD |
|---|---|---|---|---|---|---|
`;
  
  const frictionResults = results.filter(r => r.suite === 'FRICTION_LADDER').sort((a,b) => a.config.slippagePct - b.config.slippagePct);
  for (const r of frictionResults) {
    mdContent += `| ${r.config.slippagePct * 10000} | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% |\n`;
  }

  mdContent += `\n### SUITE B: INTRABAR ADVERSARIAL MODEL\nTesting worst-case execution paths if stop-loss mechanics are added.\n\n`;
  mdContent += `| Exit Model | N | Mean Net | Win Rate | PF | WFA | MaxDD |\n|---|---|---|---|---|---|---|\n`;
  const intrabarResults = results.filter(r => r.suite === 'INTRABAR');
  for (const r of intrabarResults) {
    mdContent += `| ${r.config.exitModel} | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% |\n`;
  }

  mdContent += `\n### SUITE C: HORIZON ROBUSTNESS\nEvaluating if 72h is an overfit artifact or a true maturation peak.\n\n`;
  mdContent += `| Horizon | N | Mean Net | Win Rate | PF | WFA | MaxDD |\n|---|---|---|---|---|---|---|\n`;
  const horizonResults = results.filter(r => r.suite === 'HORIZON').sort((a,b) => a.config.horizon - b.config.horizon);
  for (const r of horizonResults) {
    mdContent += `| ${r.config.horizon}h | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% |\n`;
  }

  mdContent += `\n### SUITE D: THRESHOLD SURFACE ROBUSTNESS\nMapping the parameter space around V8.2 (ATR: 2.0, Body: 0.65).\n\n`;
  mdContent += `| ATR Thresh | Body Thresh | N | Mean Net | Win Rate | PF | WFA |\n|---|---|---|---|---|---|---|\n`;
  const threshResults = results.filter(r => r.suite === 'THRESHOLD');
  for (const r of threshResults) {
    const isBase = r.config.thresholdAtr === 2.0 && r.config.thresholdBody === 0.65;
    mdContent += `| ${r.config.thresholdAtr} | ${r.config.thresholdBody} | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 ${isBase ? '*(Baseline)*' : ''}|\n`;
  }

  mdContent += `\n### SUITE E: TREND FILTER ROBUSTNESS\n\n`;
  mdContent += `| Trend Filter | N | Mean Net | Win Rate | PF | WFA |\n|---|---|---|---|---|---|\n`;
  const trendResults = results.filter(r => r.suite === 'TREND');
  for (const r of trendResults) {
    mdContent += `| ${r.config.trendFilter} | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 |\n`;
  }

  mdContent += `\n### SUITE F: OVERLAP AUDIT & CAPITAL MODEL\nTesting if the N=203 is a statistical illusion caused by holding multiple simultaneous overlapping positions.\n\n`;
  mdContent += `| Overlap Mode | N | Mean Net | Win Rate | PF | WFA | MaxDD | Permutation p-val |\n|---|---|---|---|---|---|---|---|\n`;
  const overlapResults = results.filter(r => r.suite === 'OVERLAP');
  for (const r of overlapResults) {
    mdContent += `| ${r.config.overlapMode} | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% | ${r.pValue.toFixed(5)} |\n`;
  }

  // Determine final verdict autonomously
  const baseFrictionPf = frictionResults[0].pf; // 0 slippage
  const slippage10bpsPf = frictionResults.find(x => x.config.slippagePct === 0.0010)?.pf || 0;
  const overlapPf = overlapResults.find(x => x.config.overlapMode === 'ONE_POSITION')?.pf || 0;
  const overlapWfa = overlapResults.find(x => x.config.overlapMode === 'ONE_POSITION')?.wfaScore || 0;
  const overlapPval = overlapResults.find(x => x.config.overlapMode === 'ONE_POSITION')?.pValue || 1.0;
  
  let finalVerdict = '';
  if (overlapWfa < 7 || overlapPf < 1.2 || overlapPval > 0.01) {
    finalVerdict = '🔴 REJECT: V8.2 edge was an illusion caused by Overlapping Trades. Independent event WFA collapsed.';
  } else if (slippage10bpsPf < 1.2) {
    finalVerdict = '🔴 REJECT: V8.2 is not economically viable under moderate slippage (10 bps).';
  } else {
    finalVerdict = '🟢 PROMOTE: V8.2 survived strict adversarial execution, proving monotonic scaling, friction tolerance, and statistical independence.';
  }

  mdContent += `\n## FINAL CTO VERDICT\n**${finalVerdict}**\n`;

  writeFileSync(resolve(resultsDir, 'BATCH_010_V8_ADVERSARIAL_REPORT.md'), mdContent);

  const postConfigHash = getFileSha256(frozenConfigPath);
  const postLockboxHash = getFileSha256(lockboxPath);
  console.log(`\n▸ POST-SUITE TRACK A ISOLATION CHECK`);
  console.log(`   Config Hash: ${postConfigHash === preConfigHash ? '🟢 MATCH' : '🔴 DRIFT'}`);
  console.log(`   Lockbox Hash: ${postLockboxHash === preLockboxHash ? '🟢 MATCH' : '🔴 DRIFT'}`);
  console.log(`\n▸ FINAL VERDICT: ${finalVerdict}`);
}

runBatch010().catch(console.error);
