import { SystemMetacognitionLayer } from '../engine/sml.js';
import { FailureModeCartography } from '../engine/fmc.js';
import { ExplorationPressureEngine } from '../engine/epe.js';
import { GovernanceAntiStasisLoop } from '../engine/gal.js';
import { CapitalFluidityRegulator } from '../engine/cfr.js';
import { RegimeShockInjectionSimulator } from '../engine/rsis.js';
import { RealityDriftMonitor } from '../engine/rdm.js';
import { SystemThermodynamicsLayer } from '../engine/stl.js';

export class SystemHealthView {
  constructor() {
    this.sml = new SystemMetacognitionLayer({ windowSize: 50 });
    this.fmc = new FailureModeCartography();
    
    // Create actual engine instances for realistic data generation
    this.engines = {
      epe: new ExplorationPressureEngine(),
      gal: new GovernanceAntiStasisLoop(),
      cfr: new CapitalFluidityRegulator(),
      rsis: new RegimeShockInjectionSimulator(),
      rdm: new RealityDriftMonitor(),
      stl: new SystemThermodynamicsLayer()
    };
    
    this.container = null;
    this.simInterval = null;
    this.isPaused = false;
    
    // For demo purposes, keep track of fake metrics
    this.fakeClock = 0;
  }

  mount(container) {
    this.container = container;
    
    // 7th Detector: The act of observing the system starts NOW
    window.__isSystemObserved = true;

    this._renderBase();
    this._startSimulation();
  }

  unmount() {
    if (this.simInterval) clearInterval(this.simInterval);
    
    // 7th Detector: The act of observing the system ends NOW
    window.__isSystemObserved = false;
  }

  _startSimulation() {
    // Generate initial history (unobserved)
    for (let i = 0; i < 40; i++) {
      this._generateTick(false);
    }
    this._updateUI();

    // Run live (observed)
    this.simInterval = setInterval(() => {
      if (!this.isPaused) {
        this._generateTick(true);
        this._updateUI();
      }
    }, 1500);
  }

  _generateTick(isObserved) {
    this.fakeClock++;
    
    // Generate a layer snapshot with some oscillating logic to trigger the FMC and SML
    
    // Base signal generation (some chaos)
    const timePhase = Math.sin(this.fakeClock / 5); // slow oscillation
    const chaos = Math.random();
    
    // If observed, system tries to "act healthier" (less variance, higher confidence) -> reverse goodhart
    const observationBias = isObserved ? 0.2 : 0; 
    
    const epeSig = chaos > (0.6 + observationBias) ? 'go' : 'no-go';
    const galSig = timePhase > 0 ? 'MAINTAIN' : 'LOOSEN';
    const rsisSig = (chaos > 0.9) ? 'SHOCK' : 'NOMINAL';
    const stlSig = (chaos > 0.8) ? 'THROTTLE_REJECT' : 'NOMINAL';
    const cfrSig = (chaos > 0.7) ? 'REDISTRIBUTE_CAPITAL' : 'MAINTAIN';
    
    // Fake the Kernel
    const kConf = Math.min(100, Math.max(0, 50 + (timePhase * 20) + (Math.random() * 20) + (isObserved ? 15 : 0)));
    const kSig = kConf > 75 ? 'go' : (kConf < 40 ? 'no-go' : 'caution');
    
    const snap = {
      layers: {
        kernel: { signal: kSig, confidence: kConf, raw_metrics: { context_confidences: { regime: kConf, timeframe: kConf - 5 } } },
        epe: { signal: epeSig, raw_metrics: { applied_pressure: 10 + (Math.random() * 20), monoculture_risk: 40 + (Math.random() * 40) } },
        gal: { signal: galSig, raw_metrics: { current_freedom: 0.5 } },
        cfr: { signal: cfrSig, raw_metrics: { maxShare: 0.7 + (Math.random() * 0.2) } },
        rsis: { signal: rsisSig, raw_metrics: { survival_rate: 0.5 } },
        rdm: { signal: 'STABLE', raw_metrics: { realityDriftIndex: Math.abs(timePhase) * 0.3 } },
        stl: { signal: stlSig, raw_metrics: { net_energy: 0.5 - (chaos * 0.4) } }
      }
    };

    this.sml.ingestSnapshot(snap, isObserved);
  }

  _updateUI() {
    if (!this.container) return;
    
    const smlReport = this.sml.analyze();
    const fmcReport = this.fmc.evaluateFailureModes(smlReport, this.sml.snapshots);
    
    this._renderState(smlReport, fmcReport);
  }

  _renderBase() {
    this.container.innerHTML = `
      <div class="page-container" style="max-width: 1200px;">
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">System Health</h1>
            <p class="page-subtitle">Metacognition & Failure Mode Cartography (Release 1.6)</p>
          </div>
          <div>
            <button class="btn btn-secondary" id="btn-pause">Pause</button>
          </div>
        </div>
        
        <!-- State Badge -->
        <div id="sh-state-badge" class="card" style="text-align: center; padding: 2rem; margin-bottom: 1rem; border-left: 4px solid var(--color-success);">
          <h2 style="margin: 0; font-size: 2rem;">INITIALIZING...</h2>
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          
          <!-- Left Column -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            
            <div class="card">
              <h3>Balance Profiles</h3>
              <div id="sh-balances" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;"></div>
            </div>
            
            <div class="card">
              <h3>Active Failure Modes (FMC)</h3>
              <div id="sh-threats" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;"></div>
            </div>
            
          </div>
          
          <!-- Right Column -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            
            <div class="card">
              <h3>Metacognitive Detections (SML)</h3>
              <div id="sh-detections" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;"></div>
            </div>
            
            <div class="card">
              <h3>Layer Dominance Profile</h3>
              <div id="sh-dominance" style="margin-top: 1rem;"></div>
            </div>
            
          </div>
          
        </div>
      </div>
    `;
    
    this.container.querySelector('#btn-pause').addEventListener('click', (e) => {
      this.isPaused = !this.isPaused;
      e.target.textContent = this.isPaused ? 'Resume' : 'Pause';
    });
  }

  _renderState(sml, fmc) {
    // 1. Update Badge
    const badge = this.container.querySelector('#sh-state-badge');
    const badgeH2 = badge.querySelector('h2');
    
    badgeH2.textContent = `SYSTEM STATE: ${sml.systemState}`;
    
    if (sml.systemState === 'HEALTHY') {
      badge.style.borderLeftColor = 'var(--color-success)';
      badge.style.color = 'var(--color-success)';
      badge.style.animation = 'none';
    } else if (sml.systemState === 'STRESSED') {
      badge.style.borderLeftColor = 'var(--color-warning)';
      badge.style.color = 'var(--color-warning)';
      badge.style.animation = 'pulse 2s infinite';
    } else {
      badge.style.borderLeftColor = 'var(--color-danger)';
      badge.style.color = 'var(--color-danger)';
      badge.style.animation = 'pulse 1s infinite';
    }

    // 2. Update Balances
    const balances = this.container.querySelector('#sh-balances');
    balances.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>Exploration vs Stability</span>
        <strong>${sml.balance.explorationRatio}</strong>
      </div>
      <div style="width: 100%; height: 8px; background: var(--color-bg-secondary); border-radius: 4px; overflow: hidden;">
        <div style="width: ${sml.balance.explorationRatio * 100}%; height: 100%; background: var(--color-accent);"></div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <span>Reality Coherence Trend</span>
        <strong>${sml.balance.realityCoherenceTrend} (RDI: ${sml.balance.rdiMovingAverage})</strong>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <span>FMC System Integrity</span>
        <strong>${fmc.systemIntegrity * 100}%</strong>
      </div>
      <div style="width: 100%; height: 8px; background: var(--color-bg-secondary); border-radius: 4px; overflow: hidden;">
        <div style="width: ${fmc.systemIntegrity * 100}%; height: 100%; background: var(--color-success);"></div>
      </div>
    `;

    // 3. Update FMC Threats
    const threats = this.container.querySelector('#sh-threats');
    if (fmc.activeThreats.length === 0) {
      threats.innerHTML = `<div class="text-muted" style="padding: 1rem; text-align: center; background: var(--color-bg-secondary); border-radius: 4px;">No structural failure modes active</div>`;
    } else {
      threats.innerHTML = fmc.activeThreats.map(t => `
        <div style="padding: 1rem; border: 1px solid ${t.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}; border-radius: 4px; background: rgba(0,0,0,0.2);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong style="color: ${t.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}">${t.mode}</strong>
            <span class="badge badge-${t.severity === 'CRITICAL' ? 'danger' : 'warning'}">Active: ${t.duration} ticks</span>
          </div>
          <p style="margin: 0; font-size: 0.9rem; color: var(--color-text-secondary);">${t.recommendation}</p>
          <div style="margin-top: 0.5rem; font-size: 0.8rem; font-family: monospace;">
            Affected: ${t.affectedLayers.join(', ')}
          </div>
        </div>
      `).join('');
    }

    // 4. Update SML Detections
    const detections = this.container.querySelector('#sh-detections');
    if (sml.detections.length === 0) {
      detections.innerHTML = `<div class="text-muted" style="padding: 1rem; text-align: center; background: var(--color-bg-secondary); border-radius: 4px;">No pathological behaviors detected</div>`;
    } else {
      detections.innerHTML = sml.detections.map(d => `
        <div style="padding: 0.75rem; border-left: 3px solid ${d.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}; background: var(--color-bg-secondary); border-radius: 4px;">
          <strong style="display: block; margin-bottom: 0.25rem;">${d.type.replace(/_/g, ' ')}</strong>
          <span style="font-size: 0.85rem; color: var(--color-text-secondary);">
            ${d.recommendation || JSON.stringify(d).substring(0, 100) + '...'}
          </span>
        </div>
      `).join('');
    }

    // 5. Update Dominance
    const dom = this.container.querySelector('#sh-dominance');
    const domKeys = Object.keys(sml.balance.dominanceProfile);
    
    if (domKeys.length === 0) {
      dom.innerHTML = '<div class="text-muted">Awaiting data...</div>';
    } else {
      dom.innerHTML = domKeys.map(k => {
        const val = sml.balance.dominanceProfile[k];
        return `
          <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
            <div style="width: 60px; font-size: 0.85rem; text-transform: uppercase;">${k}</div>
            <div style="flex: 1; height: 12px; background: var(--color-bg-secondary); border-radius: 6px; overflow: hidden; margin: 0 10px;">
              <div style="width: ${val * 100}%; height: 100%; background: ${val > 0.6 ? 'var(--color-danger)' : 'var(--color-accent)'};"></div>
            </div>
            <div style="width: 40px; font-size: 0.85rem; text-align: right;">${(val * 100).toFixed(0)}%</div>
          </div>
        `;
      }).join('');
    }
  }
}
 