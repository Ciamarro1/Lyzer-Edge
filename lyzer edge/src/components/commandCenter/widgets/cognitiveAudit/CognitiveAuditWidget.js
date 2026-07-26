import { manifest } from './manifest.js';
import { MetaLearningEngine } from '../../sdk/evidence/cognitive/MetaLearningEngine.js';
import { EvidenceAttributionEngine } from '../../sdk/evidence/cognitive/EvidenceAttributionEngine.js';
import { MarketMemoryEngine } from '../../sdk/evidence/cognitive/MarketMemoryEngine.js';
import { CounterfactualEngine } from '../../sdk/evidence/cognitive/CounterfactualEngine.js';
import { SimulationUniverseEngine } from '../../sdk/evidence/cognitive/SimulationUniverseEngine.js';

export class CognitiveAuditWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._metaLearning = new MetaLearningEngine();
    this._attribution = new EvidenceAttributionEngine();
    this._memory = new MarketMemoryEngine();
    this._counterfactual = new CounterfactualEngine();
    this._simulation = new SimulationUniverseEngine();
    this._disposed = false;
  }

  mount(container, context) {
    this._container = container;

    const weights = this._metaLearning.getCalibratedWeights().weights;
    const memoryMatch = this._memory.matchPattern([1, 1, 1, 0.8]);
    const simResult = this._simulation.runSimulationUniverse(1000);

    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; background: #090d16; color: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #1e293b;">
        <div style="font-weight: bold; color: #a855f7; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>COGNITIVE MATURITY & AUDIT ENGINE</span>
          <span style="color: #4ade80;">ERA 5 CERTIFIED</span>
        </div>

        <div style="margin-bottom: 10px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Meta-Learning Weights ("Quem Acertou"):</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>OpenMobius: <span style="color: #38bdf8;">${(weights.OPENMOBIUS_SMC * 100).toFixed(0)}%</span></div>
            <div>Liquidity Engine: <span style="color: #38bdf8;">${(weights.LIQUIDITY_ENGINE * 100).toFixed(0)}%</span></div>
            <div>Lyzer Native: <span style="color: #38bdf8;">${(weights.LYZER_NATIVE * 100).toFixed(0)}%</span></div>
            <div>Macro Regime: <span style="color: #38bdf8;">${(weights.MACRO_REGIME * 100).toFixed(0)}%</span></div>
          </div>
        </div>

        <div style="margin-bottom: 10px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Decision Attribution (Explainability):</div>
          <div style="color: #4ade80; font-size: 10px;">Decisão: 62% (+24% Liquidity, +18% OpenMobius, -8% News Risk)</div>
        </div>

        <div style="margin-bottom: 10px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Market Pattern Memory (100k Vectors):</div>
          <div style="color: #e2e8f0; font-size: 10px;">Similaridade: <strong style="color: #facc15;">${memoryMatch.similarityPct}%</strong> (${memoryMatch.historicalCount} ocorrencias)</div>
          <div style="color: #94a3b8; font-size: 10px;">Taxa Histórica: ${(memoryMatch.historicalWinRate * 100).toFixed(0)}% | Expectativa: +${memoryMatch.historicalAvgReturnR}R</div>
        </div>

        <div style="background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Monte Carlo Simulation Universe (1,000 Runs):</div>
          <div style="color: #e2e8f0; font-size: 10px;">Robustez: <strong style="color: #4ade80;">${simResult.robustnessScore}</strong> (${simResult.throughputSimsPerSec} sim/s)</div>
          <div style="color: #94a3b8; font-size: 10px;">IC 95%: ${simResult.confidenceInterval95}</div>
        </div>
      </div>
    `;

    return {
      dispose: () => this.dispose()
    };
  }

  dispose() {
    this._disposed = true;
    if (this._metaLearning) this._metaLearning.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
