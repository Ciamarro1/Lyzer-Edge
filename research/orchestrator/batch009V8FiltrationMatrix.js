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
    const worker = new Worker(resolve(__dirname, 'workers/batch009Worker.js'), {
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

export async function runBatch009V8FiltrationMatrix() {
  const t0 = performance.now();
  console.log('\n==============================================================================================================');
  console.log('🏛️ LYZER EDGE — BATCH 009: V8.2 FILTRATION & HORIZON MATRIX (PARALLEL EXECUTION)');
  console.log('==============================================================================================================');

  // Pre-Flight Integrity
  const lockboxPath = resolve(__dirname, '../results/v5_confirmatory/V5_SHADOW_LOCKBOX.json');
  const frozenConfigPath = resolve(__dirname, 'frozenConfig.js');
  const preConfigHash = getFileSha256(frozenConfigPath);
  const preLockboxHash = getFileSha256(lockboxPath);

  const trendFilters = ['NONE', 'BULL_SIMPLE', 'BULL_STRICT'];
  const fvgFilters = ['NONE', 'REQUIRED'];
  const horizons = [12, 24, 48, 72];
  
  const configs = [];
  for (const trend of trendFilters) {
    for (const fvg of fvgFilters) {
      for (const h of horizons) {
        configs.push({
          trendFilter: trend,
          fvgFilter: fvg,
          horizon: h,
          feePct: 0.0008
        });
      }
    }
  }

  console.log(`\n▸ Launching ${configs.length} independent workers...`);
  
  // Launch all workers in parallel
  const promises = configs.map(cfg => runWorker(cfg));
  const results = await Promise.all(promises);
  
  console.log('✅ All workers completed successfully.');
  
  // Statistical Analysis
  const alpha = 0.01;
  const bonferroniAlpha = alpha / configs.length;
  
  console.log(`\n▸ MULTIPLE TESTING AUDIT`);
  console.log(`   * Total Models Tested: ${configs.length}`);
  console.log(`   * Family-Wise Error Rate Target (FWER): p < ${bonferroniAlpha.toFixed(5)}`);
  
  // Find viable models (WFA >= 7/10, PF >= 1.2, p < bonferroniAlpha)
  const viableModels = results.filter(r => 
    r.wfaScore >= 7 && 
    r.pf >= 1.2 && 
    r.pValue < bonferroniAlpha &&
    r.n >= 50
  );
  
  console.log(`\n▸ BEST CONFIGURATIONS (FWER CONTROLLED)`);
  if (viableModels.length === 0) {
    console.log('   🔴 NO MODELS PASSED ALL CRITERIA.');
  } else {
    // Sort by PF descending
    viableModels.sort((a, b) => b.pf - a.pf);
    for (const v of viableModels) {
      console.log(`   🟢 [Trend: ${v.config.trendFilter.padEnd(12)} | FVG: ${v.config.fvgFilter.padEnd(8)} | Hold: ${v.config.horizon}h] -> N=${v.n} | PF=${v.pf.toFixed(2)} | WFA=${v.wfaScore}/10 | p=${v.pValue.toFixed(5)}`);
    }
  }
  
  // Generate Report
  const t1 = performance.now();
  const elapsedSec = ((t1 - t0) / 1000).toFixed(1);
  
  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  const manifest = {
    experimentFamily: 'V8.2_FILTRATION_MATRIX',
    executionTimestamp: new Date().toISOString(),
    elapsedSec,
    totalModels: configs.length,
    bonferroniAlpha,
    results
  };
  writeFileSync(resolve(resultsDir, 'BATCH_009_FILTRATION_MATRIX_MANIFEST.json'), JSON.stringify(manifest, null, 2));

  let mdContent = `# 🏛️ LYZER EDGE — BATCH 009: V8.2 FILTRATION & HORIZON MATRIX
**Execution Date:** ${manifest.executionTimestamp}  
**Elapsed Time:** ${elapsedSec}s  
**Total Independent Models Tested:** ${configs.length}  
**FWER Corrected Alpha (Bonferroni):** ${bonferroniAlpha.toFixed(5)}  

## SUMMARY
To address the low N and WFA failure of V8.0, a matrix of 24 independent experiments was executed concurrently via isolated worker threads. 

**Verdict:** ${viableModels.length > 0 ? '🟢 FOUND ROBUST SUB-FAMILY' : '🔴 ALL HYPOTHESES REFUTED (OVER-FILTRATION)'}

## MATRIX RESULTS

| Trend Filter | FVG Required | Horizon | N | Mean Net | Win Rate | PF | WFA | p-value | Viable |
|---|---|---|---|---|---|---|---|---|---|
`;

  // Sort results by WFA then PF
  const sortedResults = [...results].sort((a, b) => {
    if (b.wfaScore !== a.wfaScore) return b.wfaScore - a.wfaScore;
    return b.pf - a.pf;
  });

  for (const r of sortedResults) {
    const isViable = r.wfaScore >= 7 && r.pf >= 1.2 && r.pValue < bonferroniAlpha && r.n >= 50;
    mdContent += `| ${r.config.trendFilter} | ${r.config.fvgFilter} | ${r.config.horizon}h | ${r.n} | ${(r.meanNet * 100).toFixed(2)}% | ${r.winRate.toFixed(1)}% | ${r.pf.toFixed(2)} | ${r.wfaScore}/10 | ${r.pValue.toFixed(5)} | ${isViable ? '🟢 YES' : '🔴 NO'} |\n`;
  }

  writeFileSync(resolve(resultsDir, 'BATCH_009_FILTRATION_MATRIX_REPORT.md'), mdContent);

  // Post-Flight Check
  const postConfigHash = getFileSha256(frozenConfigPath);
  const postLockboxHash = getFileSha256(lockboxPath);

  console.log(`\n▸ POST-SUITE TRACK A ISOLATION CHECK`);
  console.log(`   Config Hash: ${postConfigHash === preConfigHash ? '🟢 MATCH' : '🔴 DRIFT'}`);
  console.log(`   Lockbox Hash: ${postLockboxHash === preLockboxHash ? '🟢 MATCH' : '🔴 DRIFT'}`);

  return { status: 'COMPLETED', viableCount: viableModels.length };
}

// Self-execute
runBatch009V8FiltrationMatrix().catch(console.error);
