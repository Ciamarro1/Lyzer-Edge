import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync } from 'fs';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getUnblockedGrid() {
  const jobs = [];
  let idCounter = 1;

  // 1. BASELINE UNBLOCKED (Default generator parameters for each provider)
  jobs.push({ id: `V2_BASELINE`, providerId: 'v2', params: {}, segment: 'is' });
  jobs.push({ id: `V5_BASELINE`, providerId: 'v5', params: {}, segment: 'is' });
  jobs.push({ id: `V6_BASELINE`, providerId: 'v6', params: {}, segment: 'is' });
  jobs.push({ id: `V7_BASELINE`, providerId: 'v7', params: {}, segment: 'is' });

  // 2. V2 SENSITIVITY GRID (SNR / SND Lookback & Proximity)
  const v2Lookbacks = [10, 30, 60];
  const v2Distances = [0.002, 0.005];
  const v2BreakConfs = [70, 85];
  for (const lb of v2Lookbacks) {
    for (const dist of v2Distances) {
      for (const bConf of v2BreakConfs) {
        jobs.push({
          id: `V2_GRID_${idCounter++}`,
          providerId: 'v2',
          params: { lookback: lb, distanceThreshold: dist, breakoutConfidence: bConf, bounceConfidence: 50 },
          segment: 'is'
        });
      }
    }
  }

  // 3. V5 DECOUPLED & SENSITIVITY GRID (Wyckoff Conditions Decoupling)
  // A: Vol, B: Pierce, C: POC, D: Reversal
  const v5Modes = [
    { name: 'A_VOL_ONLY', requireVolume: true, requirePierce: false, requirePOC: false, requireReversal: false },
    { name: 'B_PIERCE_ONLY', requireVolume: false, requirePierce: true, requirePOC: false, requireReversal: false },
    { name: 'AB_VOL_PIERCE', requireVolume: true, requirePierce: true, requirePOC: false, requireReversal: false },
    { name: 'AC_VOL_POC', requireVolume: true, requirePierce: false, requirePOC: true, requireReversal: false },
    { name: 'AD_VOL_REVERSAL', requireVolume: true, requirePierce: false, requirePOC: false, requireReversal: true },
    { name: 'ABD_VOL_PIERCE_REV', requireVolume: true, requirePierce: true, requirePOC: false, requireReversal: true },
    { name: 'ABCD_ALL_DEFAULT', requireVolume: true, requirePierce: true, requirePOC: true, requireReversal: true },
  ];

  for (const m of v5Modes) {
    jobs.push({
      id: `V5_MODE_${m.name}`,
      providerId: 'v5',
      params: {
        lookback: 30,
        volumeZScore: 1.5,
        minPierceATR: 0.5,
        pocProximity: 0.003,
        ...m
      },
      segment: 'is'
    });
  }

  // 4. V6 SENSITIVITY GRID (Market Profile Value Area & Resolution)
  const v6Lookbacks = [30, 50];
  const v6BinSizes = [10.0, 25.0];
  const v6VAPcts = [0.60, 0.70, 0.80];
  for (const lb of v6Lookbacks) {
    for (const bin of v6BinSizes) {
      for (const va of v6VAPcts) {
        jobs.push({
          id: `V6_GRID_${idCounter++}`,
          providerId: 'v6',
          params: { lookback: lb, binSize: bin, valueAreaPct: va },
          segment: 'is'
        });
      }
    }
  }

  // 5. V7 SENSITIVITY GRID (Tape Reading & Delta Flow)
  const v7Periods = [10, 20];
  const v7CvdLookbacks = [5, 10];
  const v7AbsMults = [1.5, 2.0];
  for (const p of v7Periods) {
    for (const cvd of v7CvdLookbacks) {
      for (const abs of v7AbsMults) {
        jobs.push({
          id: `V7_GRID_${idCounter++}`,
          providerId: 'v7',
          params: { period: p, cvdLookback: cvd, absorptionVolMultiplier: abs, exhaustionVolFraction: 0.5 },
          segment: 'is'
        });
      }
    }
  }

  return jobs;
}

class UnblockedParallelPool {
  constructor(maxWorkers, outputDir) {
    this.maxWorkers = maxWorkers;
    this.outputDir = outputDir;
    this.results = [];
    this.completedJobIds = new Set();
    this._loadCheckpoints();
  }

  _loadCheckpoints() {
    const runsDir = resolve(this.outputDir, 'runs');
    if (!existsSync(runsDir)) mkdirSync(runsDir, { recursive: true });

    const files = ['v2.jsonl', 'v5.jsonl', 'v6.jsonl', 'v7.jsonl'];
    for (const f of files) {
      const p = resolve(runsDir, f);
      if (existsSync(p)) {
        const lines = readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            this.completedJobIds.add(data.jobId || data.id);
            this.results.push(data);
          } catch (_) {}
        }
      }
    }
  }

  _saveResult(res, jobId) {
    const runsDir = resolve(this.outputDir, 'runs');
    const p = resolve(runsDir, `${res.provider.toLowerCase()}.jsonl`);
    const record = { jobId, ...res };
    appendFileSync(p, JSON.stringify(record) + '\n');
    this.results.push(record);
  }

  async runQueue(jobs) {
    const pending = jobs.filter(j => !this.completedJobIds.has(j.id));
    console.log(`\n📋 TOTAL UNBLOCKED JOBS: ${jobs.length} | RESUMED: ${jobs.length - pending.length} | TO EXECUTE: ${pending.length}`);

    if (pending.length === 0) return this.results;

    let cursor = 0;
    let active = 0;
    let done = 0;
    const totalToRun = pending.length;
    const startTime = performance.now();

    return new Promise((resolveAll) => {
      const spawnNext = () => {
        if (cursor >= pending.length && active === 0) {
          return resolveAll(this.results);
        }

        while (active < this.maxWorkers && cursor < pending.length) {
          const job = pending[cursor++];
          active++;

          const workerScript = resolve(__dirname, 'unblockedEvaluator.js');
          const child = fork(workerScript, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
              ...process.env,
              NODE_OPTIONS: '--max-old-space-size=2048',
            }
          });

          child.stderr.on('data', (d) => {
            console.error(`[UNBLOCKED WORKER ${job.id} STDERR] ${d.toString()}`);
          });

          child.on('message', (msg) => {
            if (msg.success) {
              this._saveResult(msg.result, job.id);
              done++;
              const elapsedSec = (performance.now() - startTime) / 1000;
              const rate = done / Math.max(1, elapsedSec);
              const etaSec = (totalToRun - done) / Math.max(0.01, rate);

              const m = msg.result.metrics;
              const d = msg.result.rawDirectionality?.['30m'] || {};
              console.log(`[JOB ${done}/${totalToRun}] [${msg.result.provider}] (${job.id}) -> Raw Sigs: ${msg.result.rawSignalsTotal} | Trades: ${m.trades} | WR: ${m.winRate}% | PF: ${m.profitFactor} | Exp: $${m.expectancy} | DHR50: ${m.dhr050}% | Fwd30m MFE: ${d.mfeMeanPct}% (${(msg.result.runtimeMs / 1000).toFixed(1)}s, ETA: ${etaSec.toFixed(0)}s)`);
            } else {
              console.error(`❌ Job ${job.id} failed:`, msg.error);
            }
          });

          child.on('exit', () => {
            active--;
            spawnNext();
          });

          child.send(job);
        }
      };

      spawnNext();
    });
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔓 LYZER EDGE — EXP-PROVIDER-UNBLOCK-002: DIRECTIONAL ALPHA RECOVERY');
  console.log('='.repeat(70));

  const cpus = os.cpus().length;
  const freeMemMB = Math.floor(os.freemem() / 1024 / 1024);
  const totalMemMB = Math.floor(os.totalmem() / 1024 / 1024);
  const maxWorkers = Math.min(5, Math.max(2, Math.floor(freeMemMB / 450)));

  console.log(`Hardware Profile:`);
  console.log(`  - Host CPUs: ${cpus} threads (6 P-cores)`);
  console.log(`  - Free RAM: ${freeMemMB} MB / Total: ${totalMemMB} MB`);
  console.log(`  - Parallel Concurrency: ${maxWorkers} workers`);

  const outputDir = resolve(__dirname, '../results/provider_unblock');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const jobs = getUnblockedGrid();
  const pool = new UnblockedParallelPool(maxWorkers, outputDir);

  const t0 = performance.now();
  const allResults = await pool.runQueue(jobs);
  const t1 = performance.now();

  console.log('\n' + '='.repeat(70));
  console.log(`🏁 UNBLOCKED EVALUATION FINISHED IN: ${((t1 - t0) / 1000).toFixed(2)}s`);
  console.log('='.repeat(70));

  // Group by Provider
  const byProvider = {};
  for (const r of allResults) {
    if (!byProvider[r.provider]) byProvider[r.provider] = [];
    byProvider[r.provider].push(r);
  }

  // Print Baselines and Top Regions
  console.log('\n📊 BASELINE UNBLOCKED RESULTS:');
  for (const [provider, results] of Object.entries(byProvider)) {
    const base = results.find(r => r.jobId === `${provider}_BASELINE`) || results[0];
    if (base) {
      const m = base.metrics;
      const d = base.rawDirectionality;
      console.log(`\n--- ${provider} BASELINE UNBLOCKED ---`);
      console.log(`Raw Signals: ${base.rawSignalsTotal} (Density: ${m.signalDensity.densityClass} - ${m.signalDensity.signalsPerHour} sigs/hr)`);
      console.log(`Trades: ${m.trades} | Win Rate: ${m.winRate}% | Profit Factor: ${m.profitFactor} | Expectancy: $${m.expectancy}`);
      console.log(`DHR 0.20R: ${m.dhr020}% | DHR 0.50R: ${m.dhr050}% | DHR 1.00R: ${m.dhr100}%`);
      console.log(`Forward Trajectory:`);
      console.log(`  - 10m: MFE ${d?.['10m']?.mfeMeanPct}% | MAE ${d?.['10m']?.maeMeanPct}% | Pos Ret Rate ${d?.['10m']?.positiveReturnRate}%`);
      console.log(`  - 30m: MFE ${d?.['30m']?.mfeMeanPct}% | MAE ${d?.['30m']?.maeMeanPct}% | Pos Ret Rate ${d?.['30m']?.positiveReturnRate}%`);
      console.log(`  - 60m: MFE ${d?.['60m']?.mfeMeanPct}% | MAE ${d?.['60m']?.maeMeanPct}% | Pos Ret Rate ${d?.['60m']?.positiveReturnRate}%`);
      console.log(`  - 120m: MFE ${d?.['120m']?.mfeMeanPct}% | MAE ${d?.['120m']?.maeMeanPct}% | Pos Ret Rate ${d?.['120m']?.positiveReturnRate}%`);
    }
  }

  // Rank Top Regions
  const rankingsDir = resolve(outputDir, 'rankings');
  if (!existsSync(rankingsDir)) mkdirSync(rankingsDir, { recursive: true });

  console.log('\n🏆 TOP CANDIDATE REGIONS PER PROVIDER (IS):');
  const topCandidates = {};
  for (const [provider, results] of Object.entries(byProvider)) {
    results.sort((a, b) => (b.metrics?.compositeScore || 0) - (a.metrics?.compositeScore || 0));
    topCandidates[provider] = results[0];
    const top3 = results.slice(0, 3);
    
    console.log(`\n--- ${provider} TOP REGIONS ---`);
    for (let i = 0; i < top3.length; i++) {
      const item = top3[i];
      const m = item.metrics;
      console.log(`  #${i + 1} (${item.jobId}) | Score: ${m.compositeScore} | Trades: ${m.trades} | WR: ${m.winRate}% | PF: ${m.profitFactor} | Exp: $${m.expectancy} | DHR50: ${m.dhr050}%`);
      console.log(`     Params: ${JSON.stringify(item.params)}`);
    }
    writeFileSync(resolve(rankingsDir, `${provider}_unblocked_ranked.json`), JSON.stringify(results, null, 2));
  }

  // Stage 3: Validation Split Evaluation (20% VAL)
  console.log('\n' + '='.repeat(70));
  console.log('🔬 VALIDATION SEGMENT EVALUATION (20% VAL SPLIT: 25,920 CANDLES)');
  console.log('='.repeat(70));

  const valJobs = [];
  for (const [provider, best] of Object.entries(topCandidates)) {
    if (best) {
      valJobs.push({
        id: `${provider}_VAL_BEST`,
        providerId: provider.toLowerCase(),
        params: best.params,
        segment: 'val'
      });
    }
  }

  const valPool = new UnblockedParallelPool(maxWorkers, resolve(outputDir, 'validation'));
  const valResults = await valPool.runQueue(valJobs);

  console.log('\n📊 VALIDATION RESULTS:');
  for (const v of valResults) {
    const m = v.metrics;
    console.log(`\n--- ${v.provider} ON VALIDATION ---`);
    console.log(`Trades: ${m.trades} | Win Rate: ${m.winRate}% | Profit Factor: ${m.profitFactor} | Expectancy: $${m.expectancy}`);
    console.log(`DHR 0.50R: ${m.dhr050}% | Net PnL: $${m.netPnL} | MaxDD: $${m.maxDrawdown}`);
    console.log(`Params: ${JSON.stringify(v.params)}`);
  }

  // Stage 4: One-Time Out-of-Sample Evaluation (20% OOS)
  console.log('\n' + '='.repeat(70));
  console.log('🔒 ONE-TIME OUT-OF-SAMPLE EVALUATION (20% OOS SPLIT: 25,920 CANDLES)');
  console.log('='.repeat(70));

  const oosJobs = [];
  for (const [provider, best] of Object.entries(topCandidates)) {
    if (best) {
      oosJobs.push({
        id: `${provider}_OOS_FINAL`,
        providerId: provider.toLowerCase(),
        params: best.params,
        segment: 'oos'
      });
    }
  }

  const oosPool = new UnblockedParallelPool(maxWorkers, resolve(outputDir, 'oos'));
  const oosResults = await oosPool.runQueue(oosJobs);

  console.log('\n🎯 ONE-TIME OUT-OF-SAMPLE FINAL RESULTS:');
  for (const o of oosResults) {
    const m = o.metrics;
    console.log(`\n--- ${o.provider} ON OUT-OF-SAMPLE ---`);
    console.log(`Trades: ${m.trades} | Win Rate: ${m.winRate}% | Profit Factor: ${m.profitFactor} | Expectancy: $${m.expectancy}`);
    console.log(`DHR 0.50R: ${m.dhr050}% | Net PnL: $${m.netPnL} | MaxDD: $${m.maxDrawdown}`);
    console.log(`Params: ${JSON.stringify(o.params)}`);
  }

  // Save Final Manifest
  const manifest = {
    experimentId: 'EXP-PROVIDER-UNBLOCK-002',
    date: new Date().toISOString(),
    dataset: 'BTCUSDT_1m_90d.json',
    datasetHash: 'bf794a7ac579022c',
    hardware: {
      cpu: 'Intel Core i5-12400F (6 P-cores, 12 Threads)',
      workers: maxWorkers
    },
    totalJobs: jobs.length,
    validationJobs: valJobs.length,
    oosJobs: oosJobs.length,
    runtimeSec: ((performance.now() - t0) / 1000).toFixed(2),
    providersEvaluated: Object.keys(byProvider),
    summary: {
      is: byProvider,
      val: valResults,
      oos: oosResults
    }
  };

  writeFileSync(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ EXP-PROVIDER-UNBLOCK-002 Completed. Manifest saved to ${resolve(outputDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error(`\n❌ Fatal unblocked experiment error:`, err);
  process.exit(1);
});
