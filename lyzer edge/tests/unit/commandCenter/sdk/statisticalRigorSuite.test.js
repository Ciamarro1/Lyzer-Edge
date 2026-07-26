import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatisticalRigorEngine } from '../../../../src/components/commandCenter/sdk/evidence/rigor/StatisticalRigorEngine.js';
import { SystemicPruningAuditor } from '../../../../src/components/commandCenter/sdk/evidence/rigor/SystemicPruningAuditor.js';
import { RealWorkloadBenchmarker } from '../../../../src/components/commandCenter/sdk/evidence/rigor/RealWorkloadBenchmarker.js';

describe('Statistical Rigor, Systemic Pruning & Real Workload Audit Suite', () => {
  let rigorEngine;
  let auditor;
  let benchmarker;

  beforeEach(() => {
    rigorEngine = new StatisticalRigorEngine();
    auditor = new SystemicPruningAuditor();
    benchmarker = new RealWorkloadBenchmarker();
  });

  afterEach(() => {
    if (rigorEngine) rigorEngine.dispose();
  });

  it('1. StatisticalRigorEngine should calculate PSR and DSR to adjust for multiple testing backtest trials', () => {
    const psr = rigorEngine.calculatePSR(2.15, 0.0, 250);
    expect(psr).toBeGreaterThan(0.95);

    const dsr = rigorEngine.calculateDSR(2.15, 1000, 0.25, 250);
    expect(dsr.deflatedSharpeRatio).toBeDefined();
    expect(dsr.expectedMaxSR).toBeGreaterThan(0);
    expect(dsr.status).toBe('PASSED_DEFLATED_SHARPE_TEST');
  });

  it('2. StatisticalRigorEngine should evaluate Hansen SPA Superior Predictive Ability test', () => {
    const spa = rigorEngine.evaluateSuperiorPredictiveAbility([1, 2, 3, 4, 5]);
    expect(spa.whitesRealityCheckPassed).toBe(true);
    expect(spa.hansenSPAPValue).toBeLessThan(0.05);
    expect(spa.status).toBe('SUPERIOR_PREDICTIVE_ABILITY_CONFIRMED');
  });

  it('3. SystemicPruningAuditor should audit codebase connectivity and verify 100% wiring efficiency', () => {
    const audit = auditor.auditEcosystemUsage();
    expect(audit.totalComponents).toBe(24);
    expect(audit.activeWiredComponents).toBe(24);
    expect(audit.unWiredStubs).toBe(0);
    expect(audit.wiringEfficiencyPct).toBe(100.0);
  });

  it('4. RealWorkloadBenchmarker should measure tick throughput, latency, and serialization overhead', () => {
    const bench = benchmarker.benchmarkRealWorkload(1000);
    expect(bench.tickCount).toBe(1000);
    expect(bench.ticksPerSec).toBeGreaterThan(1000);
    expect(bench.includesIOAndSerialization).toBe(true);
  });
});
