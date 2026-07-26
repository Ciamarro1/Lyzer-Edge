import { manifest } from './manifest.js';
import { AlphaDiscoveryEngine } from '../../sdk/evidence/alpha/AlphaDiscoveryEngine.js';
import { AlphaGraduationPipeline } from '../../sdk/evidence/alpha/AlphaGraduationPipeline.js';
import { AutonomousResearchScheduler } from '../../sdk/evidence/alpha/AutonomousResearchScheduler.js';
import { HypothesisFalsificationEngine } from '../../sdk/evidence/alpha/HypothesisFalsificationEngine.js';

export class AlphaDiscoveryWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._alphaEngine = new AlphaDiscoveryEngine();
    this._pipeline = new AlphaGraduationPipeline();
    this._scheduler = new AutonomousResearchScheduler();
    this._falsification = new HypothesisFalsificationEngine();
    this._disposed = false;
  }

  async mount(container, context) {
    this._container = container;

    const alphaMetrics = this._alphaEngine.evaluateNetAlpha({ grossReturn: 0.0245, beta: 0.12 });
    
    this._pipeline.registerHypothesis('ALPHA-001', 'Orderflow-Volatility Curvature');
    const advanced = this._pipeline.advanceStage('ALPHA-001', { tStatistic: alphaMetrics.tStatistic });

    const job = await this._scheduler.executeResearchCycle('Orderflow Curvature Alpha');

    // Run falsification tests
    this._falsification.falsifyHypothesis({ id: 'WEAK-HYP-101', tStatistic: 1.2, netAlpha: -0.002 });
    this._falsification.falsifyHypothesis({ id: 'STRONG-HYP-102', tStatistic: 2.8, netAlpha: 0.018, feeErosionPct: 20 });
    const falsStats = this._falsification.getStats();

    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; background: #070913; color: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #1e293b;">
        <div style="font-weight: bold; color: #10b981; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>EMPIRICAL ALPHA DISCOVERY & RESEARCH SCHEDULER</span>
          <span style="color: #38bdf8;">PHASE 9</span>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Net Alpha Metrics:</div>
          <div style="color: #4ade80;">Net Alpha: <strong>+${(alphaMetrics.netAlpha * 100).toFixed(2)}%</strong> | IR: ${alphaMetrics.informationRatio} | t-stat: <strong style="color: #38bdf8;">${alphaMetrics.tStatistic}</strong> (t > 2.0)</div>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">8-Stage Alpha Graduation Pipeline:</div>
          <div style="color: #facc15;">Hypothesis ${advanced.alphaId} Stage: <strong>[${advanced.currentStage}]</strong> (${advanced.currentStageIndex + 1}/8)</div>
        </div>

        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">24/7 Autonomous Research Scheduler:</div>
          <div style="color: #a855f7;">Job ${job.cycleId}: Generated PR <strong>#${job.autoPullRequest.prNumber}</strong> (${job.autoPullRequest.status})</div>
        </div>

        <div style="background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">Hypothesis Falsification Machine:</div>
          <div style="color: #f43f5e;">Discarded: <strong>${falsStats.discardedCount}</strong> | Proven: ${falsStats.provenCount} | Discard Rate: <strong>${falsStats.discardRatePct}%</strong></div>
        </div>
      </div>
    `;

    return {
      dispose: () => this.dispose()
    };
  }

  dispose() {
    this._disposed = true;
    if (this._alphaEngine) this._alphaEngine.dispose();
    if (this._scheduler) this._scheduler.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
