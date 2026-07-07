import { getAllTrades } from '../db/queries.js';
import { ReplayEngine } from '../engine/replay.js';
import { calcAllStats } from '../engine/stats.js';

export class ReplayView {
  constructor() {
    this._container = null;
    this.engine = null;
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Market Replay</h1>
          <p class="page-subtitle">Step through your past trades to analyze decision making</p>
        </div>
        
        <div class="card" style="margin-bottom: 1.5rem;">
          <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center;">
            <button id="replay-prev" class="btn btn-secondary">Previous</button>
            <button id="replay-next" class="btn btn-primary">Next Trade</button>
            <button id="replay-reset" class="btn btn-secondary">Reset</button>
            
            <div style="flex-grow: 1; margin-left: 1rem; display: flex; align-items: center; gap: 1rem;">
               <div style="flex-grow: 1; background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                 <div id="replay-progress" style="background: var(--color-accent); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
               </div>
               <div id="replay-progress-text" class="text-muted" style="min-width: 40px; text-align: right;">0%</div>
            </div>
          </div>
          
          <div id="replay-current-trade" style="padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
            <p class="text-muted" style="margin: 0; text-align: center;">Click Next to start replay.</p>
          </div>
        </div>

        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
           <div class="card" id="replay-stats">
              <h3>Replay Stats</h3>
              <p class="text-muted">No trades replayed yet.</p>
           </div>
        </div>
      </div>
    `;

    const trades = await getAllTrades();
    this.engine = new ReplayEngine(trades);

    this._bindEvents();
    this._updateUI();
  }

  _bindEvents() {
    const btnNext = this._container.querySelector('#replay-next');
    const btnPrev = this._container.querySelector('#replay-prev');
    const btnReset = this._container.querySelector('#replay-reset');

    btnNext?.addEventListener('click', () => {
      this.engine.next();
      this._updateUI();
    });

    btnPrev?.addEventListener('click', () => {
      this.engine.prev();
      this._updateUI();
    });

    btnReset?.addEventListener('click', () => {
      this.engine.reset();
      this._updateUI();
    });
  }

  _updateUI() {
    if (!this._container) return;

    // Update progress
    const progress = this._container.querySelector('#replay-progress');
    const progressText = this._container.querySelector('#replay-progress-text');
    const pct = this.engine.getProgress();
    if (progress) progress.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${Math.round(pct)}%`;

    // Update current trade
    const currentContainer = this._container.querySelector('#replay-current-trade');
    const currentTrade = this.engine.current();
    
    if (!currentTrade) {
      currentContainer.innerHTML = '<p class="text-muted" style="margin: 0; text-align: center;">Ready to start.</p>';
    } else {
      const dateStr = (currentTrade.entryDate || currentTrade.exitDate || '').split('T')[0];
      const pnlColor = currentTrade.pnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)';
      currentContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; align-items: center;">
          <div>
            <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Date</div>
            <div style="font-weight: bold;">${dateStr}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Symbol</div>
            <div style="font-weight: bold;">${currentTrade.symbol}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Direction</div>
            <div style="font-weight: bold; text-transform: capitalize;">${currentTrade.direction}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.25rem;">PnL</div>
            <div style="font-weight: bold; font-size: 1.25rem; color: ${pnlColor}">$${currentTrade.pnl.toFixed(2)}</div>
          </div>
        </div>
      `;
    }

    // Update stats
    const statsContainer = this._container.querySelector('#replay-stats');
    const replayed = this.engine.getReplayedTrades();
    
    if (replayed.length === 0) {
      statsContainer.innerHTML = `
        <h3>Cumulative Performance</h3>
        <p class="text-muted">No trades replayed yet.</p>
      `;
    } else {
      const stats = calcAllStats(replayed);
      const pnlColor = stats.totalPnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)';
      statsContainer.innerHTML = `
        <h3>Cumulative Performance</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
          <div class="stat-item">
            <div class="text-muted">Trades Replayed</div>
            <div style="font-size: 1.5rem; font-weight: bold;">${replayed.length}</div>
          </div>
          <div class="stat-item">
            <div class="text-muted">Win Rate</div>
            <div style="font-size: 1.5rem; font-weight: bold;">${stats.winRate.toFixed(1)}%</div>
          </div>
          <div class="stat-item">
            <div class="text-muted">Net PnL</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: ${pnlColor}">$${stats.totalPnl.toFixed(2)}</div>
          </div>
          <div class="stat-item">
            <div class="text-muted">Profit Factor</div>
            <div style="font-size: 1.5rem; font-weight: bold;">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
          </div>
        </div>
      `;
    }
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }
}
 