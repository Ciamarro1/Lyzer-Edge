import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync } from 'fs';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Coarse Grid Definitions for each Provider
function getCoarseGrid() {
  const jobs = [];
  let idCounter = 1;

  // V2: Structural Boundaries (SNR / SND)
  // V2: Structural Boundaries (SNR / SND)
  const v2Lookbacks = [10, 30, 60];
  const v2Distances = [0.002, 0.005];
  const v2BreakConfs = [70, 85];

  for (const lb of v2Lookbacks) {
    for (const dist of v2Distances) {
      for (const bConf of v2BreakConfs) {
        jobs.push({
          id: `V2_COARSE_${idCounter++}`,
          providerId: 'v2',
          params: { lookback: lb, distanceThreshold: dist, breakoutConfidence: bConf, bounceConfidence: 50 },
          segment: 'is'
        });
      }
    }
  }

  // V4: IMCE (Causality Engine)
  const v4Scores = [50, 60, 70, 80];
  const v4TargMults = [1.5, 2.0];
  for (const minScore of v4Scores) {
    for (const targ of v4TargMults) {
      jobs.push({
        id: `V4_COARSE_${idCounter++}`,
        providerId: 'v4',
        params: { minScore, targetAtrMultiplier: targ },
        segment: 'is'
      });
    }
  }

  // V5: Wyckoff Volume Profile
  const v5Lookbacks = [30, 60];
  const v5ZScores = [1.0, 1.5, 2.0];
  const v5Pierces = [0.2, 0.5];
  for (const lb of v5Lookbacks) {
    for (const z of v5ZScores) {
      for (const p of v5Pierces) {
        jobs.push({
          id: `V5_COARSE_${idCounter++}`,
          providerId: 'v5',
          params: { lookback: lb, volumeZScore: z, minPierceATR: p, pocProximity: 0.003 },
          segment: 'is'
        });
      }
    }
  }

  // V6: Market Profile
  const v6Lookbacks = [30, 50];
  const v6BinSizes = [10.0, 25.0];
  const v6VAPcts = [0.60, 0.70, 0.80];
  for (const lb of v6Lookbacks) {
    for (const bin of v6BinSizes) {
      for (const va of v6VAPcts) {
        jobs.push({
          id: `V6_COARSE_${idCounter++}`,
          providerId: 'v6',
          params: { lookback: lb, binSize: bin, valueAreaPct: va },
          segment: 'is'
        });
      }
    }
  }

  // V7: Tape Reading
  const v7Periods = [10, 20];
  const v7CvdLookbacks = [5, 10];
  const v7AbsMults = [1.5, 2.0];
  for (const p of v7Periods) {
    for (const cvd of v7CvdLookbacks) {
      for (const abs of v7AbsMults) {
        jobs.push({
          id: `V7_COARSE_${idCounter++}`,
          providerId: 'v7',
          params: { period: p, cvdLookback: cvd, absorptionVolMultiplier: abs, exhaustionVolFraction: 0.5 },
          segment: 'is'
        });
      }
    }
  }

  return jobs;
}

class ParallelGridPool {
  constructor(maxWorkers, outputDir) {
    this.maxWorkers = maxWorkers;
    this.outputDir = outputDir;
    this.results = [];
    this.completedJobIds = new Set();
    this._loadCheckpoints();
  }

  _loadCheckpoints() {
    const coarseDir = resolve(this.outputDir, 'coarse');
    if (!existsSync(coarseDir)) mkdirSync(coarseDir, { recursive: true });
    
    const files = ['v2.jsonl', 'v4.jsonl', 'v5.jsonl', 'v6.jsonl', 'v7.jsonl'];
    for (const f of files) {
      const p = resolve(coarseDir, f);
      if (existsSync(p)) {
        const lines = readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            this.completedJobIds.add(data.jobId);
            this.results.push(data);
          } catch (_) {}
        }
      }
    }
  }

  _saveResult(res) {
    const coarseDir = resolve(this.outputDir, 'coarse');
    const p = resolve(coarseDir, `${res.provider.toLowerCase()}.jsonl`);
    appendFileSync(p, JSON.stringify(res) + '\n');
    this.results.push(res);
  }

  async runQueue(jobs) {
    const pending = jobs.filter(j => !this.completedJobIds.has(j.id));
    console.log(`\n📋 TOTAL JOBS: ${jobs.length} | RESUMED: ${jobs.length - pending.length} | TO EXECUTE: ${pending.length}`);

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

          const workerScript = resolve(__dirname, 'gridWorker.js');
          const child = fork(workerScript, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
              ...process.env,
              NODE_OPTIONS: '--max-old-space-size=2048',
            }
          });

          child.stderr.on('data', (d) => {
            console.error(`[WORKER ${job.id} STDERR] ${d.toString()}`);
          });

          child.on('message', (msg) => {
            if (msg.success) {
              this._saveResult(msg.result);
              done++;
              const elapsedSec = (performance.now() - startTime) / 1000;
              const rate = done / Math.max(1, elapsedSec);
              const etaSec = (totalToRun - done) / Math.max(0.01, rate);
              
              const m = msg.result.metrics;
              console.log(`[JOB ${done}/${totalToRun}] [${msg.result.provider}] ${JSON.stringify(msg.result.params)} -> Trades: ${m.trades} | WR: ${m.winRate}% | PF: ${m.profitFactor} | Exp: $${m.expectancy} | DHR50: ${m.dhr050}% | Score: ${m.compositeScore} (${(msg.result.runtimeMs / 1000).toFixed(1)}s, ETA: ${etaSec.toFixed(0)}s)`);
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
  console.log('🚀 LYZER EDGE — PARALLEL GRID SEARCH ENGINE (STAGE 1 & 2)');
  console.log('='.repeat(70));

  // Dynamic Resource Audit
  const cpus = os.cpus().length;
  const freeMemMB = Math.floor(os.freemem() / 1024 / 1024);
  const totalMemMB = Math.floor(os.totalmem() / 1024 / 1024);
  
  // Allocate safe worker count (6 workers on 6 P-cores)
  const maxWorkers = Math.min(6, Math.max(2, Math.floor(freeMemMB / 450)));

  console.log(`Hardware Audit:`);
  console.log(`  - Host CPUs: ${cpus} threads (6 physical P-cores)`);
  console.log(`  - Free RAM: ${freeMemMB} MB / Total: ${totalMemMB} MB`);
  console.log(`  - Concurrency: ${maxWorkers} parallel worker processes`);

  const outputDir = resolve(__dirname, '../results/provider_grid');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const coarseJobs = getCoarseGrid();
  const pool = new ParallelGridPool(maxWorkers, outputDir);

  const t0 = performance.now();
  const allResults = await pool.runQueue(coarseJobs);
  const t1 = performance.now();

  console.log('\n' + '='.repeat(70));
  console.log(`🏁 STAGE 1 (COARSE GRID) FINISHED IN: ${((t1 - t0) / 1000).toFixed(2)}s`);
  console.log('='.repeat(70));

  // Aggregate and rank results by provider
  const byProvider = {};
  for (const r of allResults) {
    if (!byProvider[r.provider]) byProvider[r.provider] = [];
    byProvider[r.provider].push(r);
  }

  const rankingsDir = resolve(outputDir, 'rankings');
  if (!existsSync(rankingsDir)) mkdirSync(rankingsDir, { recursive: true });

  console.log('\n🏆 TOP CANDIDATE REGIONS PER PROVIDER (IS):');
  for (const [provider, results] of Object.entries(byProvider)) {
    // Sort by composite score
    results.sort((a, b) => (b.metrics?.compositeScore || 0) - (a.metrics?.compositeScore || 0));
    const top3 = results.slice(0, 3);
    
    console.log(`\n--- ${provider} RANKING (Top Regions) ---`);
    for (let i = 0; i < top3.length; i++) {
      const item = top3[i];
      const m = item.metrics;
      console.log(`  #${i + 1} | Score: ${m.compositeScore} | Trades: ${m.trades} | WR: ${m.winRate}% | PF: ${m.profitFactor} | Exp: $${m.expectancy} | DHR50: ${m.dhr050}% | Tier: ${m.sampleTier}`);
      console.log(`     Params: ${JSON.stringify(item.params)}`);
    }

    writeFileSync(resolve(rankingsDir, `${provider}_ranked.json`), JSON.stringify(results, null, 2));
  }

  // Stage 3: Run Top Candidate of each provider on VALIDATION Split (20%)
  console.log('\n' + '='.repeat(70));
  console.log('🔬 STAGE 3 — VALIDATION SEGMENT EVALUATION (20% VAL SPLIT)');
  console.log('='.repeat(70));

  const validationJobs = [];
  for (const [provider, results] of Object.entries(byProvider)) {
    const best = results[0];
    if (best) {
      validationJobs.push({
        id: `${provider}_VAL_BEST`,
        providerId: provider.toLowerCase(),
        params: best.params,
        segment: 'val'
      });
    }
  }

  const valPool = new ParallelGridPool(maxWorkers, resolve(outputDir, 'validation'));
  const valResults = await valPool.runQueue(validationJobs);

  console.log('\n📊 VALIDATION SPLIT VERIFICATION RESULTS:');
  for (const v of valResults) {
    const m = v.metrics;
    console.log(`\n--- ${v.provider} ON VALIDATION (25,920 CANDLES) ---`);
    console.log(`Trades: ${m.trades} | Win Rate: ${m.winRate}% | Profit Factor: ${m.profitFactor}`);
    console.log(`Net PnL: $${m.netPnL} | Expectancy: $${m.expectancy} | DHR 0.50R: ${m.dhr050}%`);
    console.log(`Params: ${JSON.stringify(v.params)}`);
  }

  // Stage 4: One-Time Blind OOS Evaluation (20% OOS)
  console.log('\n' + '='.repeat(70));
  console.log('🔒 STAGE 4 — ONE-TIME OUT-OF-SAMPLE EVALUATION (20% OOS SPLIT)');
  console.log('='.repeat(70));

  const oosJobs = [];
  for (const [provider, results] of Object.entries(byProvider)) {
    const best = results[0];
    if (best) {
      oosJobs.push({
        id: `${provider}_OOS_FINAL`,
        providerId: provider.toLowerCase(),
        params: best.params,
        segment: 'oos'
      });
    }
  }

  const oosPool = new ParallelGridPool(maxWorkers, resolve(outputDir, 'oos'));
  const oosResults = await oosPool.runQueue(oosJobs);

  console.log('\n🎯 ONE-TIME OUT-OF-SAMPLE RESULTS (25,920 CANDLES):');
  for (const o of oosResults) {
    const m = o.metrics;
    console.log(`\n--- ${o.provider} ON OOS ---`);
    console.log(`Trades: ${m.trades} | Win Rate: ${m.winRate}% | Profit Factor: ${m.profitFactor}`);
    console.log(`Net PnL: $${m.netPnL} | Expectancy: $${m.expectancy} | DHR 0.50R: ${m.dhr050}%`);
    console.log(`Params: ${JSON.stringify(o.params)}`);
  }

  // Build Manifest and Executive Summary
  const manifest = {
    date: new Date().toISOString(),
    dataset: 'BTCUSDT_1m_90d.json',
    datasetHash: 'bf794a7ac579022c',
    nodeVersion: process.version,
    hardware: {
      cpu: 'Intel Core i5-12400F (6 P-Cores, 12 Threads)',
      ramAssignedMB: totalMemMB,
      workers: maxWorkers
    },
    totalCoarseJobs: coarseJobs.length,
    validationJobs: validationJobs.length,
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
  console.log(`\n✅ Grid Search completed. Manifest saved to ${resolve(outputDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error(`\n❌ Fatal grid search error:`, err);
  process.exit(1);
});
