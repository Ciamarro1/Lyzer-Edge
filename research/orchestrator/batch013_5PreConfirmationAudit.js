import { Worker } from 'worker_threads';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runWorker(config) {
  return new Promise((res, rej) => {
    const worker = new Worker(resolve(__dirname, 'workers/batch013_5Worker.js'), {
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
    feePct: 0.0008, 
    slippagePct: 0,
    runPermutation: false,
    onePosition: false
  };

  // 1. Local Stability
  const zScores = [2.25, 2.50, 2.75];
  const horizons = [18, 24, 30];
  for (const z of zScores) {
    for (const h of horizons) {
      configs.push({ ...baseConfig, suite: 'LOCAL_STABILITY', mode: 'REAL_SPRING', volumeZScore: z, horizon: h, minPierceATR: 1.0 });
    }
  }

  // 2. Causal Controls (Incremental Information)
  const modes = ['REAL_SPRING', 'PRICE_ONLY', 'VOL_ONLY', 'CONTINUATION'];
  for (const m of modes) {
    configs.push({ ...baseConfig, suite: 'CAUSAL_CONTROL', mode: m, volumeZScore: 2.5, horizon: 24, minPierceATR: 1.0 });
  }

  // 3. Placebo Permutation
  configs.push({ ...baseConfig, suite: 'PERMUTATION', mode: 'REAL_SPRING', volumeZScore: 2.5, horizon: 24, minPierceATR: 1.0, runPermutation: true });

  // 4. WFA Consistency
  configs.push({ ...baseConfig, suite: 'WFA', mode: 'REAL_SPRING', volumeZScore: 2.5, horizon: 24, minPierceATR: 1.0 });

  // 5. Capital Constraint
  configs.push({ ...baseConfig, suite: 'CAPITAL', mode: 'REAL_SPRING', volumeZScore: 2.5, horizon: 24, minPierceATR: 1.0, onePosition: true });

  // 6. Friction Ladder
  const slippages = [0, 0.0005, 0.0010, 0.0015, 0.0020, 0.0030, 0.0050];
  for (const s of slippages) {
    configs.push({ ...baseConfig, suite: 'FRICTION', mode: 'REAL_SPRING', volumeZScore: 2.5, horizon: 24, minPierceATR: 1.0, slippagePct: s });
  }

  return configs;
}

export async function runBatch013_5() {
  const t0 = performance.now();
  console.log('\n==============================================================================================================');
  console.log('🏛️ LYZER EDGE — BATCH 013.5: PRE-CONFIRMATION AUDIT (THE KILL GATES)');
  console.log('==============================================================================================================');

  const configs = generateSuites();
  console.log(`\n▸ Launching ${configs.length} isolated workers for H009 Audit...`);
  
  const CHUNK_SIZE = 10;
  const results = [];
  for (let i = 0; i < configs.length; i += CHUNK_SIZE) {
    const chunk = configs.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(cfg => runWorker(cfg));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    process.stdout.write(`\r   Progress: ${Math.min(i + CHUNK_SIZE, configs.length)} / ${configs.length}`);
  }
  
  console.log('\n✅ All Audit suites completed successfully.');
  
  const elapsedSec = ((performance.now() - t0) / 1000).toFixed(1);
  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');

  // WRITE REPORTS
  let mdContent = `# 🏛️ LYZER EDGE — BATCH 013.5: AUDIT REPORT
**Execution Date:** ${new Date().toISOString()}  
**Elapsed Time:** ${elapsedSec}s  

## GATE 1: LOCAL STABILITY
| Z-Score | Horizon | N | Mean Net | PF | Win Rate |
|---|---|---|---|---|---|
`;
  const stabResults = results.filter(r => r.config.suite === 'LOCAL_STABILITY');
  for (const r of stabResults) {
    mdContent += `| ${r.config.volumeZScore.toFixed(2)} | ${r.config.horizon}h | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.pf.toFixed(2)} | ${r.winRate.toFixed(1)}% |\n`;
  }

  mdContent += `\n## GATE 2: CAUSAL COMPONENT ISOLATION\n\n`;
  mdContent += `| Mode | N | Mean Net | PF | Win Rate |\n|---|---|---|---|---|\n`;
  const causalResults = results.filter(r => r.config.suite === 'CAUSAL_CONTROL');
  for (const r of causalResults) {
    mdContent += `| ${r.config.mode} | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.pf.toFixed(2)} | ${r.winRate.toFixed(1)}% |\n`;
  }

  mdContent += `\n## GATE 3: 10k PLACEBO PERMUTATION\n\n`;
  const permResult = results.find(r => r.config.suite === 'PERMUTATION');
  if (permResult && permResult.permutation) {
    const p = permResult.permutation;
    mdContent += `- **Empirical P-Value:** ${p.pValue.toFixed(5)}\n`;
    mdContent += `- **Null p50 (Median):** ${(p.p50 * 100).toFixed(2)}%\n`;
    mdContent += `- **Null p95:** ${(p.p95 * 100).toFixed(2)}%\n`;
    mdContent += `- **Null p99:** ${(p.p99 * 100).toFixed(2)}%\n`;
    mdContent += `- **Null Max:** ${(p.max * 100).toFixed(2)}%\n`;
    mdContent += `- **Observed Mean Net:** ${(permResult.meanNet * 100).toFixed(2)}%\n`;
  }

  mdContent += `\n## GATE 4: WFA CONSISTENCY\n\n`;
  mdContent += `| Window | N | Mean Net | PF | Win Rate |\n|---|---|---|---|---|\n`;
  const wfaResult = results.find(r => r.config.suite === 'WFA');
  if (wfaResult && wfaResult.wfaData) {
    wfaResult.wfaData.forEach((w, i) => {
      mdContent += `| ${i+1} | ${w.n} | ${(w.net * 100).toFixed(2)}% | ${w.pf.toFixed(2)} | ${w.wr.toFixed(1)}% |\n`;
    });
  }

  mdContent += `\n## GATE 5: CAPITAL CONSTRAINT\n\n`;
  const capResult = results.find(r => r.config.suite === 'CAPITAL');
  if (capResult) {
    mdContent += `- **Mode:** ONE_POSITION\n`;
    mdContent += `- **N Executed:** ${capResult.nEvents}\n`;
    mdContent += `- **Overlap Discard Rate:** ${capResult.overlapDiscardRate.toFixed(1)}%\n`;
    mdContent += `- **Mean Net:** ${(capResult.meanNet * 100).toFixed(2)}%\n`;
    mdContent += `- **PF:** ${capResult.pf.toFixed(2)}\n`;
  }

  mdContent += `\n## GATE 6: FRICTION LADDER\n\n`;
  mdContent += `| Slippage (bps) | N | Mean Net | PF | Win Rate |\n|---|---|---|---|---|\n`;
  const frictionResults = results.filter(r => r.config.suite === 'FRICTION').sort((a,b) => a.config.slippagePct - b.config.slippagePct);
  for (const r of frictionResults) {
    mdContent += `| ${r.config.slippagePct * 10000} | ${r.nEvents} | ${(r.meanNet * 100).toFixed(2)}% | ${r.pf.toFixed(2)} | ${r.winRate.toFixed(1)}% |\n`;
  }

  writeFileSync(resolve(resultsDir, 'BATCH_013_5_AUDIT_REPORT.md'), mdContent);
  writeFileSync(resolve(resultsDir, 'BATCH_013_5_MANIFEST.json'), JSON.stringify({ batch: '013.5', results }, null, 2));
}

runBatch013_5().catch(console.error);
