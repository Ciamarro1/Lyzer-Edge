import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AlphaDiscoveryEngine } from '../../../../src/components/commandCenter/sdk/evidence/alpha/AlphaDiscoveryEngine.js';
import { AlphaGraduationPipeline, GRADUATION_STAGES } from '../../../../src/components/commandCenter/sdk/evidence/alpha/AlphaGraduationPipeline.js';
import { AutonomousResearchScheduler } from '../../../../src/components/commandCenter/sdk/evidence/alpha/AutonomousResearchScheduler.js';
import { HypothesisFalsificationEngine } from '../../../../src/components/commandCenter/sdk/evidence/alpha/HypothesisFalsificationEngine.js';

describe('Empirical Alpha Discovery & Research Scheduler Suite', () => {
  let alphaEngine;
  let pipeline;
  let scheduler;
  let falsification;

  beforeEach(() => {
    alphaEngine = new AlphaDiscoveryEngine();
    pipeline = new AlphaGraduationPipeline();
    scheduler = new AutonomousResearchScheduler();
    falsification = new HypothesisFalsificationEngine();
  });

  afterEach(() => {
    if (alphaEngine) alphaEngine.dispose();
    if (scheduler) scheduler.dispose();
  });

  it('1. AlphaDiscoveryEngine should calculate Net Alpha after friction costs and test t-statistic significance', () => {
    const res = alphaEngine.evaluateNetAlpha({
      grossReturn: 0.0245,
      marketReturn: 0.0050,
      beta: 0.12,
      slippageBps: 4.0,
      feeBps: 6.0
    });

    expect(res.netAlpha).toBeGreaterThan(0);
    expect(res.tStatistic).toBeGreaterThan(2.0);
    expect(res.isStatisticallySignificant).toBe(true);
    expect(res.status).toBe('TRUE_ALPHA_CONFIRMED');
  });

  it('2. AlphaGraduationPipeline should advance hypothesis through the 8 strict graduation stages', () => {
    pipeline.registerHypothesis('ALPHA-101', 'Orderflow Curvature');
    const advanced = pipeline.advanceStage('ALPHA-101', { tStatistic: 2.45 });

    expect(advanced.currentStage).toBe('STAT_VERIFICATION');
    expect(advanced.currentStageIndex).toBe(1);
    expect(GRADUATION_STAGES.length).toBe(8);
  });

  it('3. AutonomousResearchScheduler should run 24/7 background research cycle and publish auto PR', async () => {
    const job = await scheduler.executeResearchCycle('Orderflow Alpha');

    expect(job.cycleId).toBeDefined();
    expect(job.autoPullRequest.prNumber).toBeGreaterThan(1000);
    expect(job.autoPullRequest.status).toBe('PENDING_GUARDIAN_REVIEW');
  });

  it('4. HypothesisFalsificationEngine should aggressively discard weak hypotheses failing significance or net alpha', () => {
    const rejected = falsification.falsifyHypothesis({ id: 'WEAK-01', tStatistic: 1.2, netAlpha: -0.001, feeErosionPct: 90 });
    expect(rejected.falsified).toBe(true);
    expect(rejected.verdict).toBe('DISCARDED_WEAK_HYPOTHESIS');

    const accepted = falsification.falsifyHypothesis({ id: 'STRONG-02', tStatistic: 2.8, netAlpha: 0.015, feeErosionPct: 15 });
    expect(accepted.falsified).toBe(false);
    expect(accepted.verdict).toBe('PROVEN_ROBUST_ALPHA');

    const stats = falsification.getStats();
    expect(stats.discardedCount).toBe(1);
    expect(stats.provenCount).toBe(1);
  });
});
