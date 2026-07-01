import { getAllTrades } from '../db/queries.js';
import { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';

export class TradeLog {
  constructor() {
    this.container = null;
    this.trades = [];
  }

  async mount(container) {
    this.container = container;
    await this.loadTrades();
    this.render();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  async loadTrades() {
    this.trades = await getAllTrades();
  }

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  render() {
    const rows = this.trades.map(trade => {
      const isClosed = trade.status === TRADE_STATUS.CLOSED;
      
      let resultBadge = '';
      if (isClosed) {
        if (trade.result === TRADE_RESULT.WIN) {
          resultBadge = '<span class="badge badge-win">Win</span>';
        } else if (trade.result === TRADE_RESULT.LOSS) {
          resultBadge = '<span class="badge badge-loss">Loss</span>';
        } else {
          resultBadge = '<span class="badge badge-breakeven">BE</span>';
        }
      } else {
        resultBadge = '<span class="badge">Open</span>';
      }

      return `
        <tr>
          <td><a href="#/trades/${trade.id}" style="color: var(--color-accent); text-decoration: none;">#${trade.id}</a></td>
          <td>${trade.symbol}</td>
          <td>
            <span class="badge ${trade.direction === 'long' ? 'badge-win' : 'badge-loss'}" style="background: none; border: 1px solid currentColor;">
              ${trade.direction.toUpperCase()}
            </span>
          </td>
          <td>${this.formatDate(trade.entryDate)}</td>
          <td>${trade.entryPrice}</td>
          <td>${isClosed ? trade.exitPrice : '-'}</td>
          <td>${isClosed && trade.pnl != null ? trade.pnl.toFixed(2) : '-'}</td>
          <td>${isClosed && trade.rr != null ? trade.rr.toFixed(2) + 'R' : '-'}</td>
          <td>${resultBadge}</td>
        </tr>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Trade Log</h1>
            <p class="page-subtitle">View and filter your past trades</p>
          </div>
          <a href="#/trades/new" class="btn btn-primary">New Trade</a>
        </div>
        
        <div class="card">
          <div class="table-responsive">
            <table class="table" style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">ID</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">Symbol</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">Direction</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">Entry Date</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">Entry Price</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">Exit Price</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">PnL</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">R:R</th>
                  <th style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border);">Result</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="9" style="text-align: center; padding: var(--spacing-lg);">No trades recorded yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}
 