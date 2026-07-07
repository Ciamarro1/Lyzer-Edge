import { getAllTrades } from '../db/queries.js';
import { calcAllStats } from '../engine/stats.js';

export class EdgeExplorerView {
  constructor() {
    this._container = null;
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Edge Explorer</h1>
          <p class="page-subtitle">Deep dive into your edge and advanced analytics</p>
        </div>
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div class="card" style="grid-column: span 2;">
            <h3>Performance by Symbol</h3>
            <div id="explorer-symbol-stats">Loading...</div>
          </div>
          <div class="card">
            <h3>Performance by Direction</h3>
            <div id="explorer-direction-stats">Loading...</div>
          </div>
          <div class="card">
            <h3>Risk/Reward Analysis</h3>
            <div id="explorer-rr-stats">Loading...</div>
          </div>
        </div>
      </div>
    `;
    await this._loadData();
  }

  async _loadData() {
    const trades = await getAllTrades();
    const closed = trades.filter(t => t.status === 'closed');
    
    this._renderSymbolStats(closed);
    this._renderDirectionStats(closed);
    this._renderRRStats(closed);
  }

  _renderSymbolStats(trades) {
    const container = this._container.querySelector('#explorer-symbol-stats');
    if (!container) return;
    if (trades.length === 0) {
      container.innerHTML = '<p class="text-muted">No trades available.</p>';
      return;
    }

    const bySymbol = {};
    for (const t of trades) {
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = [];
      bySymbol[t.symbol].push(t);
    }

    const rows = Object.entries(bySymbol).map(([sym, symTrades]) => {
      const stats = calcAllStats(symTrades);
      return `
        <tr style="border-bottom: 1px solid var(--color-border, #333);">
          <td style="padding: 0.5rem 0; font-weight: bold;">${sym}</td>
          <td style="padding: 0.5rem 0;">${symTrades.length}</td>
          <td style="padding: 0.5rem 0;">${stats.winRate.toFixed(1)}%</td>
          <td style="padding: 0.5rem 0; color: ${stats.totalPnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}">$${stats.totalPnl.toFixed(2)}</td>
          <td style="padding: 0.5rem 0;">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <th style="padding: 0.5rem 0;">Symbol</th>
            <th style="padding: 0.5rem 0;">Trades</th>
            <th style="padding: 0.5rem 0;">Win %</th>
            <th style="padding: 0.5rem 0;">Net PnL</th>
            <th style="padding: 0.5rem 0;">Profit Factor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  _renderDirectionStats(trades) {
    const container = this._container.querySelector('#explorer-direction-stats');
    if (!container) return;
    if (trades.length === 0) {
      container.innerHTML = '<p class="text-muted">No trades available.</p>';
      return;
    }

    const longTrades = trades.filter(t => t.direction === 'long');
    const shortTrades = trades.filter(t => t.direction === 'short');
    
    const longStats = calcAllStats(longTrades);
    const shortStats = calcAllStats(shortTrades);

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <th style="padding: 0.5rem 0;">Direction</th>
            <th style="padding: 0.5rem 0;">Trades</th>
            <th style="padding: 0.5rem 0;">Win %</th>
            <th style="padding: 0.5rem 0;">Net PnL</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <td style="padding: 0.5rem 0; font-weight: bold; color: var(--color-success, #06d6a0);">Long</td>
            <td style="padding: 0.5rem 0;">${longTrades.length}</td>
            <td style="padding: 0.5rem 0;">${longStats.winRate.toFixed(1)}%</td>
            <td style="padding: 0.5rem 0; color: ${longStats.totalPnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}">$${longStats.totalPnl.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 0.5rem 0; font-weight: bold; color: var(--color-danger, #ef4444);">Short</td>
            <td style="padding: 0.5rem 0;">${shortTrades.length}</td>
            <td style="padding: 0.5rem 0;">${shortStats.winRate.toFixed(1)}%</td>
            <td style="padding: 0.5rem 0; color: ${shortStats.totalPnl >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}">$${shortStats.totalPnl.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  _renderRRStats(trades) {
    const container = this._container.querySelector('#explorer-rr-stats');
    if (!container) return;
    if (trades.length === 0) {
      container.innerHTML = '<p class="text-muted">No trades available.</p>';
      return;
    }

    const stats = calcAllStats(trades);
    
    container.innerHTML = `
      <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
        <li><strong>Average R-Multiple:</strong> ${stats.avgRMultiple.toFixed(2)}R</li>
        <li><strong>Average Planned R:</strong> ${stats.avgPlannedRR.toFixed(2)}R</li>
        <li><strong>Realized Avg R/R:</strong> ${stats.avgRR.toFixed(2)}</li>
        <li><strong>Expectancy:</strong> $${stats.expectancy.toFixed(2)}</li>
      </ul>
      <p style="margin-top: 1rem; color: var(--color-muted);">
        A positive expectancy indicates a statistical edge over the sample size.
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
 