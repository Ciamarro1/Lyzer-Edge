import { edgeDashboardManifest } from './manifest.js';
import { getAllTrades } from '../../../../db/queries.js';
import { calcAllStats } from '../../../../engine/stats.js';

export class EdgeDashboardWidget {
  constructor() {
    this.manifest = edgeDashboardManifest;
    this._container = null;
    this._runtime = null;
    this._disposed = false;
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.overflowY = 'auto';
    this._container.style.padding = '20px';
    this._container.style.background = 'rgba(4, 6, 14, 0.95)';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

    this._injectStyles();
    await this._render();
  }

  _injectStyles() {
    if (document.getElementById('edge-dashboard-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'edge-dashboard-widget-styles';
    style.textContent = `
      .ed-container { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
      .ed-header { display: flex; justify-content: space-between; align-items: center; background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 16px; padding: 18px 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.15); }
      .ed-title { font-size: 16px; font-weight: 800; color: #f8fafc; font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; gap: 10px; }
      .ed-sub { font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
      .ed-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
      .ed-kpi-card { background: rgba(10, 16, 32, 0.45); backdrop-filter: blur(28px) saturate(1.8); border: 1px solid rgba(0, 243, 255, 0.18); border-radius: 14px; padding: 16px 18px; position: relative; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.15); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .ed-kpi-card:hover { transform: translateY(-3px) scale(1.02); border-color: #00f3ff; box-shadow: 0 20px 45px rgba(0,0,0,0.7), 0 0 25px rgba(0, 243, 255, 0.25), inset 0 1px 1px rgba(255,255,255,0.25); }
      .ed-kpi-card::before { content: ''; position: absolute; inset: 0; border-radius: 14px; padding: 1px; background: linear-gradient(135deg, rgba(0,243,255,0.3), rgba(0,255,157,0.2), transparent); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
      .ed-kpi-lbl { font-size: 9px; font-weight: 800; color: rgba(148, 163, 184, 0.7); text-transform: uppercase; letter-spacing: 1.2px; font-family: 'Inter', system-ui, sans-serif; }
      .ed-kpi-val { font-size: 22px; font-weight: 800; font-family: 'JetBrains Mono', monospace; margin-top: 4px; filter: drop-shadow(0 0 8px currentColor); }
      .ed-section-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
      .ed-panel { background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); border: 1px solid rgba(0, 243, 255, 0.18); border-radius: 16px; padding: 22px; box-shadow: 0 20px 50px rgba(0,0,0,0.65), 0 0 25px rgba(0, 243, 255, 0.08), inset 0 1px 1px rgba(255,255,255,0.15); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .ed-panel:hover { border-color: rgba(0, 243, 255, 0.35); box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(0, 243, 255, 0.15); }
      .ed-panel-title { font-size: 11px; font-weight: 800; color: #00f3ff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 18px; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: space-between; align-items: center; }
      .ed-table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
      .ed-table th { text-align: left; padding: 8px 12px; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(56,189,248,0.1); }
      .ed-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.02); color: #f1f5f9; }
      .ed-table tr:hover td { background: rgba(56, 189, 248, 0.04); }
      .ed-bar-bg { width: 80px; height: 5px; background: rgba(30, 41, 59, 0.6); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 8px; }
      .ed-bar-fg { height: 100%; border-radius: 3px; }
    `;
    document.head.appendChild(style);
  }

  async _render() {
    let trades = [];
    try {
      trades = await getAllTrades();
    } catch(e) {}
    
    let closedTrades = (trades || []).filter(t => t && (t.status === 'closed' || t.status === 'CLOSED'));
    const hasTrades = closedTrades.length > 0;
    const overallStats = calcAllStats(closedTrades);

    const winRateStr = hasTrades && typeof overallStats.winRate === 'number' ? `${overallStats.winRate.toFixed(1)}%` : '--';
    const totalPnlStr = hasTrades && typeof overallStats.totalPnl === 'number' ? `$${overallStats.totalPnl.toFixed(2)}` : '$0.00';
    const expectancyStr = hasTrades && typeof overallStats.expectancy === 'number' ? `$${overallStats.expectancy.toFixed(2)} / trade` : '--';
    const profitFactorStr = hasTrades && overallStats.profitFactor !== undefined ? (overallStats.profitFactor === Infinity ? '∞' : Number(overallStats.profitFactor || 0).toFixed(2)) : '--';
    const avgRStr = hasTrades && typeof overallStats.avgRMultiple === 'number' ? `${overallStats.avgRMultiple.toFixed(2)}R` : '--';

    const sharpeStr = hasTrades && typeof overallStats.sharpeRatio === 'number' ? overallStats.sharpeRatio.toFixed(2) : '--';
    const sortinoStr = hasTrades && typeof overallStats.sortinoRatio === 'number' ? overallStats.sortinoRatio.toFixed(2) : '--';
    const sqnStr = hasTrades && overallStats.sqn !== undefined ? String(overallStats.sqn) : '--';
    const kellyStr = hasTrades && typeof overallStats.kellyFraction === 'number' ? `${(overallStats.kellyFraction * 100).toFixed(1)}%` : '--';
    
    const ddAmount = overallStats.maxDrawdown?.maxDrawdownAmount ?? overallStats.maxDrawdown?.amount;
    const ddPct = overallStats.maxDrawdown?.maxDrawdown ?? overallStats.maxDrawdown?.percentage;
    const maxDdStr = hasTrades && typeof ddAmount === 'number' && typeof ddPct === 'number'
      ? `$${ddAmount.toFixed(2)} (${ddPct.toFixed(1)}%)`
      : '--';

    const varStr = hasTrades && overallStats.varAndCvar && typeof overallStats.varAndCvar.var95 === 'number' && typeof overallStats.varAndCvar.cvar95 === 'number'
      ? `$${overallStats.varAndCvar.var95} / $${overallStats.varAndCvar.cvar95}`
      : '--';

    const ciStr = hasTrades && overallStats.confidenceInterval && typeof overallStats.confidenceInterval.minWinRate === 'number'
      ? `[${overallStats.confidenceInterval.minWinRate}% - ${overallStats.confidenceInterval.maxWinRate}%]`
      : '--';

    this._container.innerHTML = `
      <div class="ed-container">
        <!-- Header -->
        <div class="ed-header">
          <div>
            <div class="ed-title">
              EDGE EXPLORER & QUANT DASHBOARD
            </div>
            <div class="ed-sub">Statistical edge analysis, expectancy, and multi-symbol attribution metrics</div>
          </div>
          <span style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 800; font-family: 'JetBrains Mono', monospace;">LIVE EDGE VERIFIED</span>
        </div>

        <!-- Top KPI Cards -->
        <div class="ed-kpi-grid">
          <div class="ed-kpi-card">
            <div class="ed-kpi-lbl">Total Closed Trades</div>
            <div class="ed-kpi-val" style="color: #38bdf8;">${overallStats.totalTrades ?? closedTrades.length}</div>
          </div>
          <div class="ed-kpi-card">
            <div class="ed-kpi-lbl">Win Rate</div>
            <div class="ed-kpi-val" style="color: ${(overallStats.winRate || 0) >= 50 ? '#34d399' : '#ef4444'};">${winRateStr}</div>
          </div>
          <div class="ed-kpi-card">
            <div class="ed-kpi-lbl">Net Realized PnL</div>
            <div class="ed-kpi-val" style="color: ${(overallStats.totalPnl || 0) >= 0 ? '#34d399' : '#ef4444'};">${totalPnlStr}</div>
          </div>
          <div class="ed-kpi-card">
            <div class="ed-kpi-lbl">Expectancy</div>
            <div class="ed-kpi-val" style="color: #fbbf24;">${expectancyStr}</div>
          </div>
          <div class="ed-kpi-card">
            <div class="ed-kpi-lbl">Profit Factor</div>
            <div class="ed-kpi-val" style="color: #c084fc;">${profitFactorStr}</div>
          </div>
          <div class="ed-kpi-card">
            <div class="ed-kpi-lbl">Avg R-Multiple</div>
            <div class="ed-kpi-val" style="color: #22d3ee;">${avgRStr}</div>
          </div>
        </div>

        <!-- Section Grid -->
        <div class="ed-section-grid">
          <!-- Symbol Performance Panel -->
          <div class="ed-panel">
            <div class="ed-panel-title">
              <span>Performance Attribution by Symbol</span>
              <span style="color: #94a3b8; font-size: 9px;">${Object.keys(this._groupBySymbol(closedTrades)).length} Assets Tracked</span>
            </div>
            <table class="ed-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Trades</th>
                  <th>Win Rate %</th>
                  <th>Net PnL ($)</th>
                  <th>Profit Factor</th>
                  <th>Avg R</th>
                </tr>
              </thead>
              <tbody>
                ${this._renderSymbolRows(closedTrades)}
              </tbody>
            </table>
          </div>

          <!-- Direction & Risk/Reward Breakdown -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <!-- Direction Panel -->
            <div class="ed-panel">
              <div class="ed-panel-title">
                <span>Directional Bias (Long vs Short)</span>
              </div>
              ${this._renderDirectionBreakdown(closedTrades)}
            </div>

            <!-- Expectancy & Institutional Risk Stats Panel -->
            <div class="ed-panel">
              <div class="ed-panel-title">
                <span>Institutional Risk & Robustness</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span style="color: #94a3b8;">95% Win Rate CI:</span>
                  <span style="color: #34d399; font-weight: 700;">${ciStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span style="color: #94a3b8;">Sharpe Ratio:</span>
                  <span style="color: #00f3ff; font-weight: 700;">${sharpeStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span style="color: #94a3b8;">Sortino Ratio:</span>
                  <span style="color: #00ff9d; font-weight: 700;">${sortinoStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span style="color: #94a3b8;">System Quality (SQN):</span>
                  <span style="color: #ffb700; font-weight: 700;">${sqnStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span style="color: #94a3b8;">Kelly Fraction:</span>
                  <span style="color: #b026ff; font-weight: 700;">${kellyStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span style="color: #94a3b8;">Max Drawdown:</span>
                  <span style="color: #ff3366; font-weight: 700;">${maxDdStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span style="color: #94a3b8;">VaR / CVaR (95%):</span>
                  <span style="color: #ff3366; font-weight: 700;">${varStr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _groupBySymbol(trades) {
    const map = {};
    for (const t of (trades || [])) {
      if (!t) continue;
      const sym = t.symbol || 'BTCUSDT';
      if (!map[sym]) map[sym] = [];
      map[sym].push(t);
    }
    return map;
  }

  _renderSymbolRows(trades) {
    const grouped = this._groupBySymbol(trades);
    const entries = Object.entries(grouped);
    if (entries.length === 0) {
      return `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">Nenhum trade fechado registrado. Aguardando execuções do sistema...</td></tr>`;
    }
    return entries.map(([sym, symTrades]) => {
      const s = calcAllStats(symTrades);
      const winRate = typeof s.winRate === 'number' ? s.winRate : 0;
      const pnl = typeof s.totalPnl === 'number' ? s.totalPnl : 0;
      const pf = s.profitFactor === Infinity ? '∞' : Number(s.profitFactor || 0).toFixed(2);
      const isPos = pnl >= 0;
      const barColor = isPos ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)';
      return `
        <tr>
          <td style="font-weight: 800; color: #f8fafc;">${sym.replace('USDT', '/USD')}</td>
          <td>${symTrades.length}</td>
          <td>
            <div class="ed-bar-bg"><div class="ed-bar-fg" style="width: ${Math.min(100, winRate)}%; background: ${barColor};"></div></div>
            <span style="color: ${winRate >= 50 ? '#34d399' : '#ef4444'}; font-weight: 700;">${winRate.toFixed(1)}%</span>
          </td>
          <td style="color: ${isPos ? '#34d399' : '#ef4444'}; font-weight: 700;">$${pnl.toFixed(2)}</td>
          <td>${pf}</td>
          <td style="color: #fbbf24;">${Number(s.avgRMultiple || 0).toFixed(2)}R</td>
        </tr>
      `;
    }).join('');
  }

  _renderDirectionBreakdown(trades) {
    const longs = (trades || []).filter(t => (t.direction || '').toLowerCase() === 'long');
    const shorts = (trades || []).filter(t => (t.direction || '').toLowerCase() === 'short');
    const longStats = calcAllStats(longs);
    const shortStats = calcAllStats(shorts);

    const longWinRateStr = longs.length > 0 && typeof longStats.winRate === 'number' ? `${longStats.winRate.toFixed(1)}%` : '--';
    const longPnlStr = longs.length > 0 && typeof longStats.totalPnl === 'number' ? `$${longStats.totalPnl.toFixed(2)}` : '$0.00';
    const shortWinRateStr = shorts.length > 0 && typeof shortStats.winRate === 'number' ? `${shortStats.winRate.toFixed(1)}%` : '--';
    const shortPnlStr = shorts.length > 0 && typeof shortStats.totalPnl === 'number' ? `$${shortStats.totalPnl.toFixed(2)}` : '$0.00';

    return `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: #34d399;">LONG TRADES</span>
            <span style="font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${longs.length} Executions</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: 'JetBrains Mono', monospace;">
            <span>Win Rate: <strong style="color: #34d399;">${longWinRateStr}</strong></span>
            <span>Net PnL: <strong style="color: ${(longStats.totalPnl || 0) >= 0 ? '#34d399' : '#ef4444'};">${longPnlStr}</strong></span>
          </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: #f87171;">SHORT TRADES</span>
            <span style="font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${shorts.length} Executions</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: 'JetBrains Mono', monospace;">
            <span>Win Rate: <strong style="color: #34d399;">${shortWinRateStr}</strong></span>
            <span>Net PnL: <strong style="color: ${(shortStats.totalPnl || 0) >= 0 ? '#34d399' : '#ef4444'};">${shortPnlStr}</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  dispose() {
    this._disposed = true;
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
    this._runtime = null;
  }

  unmount() { this.dispose(); }
}
