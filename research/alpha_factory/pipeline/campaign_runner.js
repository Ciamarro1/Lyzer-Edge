/**
 * ALPHA FACTORY — UNIFIED 3-STAGE DISCOVERY CAMPAIGN ORCHESTRATOR
 * Module: campaign_runner.js
 * 
 * Multi-Stage Fast-Fail Protocol:
 * - Stage 0 (< 100ms): Event Density & Feasibility Pre-Screen (N_viable >= 60).
 * - Stage 1 (< 500ms): Simulation & Raw Economic Expectancy Filter (E[R] >= +0.150R).
 * - Stage 2: Rigorous Inference Battery (14d Calendar Block Bootstrap + BY FDR).
 * - Topological Basin Decomposition & Deterministic Geodesic Medoid Selection.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FirewallGuard } from '../core/firewall_guard.js';
import { FastSimulator } from '../core/fast_simulator.js';
import { EventDensityPreScreener } from '../core/event_density_prescreener.js';
import {
  runCalendarBlockBootstrap,
  computeBenjaminiYekutieli,
  findTopologicalBasinsAndMedoid
} from '../core/inference_battery.js';

export class CampaignRunner {
  constructor(lakeManager, options = {}) {
    this.lake = lakeManager;
    this.options = {
      nMin: options.nMin || 60,
      minNetR: options.minNetR || 0.150,
      alphaFDR: options.alphaFDR || 0.05,
      bootstrapB: options.bootstrapB || 10000,
      seed: options.seed || 888888,
      excludeContaminated1H: options.excludeContaminated1H !== false,
      ...options
    };
  }

  /**
   * Runs an end-to-end discovery campaign.
   */
  async runCampaign(campaignSpec) {
    const startTime = Date.now();
    console.log(`\n================================================================`);
    console.log(`🏛️ ALPHA FACTORY — EXECUTING CAMPAIGN: ${campaignSpec.campaignId}`);
    console.log(`================================================================\n`);

    // Step 1: Invariant Checks
    const v8Path = path.resolve(process.cwd(), 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
    FirewallGuard.assertV8EngineInvariant(v8Path);
    console.log(`✔ Engine V8 Invariant Verified.`);

    const targetAssets = campaignSpec.targetAssets;
    const hypotheses = campaignSpec.hypotheses;
    const graphSpec = campaignSpec.graphSpec;
    const signalFactory = campaignSpec.signalFactory; // (hyp) => { detectorFn, simulatorFn }

    console.log(`Universe: ${targetAssets.length} assets | Hypotheses: ${hypotheses.length} cells | FDR: Benjamini-Yekutieli`);

    // Step 2: Pre-load datasets into memory
    const distinctTFs = Array.from(new Set(hypotheses.map(h => h.timeframe)));
    console.log(`Preloading ${targetAssets.length} assets across ${distinctTFs.length} timeframes...`);
    for (const sym of targetAssets) {
      for (const tf of distinctTFs) {
        this.lake.getDataset(sym, tf, { excludeContaminated1H: this.options.excludeContaminated1H });
      }
    }
    console.log(`✔ Datasets preloaded and verified under Data Firewall.`);

    const results = [];
    let stage0Fails = 0;
    let stage1Fails = 0;
    let stage2Evaluated = 0;

    // Step 3: Iterate through hypotheses
    for (let i = 0; i < hypotheses.length; i++) {
      const hyp = hypotheses[i];
      const { detectorFn, simulatorFn, config } = signalFactory(hyp);

      // --- STAGE 0: Event Density Pre-Screen (< 100ms) ---
      let totalRaw = 0;
      let totalViable = 0;
      let totalInfeasible = 0;

      for (const sym of targetAssets) {
        const d = this.lake.getDataset(sym, hyp.timeframe);
        const extremes = d.getExtremes(hyp.breakoutLookbackK || hyp.lookbackK || 40);
        const n = d.candles.length;

        for (let t = 72; t < n; t++) {
          const det = detectorFn(d.candles, d.ind, extremes, t, config);
          if (det && det.isEvent) {
            totalRaw++;
            const cNow = d.candles[t].close;
            const rRaw = det.rRaw;
            if (rRaw < 0.0080 * cNow) {
              totalInfeasible++;
            } else {
              totalViable++;
            }
          }
        }
      }

      if (totalViable < this.options.nMin) {
        stage0Fails++;
        results.push({
          id: hyp.id,
          timeframe: hyp.timeframe,
          modelLabel: hyp.modelLabel || hyp.id,
          K: hyp.breakoutLookbackK || hyp.lookbackK || 40,
          theta: hyp.compressionThresholdTheta || hyp.theta || 0,
          stage: 'STAGE0_FAIL',
          failReason: `INSUFFICIENT_DENSITY: Viable events (${totalViable}) < N_min (${this.options.nMin})`,
          nTrades: totalViable,
          infeasibleCount: totalInfeasible,
          meanNetR: 0,
          ci95Lower: 0,
          ci95Upper: 0,
          pBlock: 1.0,
          profitFactor: 0,
          mddR: 0,
          totalNetR: 0,
          isDegenerate: totalViable <= 4
        });
        continue;
      }

      // --- STAGE 1: Fast Simulation (< 500ms) ---
      let pooledTrades = [];
      let totalInfeasSim = 0;

      for (const sym of targetAssets) {
        const d = this.lake.getDataset(sym, hyp.timeframe);
        const extremes = d.getExtremes(hyp.breakoutLookbackK || hyp.lookbackK || 40);
        const simRes = FastSimulator.simulateAsset(d.candles, d.ind, extremes, simulatorFn, config, sym);
        pooledTrades = pooledTrades.concat(simRes.trades);
        totalInfeasSim += simRes.infeasibleCount;
      }

      pooledTrades.sort((a, b) => (a.exitTime || a.exitTimestamp) - (b.exitTime || b.exitTimestamp));
      const nTrades = pooledTrades.length;
      const sampleMeanR = nTrades > 0 ? (pooledTrades.reduce((s, t) => s + t.netR, 0) / nTrades) : 0;

      if (nTrades < this.options.nMin || sampleMeanR < this.options.minNetR) {
        stage1Fails++;
        results.push({
          id: hyp.id,
          timeframe: hyp.timeframe,
          modelLabel: hyp.modelLabel || hyp.id,
          K: hyp.breakoutLookbackK || hyp.lookbackK || 40,
          theta: hyp.compressionThresholdTheta || hyp.theta || 0,
          stage: 'STAGE1_FAIL',
          failReason: nTrades < this.options.nMin
            ? `SAMPLE_BELOW_N_MIN: ${nTrades} < ${this.options.nMin}`
            : `NEGATIVE_OR_WEAK_EXPECTANCY: E[R]=${sampleMeanR.toFixed(3)}R < ${this.options.minNetR}R`,
          nTrades,
          infeasibleCount: totalInfeasSim,
          meanNetR: Number(sampleMeanR.toFixed(3)),
          ci95Lower: 0,
          ci95Upper: 0,
          pBlock: 1.0,
          profitFactor: 0,
          mddR: 0,
          totalNetR: 0,
          isDegenerate: nTrades <= 4
        });
        continue;
      }

      // --- STAGE 2: Rigorous Inference Battery (Bootstrap) ---
      stage2Evaluated++;
      const boot = runCalendarBlockBootstrap(pooledTrades, {
        replications: this.options.bootstrapB,
        seed: this.options.seed
      });

      results.push({
        id: hyp.id,
        timeframe: hyp.timeframe,
        modelLabel: hyp.modelLabel || hyp.id,
        K: hyp.breakoutLookbackK || hyp.lookbackK || 40,
        theta: hyp.compressionThresholdTheta || hyp.theta || 0,
        stage: 'STAGE2_EVALUATED',
        failReason: null,
        nTrades: boot.nTrades,
        infeasibleCount: totalInfeasSim,
        meanNetR: boot.meanNetR,
        ci95Lower: boot.ci95Lower,
        ci95Upper: boot.ci95Upper,
        pBlock: boot.pBlock,
        profitFactor: boot.profitFactor,
        mddR: boot.mddR,
        totalNetR: boot.totalNetR,
        isDegenerate: boot.isDegenerate,
        degeneracyReason: boot.degeneracyReason
      });
    }

    // Step 4: Apply Benjamini-Yekutieli Multiplicity Adjustment
    const pValues = results.map(r => r.pBlock);
    const byAdjusted = computeBenjaminiYekutieli(pValues, this.options.alphaFDR);

    for (let i = 0; i < results.length; i++) {
      results[i].qBY = byAdjusted[i].qValue;
      results[i].byPass = byAdjusted[i].pass && !results[i].isDegenerate && results[i].nTrades >= this.options.nMin;
    }

    // Step 5: Topological Basins & Medoid
    let basinAnalysis = { hasBasin: false, eligibleCount: 0, basins: [], winningBasin: null, medoid: null };
    if (graphSpec && graphSpec.adjacencyList) {
      basinAnalysis = findTopologicalBasinsAndMedoid(results, graphSpec.adjacencyList, {
        nMin: this.options.nMin,
        qCutoff: this.options.alphaFDR,
        minNetR: this.options.minNetR
      });
    }

    const elapsedTotalMs = Date.now() - startTime;

    const summary = {
      campaignId: campaignSpec.campaignId,
      timestampUTC: new Date().toISOString(),
      elapsedSeconds: Number((elapsedTotalMs / 1000).toFixed(2)),
      totalHypotheses: hypotheses.length,
      stage0Filtered: stage0Fails,
      stage1Filtered: stage1Fails,
      stage2Evaluated,
      eligibleHypotheses: basinAnalysis.eligibleCount,
      basinsCount: basinAnalysis.basins ? basinAnalysis.basins.length : 0,
      hasWinningBasin: basinAnalysis.hasBasin,
      winningMedoid: basinAnalysis.medoid ? basinAnalysis.medoid.id : null,
      verdict: basinAnalysis.hasBasin ? 'DISCOVERY_SUCCESS_BASIN_PROMOTABLE' : 'DISCOVERY_FAIL_NO_CANDIDATE_PROMOTED'
    };

    console.log(`\n================================================================`);
    console.log(`🏛️ ALPHA FACTORY CAMPAIGN COMPLETE (${summary.elapsedSeconds}s)`);
    console.log(`Stage 0 Filtered (< N_min):       ${stage0Fails}/${hypotheses.length}`);
    console.log(`Stage 1 Filtered (E[R] < 0.15R):  ${stage1Fails}/${hypotheses.length}`);
    console.log(`Stage 2 Rigorously Evaluated:     ${stage2Evaluated}/${hypotheses.length}`);
    console.log(`Fully Eligible Candidates:        ${summary.eligibleHypotheses}/${hypotheses.length}`);
    console.log(`Verdict:                          ${summary.verdict}`);
    console.log(`================================================================\n`);

    return { summary, basinAnalysis, results };
  }
}
