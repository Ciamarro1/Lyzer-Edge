import { manifest } from './manifest.js';
import { EvidenceFusionEngine } from '../../sdk/evidence/fusion/EvidenceFusionEngine.js';
import { HypothesisGenerator } from '../../sdk/evidence/fusion/HypothesisGenerator.js';
import { HypothesisRanker } from '../../sdk/evidence/fusion/HypothesisRanker.js';

export class EvidenceFusionWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._fusionEngine = new EvidenceFusionEngine();
    this._hypothesisGen = new HypothesisGenerator();
    this._hypothesisRanker = new HypothesisRanker();
    this._disposed = false;
  }

  mount(container, context) {
    this._container = container;
    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; background: #0f172a; color: #f8fafc; border-radius: 6px; font-size: 11px;">
        <div style="font-weight: bold; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">
          ⚖️ EVIDENCE FUSION & BAYESIAN RANKING
        </div>
        <div id="efw-weights" style="margin-bottom: 8px;">
          <div><span style="color: #94a3b8;">Lyzer Native:</span> <span style="color: #38bdf8;">0.30</span></div>
          <div><span style="color: #94a3b8;">OpenMobius SMC:</span> <span style="color: #38bdf8;">0.25</span></div>
          <div><span style="color: #94a3b8;">Liquidity Engine:</span> <span style="color: #38bdf8;">0.20</span></div>
          <div><span style="color: #94a3b8;">Macro Regime:</span> <span style="color: #38bdf8;">0.15</span></div>
        </div>
        <div style="background: #1e293b; padding: 6px; border-radius: 4px;">
          <div style="color: #cbd5e1;">Top Hypothesis: <strong style="color: #4ade80;" id="efw-top-h">H_STRUCTURAL_EXPANSION</strong></div>
          <div style="color: #cbd5e1;">Posterior Score: <strong style="color: #facc15;" id="efw-score">0.82</strong></div>
          <div style="color: #cbd5e1;">Entropy: <span id="efw-entropy" style="color: #94a3b8;">0.45 bits</span></div>
        </div>
      </div>
    `;

    return {
      dispose: () => this.dispose()
    };
  }

  updateFusion(fusedData) {
    if (this._disposed || !this._container) return;
    const scoreEl = this._container.querySelector('#efw-score');
    if (scoreEl && fusedData) {
      scoreEl.textContent = fusedData.posteriorScore.toFixed(2);
    }
  }

  dispose() {
    this._disposed = true;
    if (this._fusionEngine) {
      this._fusionEngine.dispose();
    }
    if (this._container) {
      this._container.innerHTML = '';
    }
  }
}
