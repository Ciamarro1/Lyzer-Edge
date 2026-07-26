import { tradeLogManifest } from './manifest.js';

export class EvolvedTradeLogWidget {
  constructor() {
    this.manifest = tradeLogManifest;
    this._container = null;
    this._disposed = false;

    this._trades = [
      { id: 'trd_1092', symbol: 'BTCUSDT', side: 'BUY', entry: 65300, tp: 67200, sl: 64400, qty: '0.45 BTC', pnl: '+$855.00', status: 'FILLED', court: 'ALLOW_TRANSITION', time: '10:42:15' },
      { id: 'trd_1091', symbol: 'ETHUSDT', side: 'SELL', entry: 3480, tp: 3380, sl: 3530, qty: '4.2 ETH', pnl: '+$420.00', status: 'CLOSED', court: 'ALLOW_TRANSITION', time: '10:15:30' },
      { id: 'trd_1090', symbol: 'SOLUSDT', side: 'BUY', entry: 184.50, tp: 196.00, sl: 179.00, qty: '50 SOL', pnl: '+$575.00', status: 'FILLED', court: 'ALLOW_TRANSITION', time: '09:50:11' },
      { id: 'trd_1089', symbol: 'BTCUSDT', side: 'BUY', entry: 64900, tp: 66800, sl: 64100, qty: '0.25 BTC', pnl: '-$200.00', status: 'STOPPED_OUT', court: 'ALLOW_TRANSITION', time: '08:30:00' },
      { id: 'trd_1088', symbol: 'AAPL', side: 'SELL', entry: 226.50, tp: 220.00, sl: 229.00, qty: '100 SHARES', pnl: '$0.00', status: 'VETOED', court: 'VETO_LHDS_HIGH', time: '07:12:45' }
    ];
  }

  mount(container, context) {
    this._container = container;
    this.render();
    return { dispose: () => this.dispose() };
  }

  render() {
    if (!this._container || this._disposed) return;

    this._container.innerHTML = `
      <div style="padding: 16px; font-family: monospace; background: #070c18; color: #f8fafc; border-radius: 8px; font-size: 11px; border: 1px solid #1e293b; height: 100%; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Header & Stats Summary -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #38bdf8; font-weight: bold; display: flex; align-items: center; gap: 8px;">
              <span>📋 INSTITUTIONAL TRADE LOG & AUDIT</span>
              <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3);">REALTIME AUDITED</span>
            </h3>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">Complete Execution Chain, PnL Tracking & Constitutional Court Audits</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 6px 12px; text-align: center;">
              <div style="color: #94a3b8; font-size: 9px;">WIN RATE</div>
              <div style="color: #34d399; font-size: 14px; font-weight: bold;">68.4%</div>
            </div>
            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 6px 12px; text-align: center;">
              <div style="color: #94a3b8; font-size: 9px;">PROFIT FACTOR</div>
              <div style="color: #facc15; font-size: 14px; font-weight: bold;">2.42</div>
            </div>
            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 6px 12px; text-align: center;">
              <div style="color: #94a3b8; font-size: 9px;">NET PNL</div>
              <div style="color: #34d399; font-size: 14px; font-weight: bold;">+$18,450.00</div>
            </div>
          </div>
        </div>

        <!-- Trades Table -->
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px solid #334155; color: #94a3b8; text-transform: uppercase; font-size: 10px;">
                <th style="padding: 8px;">Time</th>
                <th style="padding: 8px;">Trade ID</th>
                <th style="padding: 8px;">Asset</th>
                <th style="padding: 8px;">Side</th>
                <th style="padding: 8px;">Entry</th>
                <th style="padding: 8px;">TP / SL</th>
                <th style="padding: 8px;">PnL</th>
                <th style="padding: 8px;">Status</th>
                <th style="padding: 8px;">Court Audit</th>
                <th style="padding: 8px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${this._trades.map(t => {
                const sideColor = t.side === 'BUY' ? '#10b981' : '#ef4444';
                const pnlColor = t.pnl.startsWith('+') ? '#34d399' : (t.pnl.startsWith('-') ? '#f87171' : '#94a3b8');
                return `
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 8px; color: #94a3b8;">${t.time}</td>
                    <td style="padding: 8px; color: #cbd5e1; font-weight: bold;">${t.id}</td>
                    <td style="padding: 8px; font-weight: bold; color: #f8fafc;">${t.symbol}</td>
                    <td style="padding: 8px; color: ${sideColor}; font-weight: bold;">${t.side}</td>
                    <td style="padding: 8px; color: #38bdf8;">${t.entry}</td>
                    <td style="padding: 8px;">
                      <span style="color: #34d399;">TP: ${t.tp}</span> | <span style="color: #f87171;">SL: ${t.sl}</span>
                    </td>
                    <td style="padding: 8px; color: ${pnlColor}; font-weight: bold;">${t.pnl}</td>
                    <td style="padding: 8px;">
                      <span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #cbd5e1;">${t.status}</span>
                    </td>
                    <td style="padding: 8px;">
                      <span style="color: ${t.court.includes('ALLOW') ? '#34d399' : '#f87171'};">${t.court}</span>
                    </td>
                    <td style="padding: 8px; text-align: center;">
                      <button class="plot-btn" data-id="${t.id}" style="background: #38bdf8; color: #020617; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-family: monospace; cursor: pointer;">
                        📈 Plot Chart
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this._container.querySelectorAll('.plot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const trade = this._trades.find(t => t.id === id);
        if (trade) {
          // Emit global plot trade event
          window.dispatchEvent(new CustomEvent('lyzer:plot-trade', {
            detail: {
              symbol: trade.symbol,
              entry: trade.entry,
              tp: trade.tp,
              sl: trade.sl,
              side: trade.side,
              title: trade.id
            }
          }));

          // Trigger tab switch to chart
          window.dispatchEvent(new CustomEvent('lyzer:switch-dock-tab', {
            detail: { tabId: 'chart-host-widget' }
          }));
        }
      });
    });
  }

  dispose() {
    this._disposed = true;
    if (this._container) {
      this._container.innerHTML = '';
    }
  }
}
