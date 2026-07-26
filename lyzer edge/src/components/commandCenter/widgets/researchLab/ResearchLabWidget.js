import { manifest } from './manifest.js';
import { ResearchLabEngine } from '../../sdk/evidence/lab/ResearchLabEngine.js';
import { ModelRegistryEngine } from '../../sdk/evidence/lab/ModelRegistryEngine.js';
import { ConceptDriftEngine } from '../../sdk/evidence/lab/ConceptDriftEngine.js';
import { EvidenceMarketplaceEngine } from '../../sdk/evidence/lab/EvidenceMarketplaceEngine.js';
import { StrategyGenomeEngine } from '../../sdk/evidence/lab/StrategyGenomeEngine.js';

export class ResearchLabWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._lab = new ResearchLabEngine();
    this._registry = new ModelRegistryEngine();
    this._drift = new ConceptDriftEngine();
    this._marketplace = new EvidenceMarketplaceEngine();
    this._genome = new StrategyGenomeEngine();
    this._disposed = false;
  }

  mount(container, context) {
    this._container = container;

    const expResult = this._lab.executeLabExperiment(3812, { OPENMOBIUS: true, LIQUIDITY: true });
    const models = this._registry.listModels();
    const driftCheck = this._drift.evaluateDrift('openmobius-smc-v2', 0.72);
    const plugins = this._marketplace.listPlugins();
    const topGenome = this._genome.getTopGenome();

    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; background: #0b0f19; color: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #1e293b;">
        <div style="font-weight: bold; color: #f43f5e; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>🔬 QUANT RESEARCH LAB & STRATEGY GENOME</span>
          <span style="color: #38bdf8;">ERA 7 PLATFORM</span>
        </div>

        <div style="margin-bottom: 10px; background: #111827; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">🧪 Research Experiment ${expResult.expId}:</div>
          <div style="color: #4ade80;">Sharpe: <strong>${expResult.sharpe}</strong> | PF: ${expResult.profitFactor} | Max DD: ${expResult.maxDrawdownPct}%</div>
        </div>

        <div style="margin-bottom: 10px; background: #111827; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">📚 Model Registry (${models.length} Models Active):</div>
          <div style="color: #e2e8f0;">${models[0].name} v${models[0].version} [<span style="color: #38bdf8;">${models[0].status}</span>]</div>
        </div>

        <div style="margin-bottom: 10px; background: #111827; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">🛡️ Concept Drift Protection:</div>
          <div style="color: #facc15;">Status: ${driftCheck.actionTaken} (${driftCheck.message})</div>
        </div>

        <div style="margin-bottom: 10px; background: #111827; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">🛒 Evidence Plugin Marketplace:</div>
          <div style="color: #38bdf8;">${plugins[0].name} (Score: ${plugins[0].lastEvaluationScore} | Precision: ${plugins[0].precisionPct}%)</div>
        </div>

        <div style="background: #111827; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold;">🧬 Strategy Genome Evolution:</div>
          <div style="color: #a855f7;">Top Genome: <strong>${topGenome.dnaId}</strong> (Gen ${topGenome.generation})</div>
          <div style="color: #cbd5e1;">Sharpe: <strong style="color: #4ade80;">${topGenome.metrics.sharpe}</strong> | PF: ${topGenome.metrics.profitFactor}</div>
        </div>
      </div>
    `;

    return {
      dispose: () => this.dispose()
    };
  }

  dispose() {
    this._disposed = true;
    if (this._lab) this._lab.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
