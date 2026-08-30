import { Worker } from 'worker_threads';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import crypto from 'crypto';

function getFileSha256(filePath) {
  if (!existsSync(filePath)) return 'FILE_NOT_FOUND';
  return crypto.createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runWorker(config) {
  return new Promise((res, rej) => {
    const worker = new Worker(resolve(__dirname, 'workers/batch011Worker.js'), {
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
    runPermutation: false
  };

  // 1. Cluster Gap Analysis (H1)
  const gaps = [1, 2, 4, 8, 12, 24, 48];
  for (const g of gaps) {
    configs.push({ ...baseConfig, suite: 'GAP_ANALYSIS', clusterGap: g, horizon: 72, execMode: 'ONE_POSITION', runPermutation: true });
  }

  // 2. Horizon Analysis for Clusters
  const horizons = [12, 24, 36, 48, 60, 72, 84, 96, 120];
  for (const h of horizons) {
    configs.push({ ...baseConfig, suite: 'HORIZON', clusterGap: 24, horizon: h, execMode: 'ONE_POSITION' });
  }

  // 3. Pyramiding Execution Models (H3)
  const modes = ['ONE_POSITION', 'INDEPENDENT', 'PYRAMID_1_05_025', 'PYRAMID_1_05_05_05', 'PYRAMID_1_075_05'];
  for (const m of modes) {
    configs.push({ ...baseConfig, suite: 'PYRAMIDING', clusterGap: 24, horizon: 72, execMode: m, runPermutation: true });
  }

  // 4. Adversarial Friction for Pyramiding (Testing PYRAMID_1_075_05)
  const slippages = [0, 0.0005, 0.0010, 0.0020, 0.0030, 0.0050];
  for (const s of slippages) {
    configs.push({ ...baseConfig, suite: 'FRICTION', clusterGap: 24, horizon: 72, execMode: 'PYRAMID_1_075_05', slippagePct: s });
  }

  return configs;
}

export async function runBatch011() {
  const t0 = performance.now();
  console.log('\n==============================================================================================================');
  console.log('🏛️ LYZER EDGE — BATCH 011: REGIME DYNAMICS & STRUCTURAL PYRAMIDING');
  console.log('==============================================================================================================');

  const lockboxPath = resolve(__dirname, '../results/v5_confirmatory/V5_SHADOW_LOCKBOX.json');
  const frozenConfigPath = resolve(__dirname, 'frozenConfig.js');
  const preConfigHash = getFileSha256(frozenConfigPath);
  const preLockboxHash = getFileSha256(lockboxPath);

  const configs = generateSuites();
  console.log(`\n▸ Launching ${configs.length} isolated workers for Cluster & Pyramiding Analysis...`);
  
  const CHUNK_SIZE = 10;
  const results = [];
  for (let i = 0; i < configs.length; i += CHUNK_SIZE) {
    const chunk = configs.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(cfg => runWorker(cfg));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    process.stdout.write(`\r   Progress: ${Math.min(i + CHUNK_SIZE, configs.length)} / ${configs.length}`);
  }
  
  console.log('\n✅ All suites completed successfully.');
  
  const t1 = performance.now();
  const elapsedSec = ((t1 - t0) / 1000).toFixed(1);
  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');

  // WRITE REPORTS
  let mdContent = `# 🏛️ LYZER EDGE — BATCH 011: FINAL EXECUTIVE REPORT
**Execution Date:** ${new Date().toISOString()}  
**Elapsed Time:** ${elapsedSec}s  

## H1: REGIME IGNITION (Cluster Gap Analysis)
Does defining a "Cluster" logically group dependent trades and restore permutation significance?

| Gap (hours) | N Clusters | Mean Net | Win Rate | PF | WFA | MaxDD | Permutation p-val |
|---|---|---|---|---|---|---|---|
`;
  const gapResults = results.filter(r => r.config.suite === 'GAP_ANALYSIS').sort((a,b) => a.config.clusterGap - b.config.clusterGap);
  for (const r of gapResults) {
    mdContent += `| ${r.config.clusterGap} | ${r.nClusters} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% | ${r.pValue.toFixed(5)} |\n`;
  }

  mdContent += `\n## H2: HORIZON SATURATION FOR CLUSTERS\n\n`;
  mdContent += `| Horizon | N Clusters | Mean Net | Win Rate | PF | WFA | MaxDD |\n|---|---|---|---|---|---|---|\n`;
  const horizonResults = results.filter(r => r.config.suite === 'HORIZON').sort((a,b) => a.config.horizon - b.config.horizon);
  for (const r of horizonResults) {
    mdContent += `| ${r.config.horizon}h | ${r.nClusters} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% |\n`;
  }

  mdContent += `\n## H3: STRUCTURAL PYRAMIDING vs BASELINES\nTesting if Pyramiding provides better Return per base unit without destroying WFA.\n\n`;
  mdContent += `| Execution Mode | N Clusters | Total Equity | Win Rate | PF | WFA | MaxDD | p-val |\n|---|---|---|---|---|---|---|---|\n`;
  const pyramidResults = results.filter(r => r.config.suite === 'PYRAMIDING');
  for (const r of pyramidResults) {
    mdContent += `| ${r.config.execMode} | ${r.nClusters} | ${(r.portfolioEquity * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${(r.maxDD * 100).toFixed(2)}% | ${r.pValue.toFixed(5)} |\n`;
  }
  
  mdContent += `\n## ADVERSARIAL VALIDATION (Pyramiding Friction)\n\n`;
  mdContent += `| Slippage (bps) | N Clusters | Mean Net | Win Rate | PF | WFA |\n|---|---|---|---|---|---|\n`;
  const frictionResults = results.filter(r => r.config.suite === 'FRICTION').sort((a,b) => a.config.slippagePct - b.config.slippagePct);
  for (const r of frictionResults) {
    mdContent += `| ${r.config.slippagePct * 10000} | ${r.nClusters} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 |\n`;
  }

  writeFileSync(resolve(resultsDir, 'BATCH_011_FINAL_EXECUTIVE_REPORT.md'), mdContent);

  const manifest = {
    batch: '011',
    datasetHash: '...',
    executionTimestamp: new Date().toISOString(),
    hypothesisCount: configs.length,
    fwerAlpha: 0.000185,
    results
  };
  writeFileSync(resolve(resultsDir, 'BATCH_011_MANIFEST.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n▸ POST-SUITE TRACK A ISOLATION CHECK`);
  console.log(`   Config Hash: ${getFileSha256(frozenConfigPath) === preConfigHash ? '🟢 MATCH' : '🔴 DRIFT'}`);
  console.log(`   Lockbox Hash: ${getFileSha256(lockboxPath) === preLockboxHash ? '🟢 MATCH' : '🔴 DRIFT'}`);
}

runBatch011().catch(console.error);
