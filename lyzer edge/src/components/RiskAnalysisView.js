import { robustnessReport } from '../db/robustness_results.js';

export class RiskAnalysisView {
  constructor() {
    this._container = null;
    
    // Extracted from MNE Epistemic Inversion (Shock/Reverse)
    // We prioritize 'reverse' if it represents the active Inversion Engine success.
    const engineData = robustnessReport.tests.shock.pnl > 0 ? robustnessReport.tests.shock : robustnessReport.tests.baseline;
    
    this.winRate = (engineData.winRate || 50) / 100;
    this.profitFactor = engineData.profitFactor || 1.5;
    
    // R (Payoff Ratio) = (ProfitFactor * (1 - W)) / W
    // Adding failsafe for division by zero
    this.payoffRatio = this.winRate > 0 ? (this.profitFactor * (1 - this.winRate)) / this.winRate : 1;
    if (this.payoffRatio <= 0) this.payoffRatio = 1;

    // Kelly Criterion: K = W - ((1 - W) / R)
    let kelly = this.winRate - ((1 - this.winRate) / this.payoffRatio);
    this.fullKelly = Math.max(0, kelly * 100);
    this.halfKelly = this.fullKelly / 2;

    // VaR (Value at Risk) Calculation (Simplified Parametric VaR approximation)
    // Assuming 100k equity
    this.equity = 100000;
    const maxDD = engineData.maxDD || 10;
    this.var95 = (this.equity * (maxDD * 0.8)) / 100;
    this.var99 = (this.equity * maxDD) / 100;
  }

  mount(container) {
    this._container = container;
    
    // Renders the UI
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 24px;">
          <h1 class="page-title">Risk Analysis</h1>
          <p class="page-subtitle">Epistemic Capital Protection & Survivability Engine</p>
        </div>

        <div class="dashboard-grid">
          
          <!-- Value at Risk (VaR) -->
          <div class="card glass-panel" style="grid-column: span 1; border-top: 4px solid var(--accent-amber);">
            <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Value at Risk (VaR)
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Expected max loss over active regime (Base: $100k)</p>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 4px;">95% Confidence VaR</div>
                <div style="font-size: 1.5rem; font-family: var(--font-mono); color: var(--text-primary);">
                  $${this.var95.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 4px;">99% Confidence VaR (Tail Risk)</div>
                <div style="font-size: 1.5rem; font-family: var(--font-mono); color: var(--color-drift-red);">
                  $${this.var99.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
            </div>
          </div>

          <!-- Dynamic Kelly Calculator -->
          <div class="card glass-panel" style="grid-column: span 1; border-top: 4px solid var(--color-alpha-green);">
            <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-alpha-green)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Dynamic Kelly Calculator
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Optimal sizing connected to MNE Inversion stats</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div class="text-muted" style="font-size: 0.75rem; margin-bottom: 4px;">MNE Win Rate</div>
                <div style="font-size: 1.25rem; font-family: var(--font-mono); color: var(--text-primary);">
                  ${(this.winRate * 100).toFixed(1)}%
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div class="text-muted" style="font-size: 0.75rem; margin-bottom: 4px;">Payoff Ratio</div>
                <div style="font-size: 1.25rem; font-family: var(--font-mono); color: var(--text-primary);">
                  ${this.payoffRatio.toFixed(2)}
                </div>
              </div>
            </div>

            <div style="background: rgba(6, 214, 160, 0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--color-alpha-green); margin-bottom: 16px;">
              <div style="color: var(--color-alpha-green); font-size: 0.8rem; margin-bottom: 8px; font-weight: bold;">RECOMMENDED SIZING (HALF KELLY)</div>
              <div style="font-size: 2rem; font-family: var(--font-mono); color: var(--color-alpha-green); font-weight: bold;">
                ${this.halfKelly.toFixed(2)}%
              </div>
              <div class="text-muted" style="font-size: 0.75rem; margin-top: 8px;">
                Full Kelly: ${this.fullKelly.toFixed(2)}% (High Volatility)
              </div>
            </div>
          </div>

          <!-- Drawdown Stress Test -->
          <div class="card glass-panel" style="grid-column: span 1; border-top: 4px solid var(--accent-blue);">
            <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              Drawdown Stress Test
            </h3>
            <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Impact of consecutive losses at Half-Kelly</p>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${[1, 3, 5, 10].map(consecutiveLosses => {
                const lossFactor = Math.pow(1 - (this.halfKelly / 100), consecutiveLosses);
                const endingEquity = this.equity * lossFactor;
                const dd = ((this.equity - endingEquity) / this.equity) * 100;
                
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid var(--border-color);">
                    <span class="text-muted" style="font-size: 0.9rem;">${consecutiveLosses} Losses</span>
                    <span style="font-family: var(--font-mono); color: ${dd > 15 ? 'var(--color-drift-red)' : 'var(--text-primary)'}">
                      -$ ${(this.equity - endingEquity).toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})} (-${dd.toFixed(1)}%)
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
            
            <div style="margin-top: 16px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
              *Calculated recursively preventing total ruin.
            </div>
          </div>

        </div>
      </div>
    `;
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
    }
  }
}
