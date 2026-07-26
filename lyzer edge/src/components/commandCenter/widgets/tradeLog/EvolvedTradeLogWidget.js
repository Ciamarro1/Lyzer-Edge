import { tradeLogManifest } from './manifest.js';
import db from '../../../../db/database.js';

export class EvolvedTradeLogWidget {
  constructor() {
    this.manifest = tradeLogManifest;
    this._container = null;
    this._disposed = false;
    this._trades = [];
    this._filter = { symbol: 'ALL', side: 'ALL', status: 'ALL' };
    this._sortField = 'entryDate';
    this._sortDir = -1;
    this._liveInterval = null;
  }

  async mount(container, context) {
    this._container = container;
    this._container.style.cssText = 'padding:16px;font-family:monospace;background:#070c18;color:#f8fafc;font-size:11px;height:100%;box-sizing:border-box;overflow-y:auto;';
    await this._loadTrades();
    this.render();
    this._liveInterval = setInterval(() => this._loadTrades(), 5000);
    return { dispose: () => this.dispose() };
  }

  async _loadTrades() {
    try {
      const all = await db.trades.orderBy('id').reverse().toArray();
      this._trades = all;
      if (!this._disposed && this._container?.isConnected) this.render();
    } catch (e) {
      console.warn('[TradeLog] DB load error:', e);
    }
  }

  _applyFilters() {
    let filtered = [...this._trades];
    if (this._filter.symbol !== 'ALL') {
      filtered = filtered.filter(t => t.symbol === this._filter.symbol);
    }
    if (this._filter.side !== 'ALL') {
      filtered = filtered.filter(t => t.direction === this._filter.side);
    }
    if (this._filter.status !== 'ALL') {
      filtered = filtered.filter(t => t.status === this._filter.status);
    }
    filtered.sort((a, b) => {
      const aVal = a[this._sortField] || '';
      const bVal = b[this._sortField] || '';
      return aVal < bVal ? -this._sortDir : (aVal > bVal ? this._sortDir : 0);
    });
    return filtered.slice(0, 100);
  }

  _getUniqueSymbols() {
    return [...new Set(this._trades.map(t => t.symbol))].sort();
  }

  _calcStats() {
    const closed = this._trades.filter(t => t.status === 'closed' && t.result);
    const wins = closed.filter(t => t.result === 'win').length;
    const total = closed.length || 1;
    const winRate = ((wins / total) * 100).toFixed(1);
    const netPnl = this._trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossProfits = this._trades.filter(t => (t.pnl || 0) > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLosses = Math.abs(this._trades.filter(t => (t.pnl || 0) < 0).reduce((s, t) => s + t.pnl, 0)) || 1;
    const profitFactor = (grossProfits / grossLosses).toFixed(2);
    return { winRate, profitFactor, netPnl, total: this._trades.length, openCount: this._trades.filter(t => t.status === 'open').length };
  }

  render() {
    if (!this._container || this._disposed) return;
    const stats = this._calcStats();
    const filtered = this._applyFilters();
    const symbols = this._getUniqueSymbols();

    const sideColor = (s) => s === 'LONG' ? '#10b981' : (s === 'SHORT' ? '#ef4444' : '#94a3b8');
    const pnlColor = (v) => v > 0 ? '#34d399' : (v < 0 ? '#f87171' : '#94a3b8');

    this._container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e293b;padding-bottom:12px;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0 0 2px;font-size:14px;color:#38bdf8;font-weight:bold;display:flex;align-items:center;gap:8px;">
            <span>📋 TRADE LOG & AUDIT</span>
            <span style="background:rgba(16,185,129,0.15);color:#34d399;font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid rgba(16,185,129,0.3);">${stats.total} TRADES</span>
          </h3>
          <p style="margin:0;color:#94a3b8;font-size:10px;">Execution Chain & Constitutional Court Audits</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:4px 10px;text-align:center;">
            <div style="color:#94a3b8;font-size:8px;">WIN RATE</div>
            <div style="color:#34d399;font-size:13px;font-weight:bold;">${stats.winRate}%</div>
          </div>
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:4px 10px;text-align:center;">
            <div style="color:#94a3b8;font-size:8px;">PROFIT FACTOR</div>
            <div style="color:#facc15;font-size:13px;font-weight:bold;">${stats.profitFactor}</div>
          </div>
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:4px 10px;text-align:center;">
            <div style="color:#94a3b8;font-size:8px;">NET PNL</div>
            <div style="color:${pnlColor(stats.netPnl)};font-size:13px;font-weight:bold;">${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}</div>
          </div>
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:4px 10px;text-align:center;">
            <div style="color:#94a3b8;font-size:8px;">OPEN</div>
            <div style="color:#38bdf8;font-size:13px;font-weight:bold;">${stats.openCount}</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
        <span style="color:#94a3b8;font-size:10px;">Filter:</span>
        <select id="tl-filter-symbol" style="background:#0f172a;color:#f8fafc;border:1px solid #1e293b;border-radius:4px;padding:3px 6px;font-size:10px;font-family:monospace;">
          <option value="ALL">All Assets</option>
          ${symbols.map(s => `<option value="${s}" ${this._filter.symbol === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select id="tl-filter-side" style="background:#0f172a;color:#f8fafc;border:1px solid #1e293b;border-radius:4px;padding:3px 6px;font-size:10px;font-family:monospace;">
          <option value="ALL">All Sides</option>
          <option value="LONG" ${this._filter.side === 'LONG' ? 'selected' : ''}>LONG</option>
          <option value="SHORT" ${this._filter.side === 'SHORT' ? 'selected' : ''}>SHORT</option>
        </select>
        <select id="tl-filter-status" style="background:#0f172a;color:#f8fafc;border:1px solid #1e293b;border-radius:4px;padding:3px 6px;font-size:10px;font-family:monospace;">
          <option value="ALL">All Status</option>
          <option value="open" ${this._filter.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="closed" ${this._filter.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
        <button id="tl-refresh" style="background:#1e293b;color:#94a3b8;border:1px solid #475569;border-radius:4px;padding:3px 8px;font-size:10px;cursor:pointer;font-family:monospace;">⟳ Refresh</button>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr style="border-bottom:1px solid #334155;color:#94a3b8;text-transform:uppercase;font-size:9px;">
              <th style="padding:6px;cursor:pointer;" data-sort="entryDate">Time ${this._sortField === 'entryDate' ? (this._sortDir === -1 ? '▼' : '▲') : ''}</th>
              <th style="padding:6px;">Asset</th>
              <th style="padding:6px;">Side</th>
              <th style="padding:6px;">Entry</th>
              <th style="padding:6px;">Exit</th>
              <th style="padding:6px;">PnL</th>
              <th style="padding:6px;">Status</th>
              <th style="padding:6px;text-align:center;">Plot</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? '<tr><td colspan="8" style="padding:24px;text-align:center;color:#64748b;">No trades recorded yet. Start the backend to receive trade data.</td></tr>' :
              filtered.map(t => {
                const entryStr = t.entryDate ? new Date(t.entryDate).toLocaleTimeString() : '--';
                const exitStr = t.exitDate ? new Date(t.exitDate).toLocaleTimeString() : (t.status === 'open' ? '🟢 Open' : '--');
                const pnlVal = t.pnl || 0;
                return `<tr style="border-bottom:1px solid #1e293b;">
                  <td style="padding:6px;color:#94a3b8;">${entryStr}</td>
                  <td style="padding:6px;font-weight:bold;color:#f8fafc;">${t.symbol || '--'}</td>
                  <td style="padding:6px;color:${sideColor(t.direction)};font-weight:bold;">${t.direction || '--'}</td>
                  <td style="padding:6px;color:#38bdf8;">${t.entryPrice != null ? '$' + Number(t.entryPrice).toLocaleString() : '--'}</td>
                  <td style="padding:6px;color:#94a3b8;">${t.exitPrice != null ? '$' + Number(t.exitPrice).toLocaleString() : exitStr}</td>
                  <td style="padding:6px;color:${pnlColor(pnlVal)};font-weight:bold;">${pnlVal >= 0 ? '+' : ''}$${pnlVal.toFixed(2)}</td>
                  <td style="padding:6px;"><span style="background:#1e293b;padding:2px 5px;border-radius:3px;color:${t.status === 'open' ? '#38bdf8' : '#94a3b8'};">${t.status || '--'}</span></td>
                  <td style="padding:6px;text-align:center;">
                    <button class="tl-plot-btn" data-id="${t.id}" style="background:#38bdf8;color:#020617;border:none;padding:3px 6px;border-radius:3px;font-weight:bold;font-size:9px;cursor:pointer;">📈</button>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const symEl = this._container.querySelector('#tl-filter-symbol');
    const sideEl = this._container.querySelector('#tl-filter-side');
    const statusEl = this._container.querySelector('#tl-filter-status');
    const refreshEl = this._container.querySelector('#tl-refresh');

    symEl?.addEventListener('change', () => { this._filter.symbol = symEl.value; this.render(); });
    sideEl?.addEventListener('change', () => { this._filter.side = sideEl.value; this.render(); });
    statusEl?.addEventListener('change', () => { this._filter.status = statusEl.value; this.render(); });
    refreshEl?.addEventListener('click', () => this._loadTrades());

    // Sort by time column click
    this._container.querySelector('th[data-sort="entryDate"]')?.addEventListener('click', () => {
      this._sortDir *= -1;
      this.render();
    });

    this._container.querySelectorAll('.tl-plot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id, 10);
        const trade = this._trades.find(t => t.id === id);
        if (trade) {
          const side = trade.direction === 'LONG' ? 'BUY' : 'SELL';
          window.dispatchEvent(new CustomEvent('lyzer:plot-trade', {
            detail: { symbol: (trade.symbol || '').replace('/USD', 'USDT'), entry: trade.entryPrice, tp: 0, sl: 0, side, title: `${trade.direction} @ ${trade.entryPrice}` }
          }));
          window.dispatchEvent(new CustomEvent('lyzer:switch-dock-tab', { detail: { tabId: 'chart-host-widget' } }));
        }
      });
    });
  }

  dispose() {
    this._disposed = true;
    if (this._liveInterval) { clearInterval(this._liveInterval); this._liveInterval = null; }
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
  }
}
