import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { PersistentWorkerPool } from './persistentWorkerPool.js';
import { ResourceGovernor, globalGovernor } from './resourceGovernor.js';
import { researchProvenance } from './researchProvenance.js';
import { getDatasetSnapshot, getLatestFundingRate } from './datasetSnapshot.js';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from './frozenConfig.js';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class MultiExperimentScheduler {
  constructor({ maxWorkers = 12, governor = null } = {}) {
    this.maxWorkers = maxWorkers;
    this.governor = governor || new ResourceGovernor({ maxGlobalWorkers: maxWorkers });
    this.taskScriptUrl = new URL('./persistentWorkerTask.js', import.meta.url);
    this.pool = new PersistentWorkerPool(this.taskScriptUrl, this.maxWorkers);
  }

  async initialize() {
    // Prewarm all 12 persistent workers with PING
    const pings = Array.from({ length: this.maxWorkers }, (_, i) => 
      this.pool.executeTask({ type: 'PING' })
    );
    await Promise.all(pings);
    // Ensure dataset snapshot is loaded in RAM
    getDatasetSnapshot();
  }

  /**
   * Dispatches a single pre-registered quantitative experiment
   */
  async runExperiment({
    experimentId,
    hypothesisId,
    hypothesisFamily,
    parentHypothesis = 'EXP-V5-CONFIRMATORY-006',
    config,
    bootstrapIterations = 50000,
    permutationIterations = 20000,
    baseSeed = 42,
    priority = 1
  }) {
    const t0 = performance.now();
    const mem0 = process.memoryUsage().heapUsed;

    // 1. Mandatory Gate G Pre-Registration
    const { dataset } = getDatasetSnapshot();
    const datasetHash = getDatasetSnapshot().hashes.candles1hSha256;

    const registration = researchProvenance.preRegisterExperiment({
      experimentId,
      hypothesisId,
      parentHypothesis,
      hypothesisFamily,
      config,
      datasetHash,
      targetSampleWindow: '2023-2026',
      plannedBootstrapIters: bootstrapIterations,
      plannedPermutationIters: permutationIterations,
      baseSeed
    });

    // 2. Acquire Worker Quota from Global Governor
    const totalMathWorkload = bootstrapIterations + permutationIterations;
    const allocatedWorkers = await this.governor.acquireWorkers(experimentId, totalMathWorkload, priority);

    try {
      // 3. Signal Replay & Trade Simulation on Shared Dataset Snapshot
      const { candles, funding } = getDatasetSnapshot();
      const v5Engine = new WyckoffVolumeProfileEngine({
        lookback: config.lookbackBars || FROZEN_V5_CONFIG.lookbackBars,
        volumeZScore: config.volumeZScore !== undefined ? config.volumeZScore : FROZEN_V5_CONFIG.volumeZScore,
        minPierceATR: config.minPierceATR !== undefined ? config.minPierceATR : FROZEN_V5_CONFIG.minPierceATR,
        pocProximity: config.pocProximity !== undefined ? config.pocProximity : FROZEN_V5_CONFIG.pocProximity,
        requireVolume: config.requireVolume !== undefined ? config.requireVolume : FROZEN_V5_CONFIG.requireVolume,
        requirePierce: config.requirePierce !== undefined ? config.requirePierce : FROZEN_V5_CONFIG.requirePierce,
        requirePOC: config.requirePOC !== undefined ? config.requirePOC : FROZEN_V5_CONFIG.requirePOC,
        requireReversal: config.requireReversal !== undefined ? config.requireReversal : FROZEN_V5_CONFIG.requireReversal
      });

      const lookbackBuffer = [];
      const tradeLedger = [];
      const springsData = [];

      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        lookbackBuffer.push(c);
        if (lookbackBuffer.length > 300) lookbackBuffer.shift();
        if (i < 48 || lookbackBuffer.length < 30) continue;

        const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
        const nar = v5Engine.reconstruct(mtf);
        if (nar && nar.signal === 'LONG') {
          const fundingRate = getLatestFundingRate(funding, c.closeTime);
          const isCellA = fundingRate < 0;

          const rawEntry = candles[i + 1] ? candles[i + 1].open : c.close;
          const rawExit = candles[Math.min(candles.length - 1, i + 6)].close;
          const fwdRet = ((rawExit - rawEntry) / rawEntry) * 100;
          springsData.push({ fwdRet, isNegFunding: isCellA });

          if (isCellA) {
            // Apply SL / TP / Time Exit
            const atr = nar.volatility?.atr || (c.high - c.low);
            const slPrice = rawEntry - (1.0 * atr);
            const tpPrice = rawEntry + (2.5 * 1.0 * atr);
            let exitPrice = rawExit;
            let exitReason = 'TIME_EXIT';

            for (let bar = i + 1; bar <= Math.min(candles.length - 1, i + 6); bar++) {
              const b = candles[bar];
              if (b.low <= slPrice) {
                exitPrice = slPrice;
                exitReason = 'STOP_LOSS';
                break;
              } else if (b.high >= tpPrice) {
                exitPrice = tpPrice;
                exitReason = 'TAKE_PROFIT';
                break;
              }
            }

            const grossReturnPct = ((exitPrice - rawEntry) / rawEntry);
            const grossPnL = 1000 * grossReturnPct;
            const feeRate = 0.0020;
            const slipRate = 0.0004;
            const entryVal = 1000;
            const exitVal = 1000 * (1 + grossReturnPct);
            const fees = (entryVal * feeRate) + (exitVal * feeRate);
            const slippage = (entryVal * slipRate) + (exitVal * slipRate);
            const trueNetPnL = grossPnL - fees - slippage;

            tradeLedger.push({
              timestamp: c.closeTime,
              entryPrice: rawEntry,
              exitPrice,
              exitReason,
              grossPnL,
              fees,
              slippage,
              trueNetPnL
            });
          }
        }
      }

      // 4. Parallel Heavy Math on Allocated Worker Quota
      const ledgerPnl = tradeLedger.map(t => t.trueNetPnL);
      const chunkBootIters = Math.floor(bootstrapIterations / allocatedWorkers);
      const bootTasks = [];
      for (let k = 0; k < allocatedWorkers; k++) {
        bootTasks.push(this.pool.executeTask({
          type: 'BOOTSTRAP_CHUNK',
          data: {
            ledgerPnl,
            chunkIterations: chunkBootIters,
            seedOffset: baseSeed + k * 10007 + 1
          }
        }));
      }

      const chunkPermIters = Math.floor(permutationIterations / allocatedWorkers);
      const trueCellA = springsData.filter(s => s.isNegFunding);
      const trueCellB = springsData.filter(s => !s.isNegFunding);
      const meanA = trueCellA.length ? trueCellA.reduce((s, x) => s + x.fwdRet, 0) / trueCellA.length : 0;
      const meanB = trueCellB.length ? trueCellB.reduce((s, x) => s + x.fwdRet, 0) / trueCellB.length : 0;
      const observedDiff = meanA - meanB;
      const nA = trueCellA.length;
      const allReturns = springsData.map(s => s.fwdRet);

      const permTasks = [];
      for (let k = 0; k < allocatedWorkers; k++) {
        permTasks.push(this.pool.executeTask({
          type: 'PERMUTATION_CHUNK',
          data: {
            allReturns,
            nA,
            observedDiff,
            chunkIterations: chunkPermIters,
            seedOffset: baseSeed + k * 20011 + 7
          }
        }));
      }

      const [bootResults, permResults] = await Promise.all([
        Promise.all(bootTasks),
        Promise.all(permTasks)
      ]);

      // 5. Aggregate Results
      let totalNonPositive = 0;
      let totalExtreme = 0;
      const actualBootTotal = chunkBootIters * allocatedWorkers;
      const actualPermTotal = chunkPermIters * allocatedWorkers;
      const allExp = new Float32Array(actualBootTotal);
      let offset = 0;

      for (const r of bootResults) {
        allExp.set(r.expArray, offset);
        offset += r.chunkIterations;
        totalNonPositive += r.nonPositiveExpCount;
      }
      for (const r of permResults) {
        totalExtreme += r.extremeCount;
      }

      allExp.sort();

      const ciExp = [
        Number(allExp[Math.floor(actualBootTotal * 0.025)].toFixed(3)),
        Number(allExp[Math.floor(actualBootTotal * 0.975)].toFixed(3))
      ];
      const rawPValue = Number((totalExtreme / actualPermTotal).toFixed(4));

      const totalGrossPnL = tradeLedger.reduce((s, t) => s + t.grossPnL, 0);
      const totalNetPnL = tradeLedger.reduce((s, t) => s + t.trueNetPnL, 0);
      const wins = tradeLedger.filter(t => t.trueNetPnL > 0).length;
      const grossWins = tradeLedger.filter(t => t.grossPnL > 0).reduce((s, t) => s + t.grossPnL, 0);
      const grossLosses = tradeLedger.filter(t => t.grossPnL <= 0).reduce((s, t) => s + Math.abs(t.grossPnL), 0);
      const netWins = tradeLedger.filter(t => t.trueNetPnL > 0).reduce((s, t) => s + t.trueNetPnL, 0);
      const netLosses = tradeLedger.filter(t => t.trueNetPnL <= 0).reduce((s, t) => s + Math.abs(t.trueNetPnL), 0);

      const netPF = netLosses > 0 ? Number((netWins / netLosses).toFixed(2)) : (netWins > 0 ? 10.0 : 0.0);
      const winRatePct = tradeLedger.length ? Number(((wins / tradeLedger.length) * 100).toFixed(2)) : 0;

      const t1 = performance.now();
      const elapsedMs = t1 - t0;

      const resultsSummary = {
        experimentId,
        hypothesisId,
        hypothesisFamily,
        allocatedWorkers,
        elapsedTimeMs: Number(elapsedMs.toFixed(1)),
        sampleSizeN: tradeLedger.length,
        totalGrossPnL: Number(totalGrossPnL.toFixed(2)),
        totalNetPnL: Number(totalNetPnL.toFixed(2)),
        netProfitFactor: netPF,
        netWinRatePct: winRatePct,
        bootstrap95CI: ciExp,
        rawPValue,
        executionTimestamp: new Date().toISOString()
      };

      // 6. Record Results in Provenance Registry
      researchProvenance.recordExecutionResults(experimentId, resultsSummary);

      return resultsSummary;
    } finally {
      // 7. Always Release Workers back to Global Governor
      this.governor.releaseWorkers(experimentId);
    }
  }

  /**
   * Executes a batch of experiments concurrently with resource governance
   */
  async runBatch(experimentsList) {
    const t0 = performance.now();
    const batchPromises = experimentsList.map(exp => this.runExperiment(exp));
    const results = await Promise.all(batchPromises);
    const t1 = performance.now();

    return {
      batchTotalTimeMs: t1 - t0,
      totalExperimentsExecuted: results.length,
      results
    };
  }

  async destroy() {
    await this.pool.destroy();
  }
}
