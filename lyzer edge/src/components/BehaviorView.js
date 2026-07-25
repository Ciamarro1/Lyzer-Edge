import { getAllTrades } from '../db/queries.js';
import { analyzeBehavior } from '../engine/behavior.js';

export class BehaviorView {
  constructor() {
    this._container = null;
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Behavioral Analysis</h1>
          <p class="page-subtitle">Analyze psychological and timing patterns in your trading</p>
        </div>
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div class="card">
            <h3>Day of Week Performance</h3>
            <div id="behavior-dow-stats">Loading...</div>
          </div>
          <div class="card">
            <h3>Tilt Analysis (Performance post-win/loss)</h3>
            <div id="behavior-tilt-stats">Loading...</div>
          </div>
        </div>
      </div>
    `;
    await this._loadData();
  }

  async _loadData() {
    const trades = await getAllTrades();
    const data = analyzeBehavior(trades);
    
    if (!data) {
      this._container.querySelector('#behavior-dow-stats').innerHTML = '<p class="text-muted">No data available.</p>';
      this._container.querySelector('#behavior-tilt-stats').innerHTML = '<p class="text-muted">No data available.</p>';
      return;
    }

    this._renderDowStats(data.dayStats);
    this._renderTiltStats(data.tiltStats);
  }

  _renderDowStats(dayStats) {
    const container = this._container.querySelector('#behavior-dow-stats');
    if (!container) return;

    const rows = dayStats.filter(d => d.trades > 0).map(d => `
      <tr style="border-bottom: 1px solid var(--color-border, #333);">
        <td style="padding: 0.5rem 0; font-weight: bold;">${d.day}</td>
        <td style="padding: 0.5rem 0;">${d.trades}</td>
        <td style="padding: 0.5rem 0;">${d.winRate.toFixed(1)}%</td>
        <td style="padding: 0.5rem 0; color: ${d.pnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}">$${d.pnl.toFixed(2)}</td>
      </tr>
    `).join('');

    if (!rows) {
      container.innerHTML = '<p class="text-muted">Not enough data to calculate day of week performance.</p>';
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <th style="padding: 0.5rem 0;">Day</th>
            <th style="padding: 0.5rem 0;">Trades</th>
            <th style="padding: 0.5rem 0;">Win %</th>
            <th style="padding: 0.5rem 0;">Net PnL</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  _renderTiltStats(tiltStats) {
    const container = this._container.querySelector('#behavior-tilt-stats');
    if (!container) return;

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <th style="padding: 0.5rem 0;">Scenario</th>
            <th style="padding: 0.5rem 0;">Trades</th>
            <th style="padding: 0.5rem 0;">Win %</th>
            <th style="padding: 0.5rem 0;">Net PnL</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <td style="padding: 0.5rem 0; font-weight: bold;">After a Win</td>
            <td style="padding: 0.5rem 0;">${tiltStats.afterWinTrades}</td>
            <td style="padding: 0.5rem 0;">${tiltStats.afterWin.winRate.toFixed(1)}%</td>
            <td style="padding: 0.5rem 0; color: ${tiltStats.afterWin.totalPnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}">$${tiltStats.afterWin.totalPnl.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 0.5rem 0; font-weight: bold;">After a Loss</td>
            <td style="padding: 0.5rem 0;">${tiltStats.afterLossTrades}</td>
            <td style="padding: 0.5rem 0;">${tiltStats.afterLoss.winRate.toFixed(1)}%</td>
            <td style="padding: 0.5rem 0; color: ${tiltStats.afterLoss.totalPnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}">$${tiltStats.afterLoss.totalPnl.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top: 1rem; color: var(--color-muted);">
        Compare your performance after a winning trade versus a losing trade to identify signs of tilt or overconfidence.
      </p>
    `;
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }
}
 