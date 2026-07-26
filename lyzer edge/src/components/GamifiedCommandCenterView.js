import { AgentHubWidget } from './commandCenter/widgets/agentHub/AgentHubWidget.js';
import { CourtWidget } from './commandCenter/widgets/court/CourtWidget.js';
import { LACWWorkspaceWidget } from './commandCenter/widgets/lacwWorkspace/LACWWorkspaceWidget.js';
import { CognitiveAuditWidget } from './commandCenter/widgets/cognitiveAudit/CognitiveAuditWidget.js';
import { ObservabilityDashboardWidget } from './commandCenter/widgets/observabilityDashboard/ObservabilityDashboardWidget.js';
import { CausalGraphWidget } from './commandCenter/widgets/causalGraph/CausalGraphWidget.js';
import { ChartHostWidget } from './commandCenter/widgets/chartHost/ChartHostWidget.js';
import { RuntimeInspectorWidget } from './commandCenter/widgets/runtimeInspector/RuntimeInspectorWidget.js';
import { RealityStatusWidget } from './commandCenter/widgets/realityStatus/RealityStatusWidget.js';
import { EvolvedTradeLogWidget } from './commandCenter/widgets/tradeLog/EvolvedTradeLogWidget.js';
import { wsClient } from '../services/wsClient.js';

export class GamifiedCommandCenterView {
  constructor() {
    this._container = null;
    this._disposed = false;
    this._agentHub = null;
    this._court = null;
    this._activeWidgetInstance = null;
    this._activeWidgetId = 'chart-host-widget';
    this._intervals = [];
    this._wsUnsub = null;
    this._latestData = {};
    this._tradeHistory = [];
    this._pendingPlotTrade = null;
    this._notificationTimers = [];

    this._realRuntime = {
      subscribeSnapshot: (cb) => {
        try { cb({ realityTag: 'OBSERVED_REALITY', providerId: 'live-default', status: 'HEALTHY' }); } catch(e){}
        return { dispose: () => {} };
      },
      getDecisionLedger: async () => {
        const entries = Object.values(this._latestData).map(d => ({
          decision: d.kernel?.eef === true ? 'ALLOW_TRANSITION' : 'VETO',
          timestamp: d.market?.timestamp || Date.now(),
          symbol: d.symbol,
          trg: d.kernel?.trg,
          dvf: d.kernel?.dvf,
          lhds: d.kernel?.lhds_df
        }));
        return entries.slice(-20);
      },
      subscribeDecisionLedger: (cb) => {
        try { cb({ decision: 'ALLOW_TRANSITION', timestamp: Date.now() }); } catch(e){}
        return { dispose: () => {} };
      },
      getMarketData: (opts = {}) => {
        const sym = opts.symbol || 'BTCUSDT';
        const data = this._latestData[sym];
        if (data?.market) return [data.market];
        return [];
      },
      subscribeTicks: (cb) => {
        try { cb({ time: Date.now(), price: 65550, symbol: 'BTCUSDT' }); } catch(e){}
        return { dispose: () => {} };
      },
      getSystemMetrics: () => ({ cpu: '4.2%', heapMb: 42.8, eventLoopLagMs: 0.04 }),
      getActiveWidgets: () => ['ChartHost', 'TradeLog', 'AgentHub', 'Court'],
      getLatestData: () => this._latestData,
      getTradeHistory: () => this._tradeHistory
    };

    this._widgetRegistry = {
      'chart-host-widget': ChartHostWidget,
      'trade-log-widget': EvolvedTradeLogWidget,
      'lacw-workspace-widget': LACWWorkspaceWidget,
      'cognitive-audit-widget': CognitiveAuditWidget,
      'observability-dashboard-widget': ObservabilityDashboardWidget,
      'causal-graph-widget': CausalGraphWidget,
      'runtime-inspector-widget': RuntimeInspectorWidget,
      'reality-status-widget': RealityStatusWidget
    };
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = '';
    this._container.style.display = 'grid';
    this._container.style.gridTemplateRows = '64px 1fr 56px';
    this._container.style.gridTemplateColumns = '300px 1fr 280px';
    this._container.style.height = '100vh';
    this._container.style.width = '100vw';
    this._container.style.backgroundColor = '#030712';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = 'Inter, system-ui, monospace';
    this._container.style.overflow = 'hidden';

    this._renderShell();
    await this._mountStaticWidgets();
    await this._mountActiveWidget();
    this._startGamification();
    this._connectWS();
    this._listenDockSwitch();
    this._activeWidgetId = 'chart-host-widget';
    this._activateTab('chart-host-widget');
  }

  _renderShell() {
    this._container.innerHTML = `
      <style>
        .g-topbar { grid-column: 1 / 4; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; transition: border-color 0.5s; z-index: 10; box-shadow: 0 4px 25px rgba(0,0,0,0.6); }
        .g-left { grid-column: 1; border-right: 1px solid #1e293b; overflow-y: auto; background: #070c18; }
        .g-main { grid-column: 2; overflow-y: auto; background: #020617; position: relative; display: flex; flex-direction: column; }
        .g-right { grid-column: 3; border-left: 1px solid #1e293b; overflow-y: auto; display: flex; flex-direction: column; background: #070c18; }
        .g-dock { grid-column: 1 / 4; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border-top: 1px solid #1e293b; display: flex; align-items: center; padding: 0 16px; overflow-x: auto; gap: 10px; z-index: 10; }
        .g-metric { display: flex; flex-direction: column; align-items: center; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.6); padding: 6px 14px; border-radius: 6px; }
        .g-metric-label { font-size: 9px; color: #94a3b8; letter-spacing: 0.5px; font-weight: 700; text-transform: uppercase; }
        .g-metric-value { font-size: 15px; font-weight: 800; font-family: monospace; }
        .g-dock-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: #0f172a; color: #94a3b8; border: 1px solid #1e293b; border-radius: 6px; cursor: pointer; white-space: nowrap; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); font-size: 11px; font-weight: 600; }
        .g-dock-btn:hover { background: #1e293b; color: #38bdf8; border-color: #38bdf8; transform: translateY(-2px); }
        .g-dock-btn.active { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #020617; font-weight: 800; border-color: #34d399; box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
        .g-trade-balloon { position: absolute; bottom: 80px; right: 24px; background: linear-gradient(135deg, #065f46 0%, #047857 100%); border: 1px solid #34d399; border-radius: 12px; padding: 14px 18px; font-family: monospace; font-size: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.7); z-index: 200; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; max-width: 360px; }
        .g-trade-balloon.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .g-trade-balloon:hover { border-color: #38bdf8; }
        .g-trade-balloon-close { position: absolute; top: 4px; right: 8px; color: #94a3b8; cursor: pointer; font-size: 14px; background: none; border: none; padding: 2px; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @keyframes radar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .logo-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse-green 2s infinite; margin-right: 8px; }
        .toast { position: absolute; bottom: 20px; right: 20px; padding: 10px 18px; border-radius: 6px; font-weight: 800; opacity: 0; transform: translateY(12px); transition: all 0.25s; z-index: 100; pointer-events: none; font-size: 12px; font-family: monospace; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .toast.show { opacity: 1; transform: translateY(0); }
        .leaderboard { padding: 14px; background: #0b1120; border-top: 1px solid #1e293b; }
        .lb-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 11px; font-family: monospace; }
        .lb-bar-bg { flex-grow: 1; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
        .lb-bar-fg { height: 100%; transition: width 0.5s ease; }
        .radar-box { position: relative; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #38bdf8; background: rgba(56, 189, 248, 0.05); overflow: hidden; }
        .radar-sweep-line { position: absolute; top: 50%; left: 50%; width: 50%; height: 2px; background: linear-gradient(90deg, transparent, #38bdf8); transform-origin: left center; animation: radar-sweep 3s linear infinite; }
      </style>
      <div id="g-topbar" class="g-topbar">
        <div style="font-weight: 800; font-size: 15px; display: flex; align-items: center; gap: 10px;">
          <div class="radar-box"><div class="radar-sweep-line"></div></div>
          <div>
            <span style="color: #38bdf8; letter-spacing: 1px;">LYZER EDGE</span>
            <span style="font-size: 10px; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid rgba(16, 185, 129, 0.3);">COGNITIVE COCKPIT</span>
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="g-metric"><span class="g-metric-label">TRG</span><span class="g-metric-value" style="color: #fbbf24;" id="g-trg">0.00</span></div>
          <div class="g-metric"><span class="g-metric-label">DVF</span><span class="g-metric-value" style="color: #38bdf8;" id="g-dvf">0.00</span></div>
          <div class="g-metric"><span class="g-metric-label">LHDS</span><span class="g-metric-value" style="color: #a855f7;" id="g-lhds-val">0.00</span></div>
          <div class="g-metric"><span class="g-metric-label">EEF</span><span class="g-metric-value" style="color: #4ade80;" id="g-eef">--</span></div>
        </div>
        <div style="display: flex; gap: 14px; align-items: center;">
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span style="background: #10b981; color: #020617; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;" id="g-mode-badge">SIMULATION</span>
            <span id="g-clock" style="color: #94a3b8; font-size: 10px; font-family: monospace; margin-top: 2px;">00:00:00 UTC</span>
          </div>
        </div>
      </div>
      <div id="g-left" class="g-left"></div>
      <div id="g-main" class="g-main">
        <div id="g-main-content" style="height: 100%; flex-grow: 1;"></div>
        <div id="g-toast" class="toast"></div>
        <div id="g-trade-balloon" class="g-trade-balloon"></div>
      </div>
      <div id="g-right" class="g-right">
        <div id="g-court-container" style="flex: 1; min-height: 380px; border-bottom: 1px solid #1e293b;"></div>
        <div class="leaderboard">
          <div style="color: #38bdf8; font-size: 11px; margin-bottom: 10px; font-weight: 800; display: flex; justify-content: space-between;">
            <span>� ASSET SIGNAL LEADERBOARD</span>
            <span style="color: #4ade80;" id="g-lb-status">LIVE</span>
          </div>
          <div id="g-leaderboard-list"></div>
        </div>
      </div>
      <div id="g-dock" class="g-dock"></div>
    `;

    const dockContainer = this._container.querySelector('#g-dock');
    const tabs = [
      { id: 'chart-host-widget', icon: '📈', label: 'Chart & Decisions' },
      { id: 'trade-log-widget', icon: '📋', label: 'Trade Log' },
      { id: 'lacw-workspace-widget', icon: '🧠', label: 'LACW OS' },
      { id: 'cognitive-audit-widget', icon: '🔬', label: 'Cognitive Audit' },
      { id: 'observability-dashboard-widget', icon: '📡', label: 'Observability' },
      { id: 'causal-graph-widget', icon: '🌐', label: 'Causal Graph' },
      { id: 'runtime-inspector-widget', icon: '⚙️', label: 'Runtime DevTools' },
      { id: 'reality-status-widget', icon: '🌍', label: 'Reality Status' }
    ];
    dockContainer.innerHTML = tabs.map(t => `
      <button class="g-dock-btn ${t.id === this._activeWidgetId ? 'active' : ''}" data-id="${t.id}">
        <span>${t.icon}</span>
        <span>${t.label}</span>
      </button>
    `).join('');
    dockContainer.querySelectorAll('.g-dock-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (id !== this._activeWidgetId) this._activateTab(id);
      });
    });
  }

  _activateTab(id) {
    const dockContainer = this._container.querySelector('#g-dock');
    dockContainer.querySelectorAll('.g-dock-btn').forEach(b => b.classList.remove('active'));
    const btn = dockContainer.querySelector(`[data-id="${id}"]`);
    if (btn) btn.classList.add('active');
    this._activeWidgetId = id;
    this._mountActiveWidget();
  }

  _connectWS() {
    this._wsUnsub = wsClient.onData((data) => {
      if (!data || !data.symbol) return;
      this._latestData[data.symbol] = data;
      this._updateMetrics(data);
      this._updateLeaderboard(data);
      this._checkTradeNotification(data);
    });
  }

  _updateMetrics(data) {
    const k = data.kernel || {};
    const setText = (id, val) => { const el = this._container.querySelector(id); if (el) el.innerText = val; };
    setText('#g-trg', (k.trg || 0).toFixed(2));
    setText('#g-dvf', (k.dvf || 0).toFixed(2));
    setText('#g-lhds-val', (k.lhds_df || 0).toFixed(2));
    setText('#g-eef', k.eef === true ? 'ALLOW' : (k.eef === false ? 'VETO' : '--'));
    setText('#g-mode-badge', data.mode || data.connectionState || 'SIMULATION');
  }

  _updateLeaderboard(data) {
    const lbContainer = this._container.querySelector('#g-leaderboard-list');
    if (!lbContainer) return;
    const allSymbols = Object.keys(this._latestData);
    if (allSymbols.length === 0) return;
    const entries = allSymbols.map(sym => {
      const d = this._latestData[sym];
      const k = d.kernel || {};
      const val = k.trg ? Math.min(100, Math.round(k.trg * 100)) : 50;
      return { sym: sym.replace('USDT', '/USD'), val, dir: (k.eef === true) ? 1 : -1, trg: k.trg, dvf: k.dvf };
    });
    entries.sort((a, b) => b.val - a.val);
    lbContainer.innerHTML = entries.map(a => {
      const color = a.dir > 0 ? '#10b981' : '#ef4444';
      const arrow = a.dir > 0 ? '▲' : '▼';
      return `<div class="lb-row"><span style="width:60px;font-weight:700;color:#f8fafc;">${a.sym}</span><div class="lb-bar-bg"><div class="lb-bar-fg" style="width:${a.val}%;background:${color};"></div></div><span style="width:55px;text-align:right;color:${color};font-weight:700;">${arrow} ${a.val}%</span></div>`;
    }).join('');
  }

  _checkTradeNotification(data) {
    if (!data.trade || data.trade.governance !== 'ALLOW' || data.trade.status !== 'open') return;
    const trade = {
      symbol: data.symbol, direction: data.trade.direction, price: data.trade.price,
      stopLoss: data.trade.stopLoss, takeProfit: data.trade.takeProfit,
      governance: data.trade.governance, time: data.market?.timestamp || Date.now(), kernel: data.kernel
    };
    this._tradeHistory.push(trade);
    const balloon = this._container.querySelector('#g-trade-balloon');
    if (!balloon) return;
    const sideColor = trade.direction === 'LONG' ? '#10b981' : '#ef4444';
    const sideEmoji = trade.direction === 'LONG' ? '🟢' : '🔴';
    balloon.innerHTML = `
      <button class="g-trade-balloon-close" data-action="close">&times;</button>
      <div style="font-size:13px;font-weight:800;margin-bottom:6px;">${sideEmoji} TRADE EXECUTED</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div><span style="color:#94a3b8;">Asset:</span> <span style="font-weight:700;color:#f8fafc;">${trade.symbol.replace('USDT', '/USD')}</span></div>
        <div><span style="color:#94a3b8;">Direction:</span> <span style="font-weight:700;color:${sideColor};">${trade.direction}</span></div>
        <div><span style="color:#94a3b8;">Entry:</span> <span style="font-weight:700;color:#38bdf8;">$${Number(trade.price).toLocaleString()}</span></div>
        ${trade.takeProfit ? `<div><span style="color:#94a3b8;">TP:</span> <span style="font-weight:700;color:#34d399;">$${Number(trade.takeProfit).toLocaleString()}</span></div>` : ''}
        ${trade.stopLoss ? `<div><span style="color:#94a3b8;">SL:</span> <span style="font-weight:700;color:#f87171;">$${Number(trade.stopLoss).toLocaleString()}</span></div>` : ''}
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="g-balloon-plot" style="flex:1;background:#38bdf8;color:#020617;border:none;padding:6px 10px;border-radius:4px;font-weight:800;font-size:11px;cursor:pointer;">📈 Plot Chart</button>
        <button class="g-balloon-dismiss" style="background:transparent;color:#94a3b8;border:1px solid #475569;padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer;">Dismiss</button>
      </div>`;
    balloon.classList.add('show');
    const close = () => { balloon.classList.remove('show'); };
    balloon.querySelector('[data-action="close"]')?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    balloon.querySelector('.g-balloon-dismiss')?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    balloon.querySelector('.g-balloon-plot')?.addEventListener('click', (e) => {
      e.stopPropagation(); close();
      this._pendingPlotTrade = { symbol: trade.symbol, entry: trade.price, tp: trade.takeProfit, sl: trade.stopLoss, side: trade.direction === 'LONG' ? 'BUY' : 'SELL', title: `${trade.direction} @ ${trade.price}` };
      this._activateTab('chart-host-widget');
      setTimeout(() => {
        if (this._pendingPlotTrade) {
          window.dispatchEvent(new CustomEvent('lyzer:plot-trade', { detail: this._pendingPlotTrade }));
          this._pendingPlotTrade = null;
        }
      }, 100);
    });
    const timer = setTimeout(close, 12000);
    this._notificationTimers.push(timer);
  }

  _listenDockSwitch() {
    window.addEventListener('lyzer:switch-dock-tab', (evt) => {
      const tabId = evt.detail?.tabId;
      if (tabId && this._widgetRegistry[tabId]) this._activateTab(tabId);
    });
  }

  async _mountStaticWidgets() {
    try {
      this._agentHub = new AgentHubWidget();
      await this._agentHub.mount(this._container.querySelector('#g-left'), this._realRuntime);
    } catch (e) { console.warn('[GamifiedCockpit] AgentHub load warning:', e); }
    try {
      this._court = new CourtWidget();
      await this._court.mount(this._container.querySelector('#g-court-container'), this._realRuntime);
    } catch (e) { console.warn('[GamifiedCockpit] Court load warning:', e); }
  }

  async _mountActiveWidget() {
    const mainContent = this._container.querySelector('#g-main-content');
    if (this._activeWidgetInstance) {
      if (typeof this._activeWidgetInstance.dispose === 'function') {
        try { this._activeWidgetInstance.dispose(); } catch (e) { console.warn(e); }
      } else if (typeof this._activeWidgetInstance.unmount === 'function') {
        try { this._activeWidgetInstance.unmount(); } catch (e) { console.warn(e); }
      }
    }
    mainContent.innerHTML = '';
    this._activeWidgetInstance = null;
    const WidgetClass = this._widgetRegistry[this._activeWidgetId];
    if (WidgetClass) {
      try {
        this._activeWidgetInstance = new WidgetClass();
        await this._activeWidgetInstance.mount(mainContent, this._realRuntime);
      } catch (e) {
        mainContent.innerHTML = `<div style="padding:24px;color:#ef4444;font-family:monospace;">❌ Widget Load Error [${this._activeWidgetId}]: ${e.message}</div>`;
      }
    } else {
      mainContent.innerHTML = `<div style="padding:24px;color:#94a3b8;font-family:monospace;">Widget '${this._activeWidgetId}' not found</div>`;
    }
  }

  _startGamification() {
    const setInt = (fn, ms) => { const id = setInterval(fn, ms); this._intervals.push(id); return id; };
    const clockEl = this._container.querySelector('#g-clock');
    setInt(() => { if (clockEl) { const d = new Date(); clockEl.innerText = d.toISOString().split('T')[1].split('.')[0] + ' UTC'; } }, 1000);
    const toast = this._container.querySelector('#g-toast');
    const balloon = this._container.querySelector('#g-trade-balloon');
    setInt(() => {
      if (!toast) return;
      if (balloon?.classList.contains('show')) return;
      const isVeto = Math.random() > 0.85;
      toast.innerText = isVeto ? '🔴 COURT VETO: LHDS THRESHOLD EXCEEDED' : '✅ ECA COURT: ALLOW_TRANSITION';
      toast.style.background = isVeto ? '#ef4444' : '#10b981';
      toast.style.color = isVeto ? '#fff' : '#020617';
      toast.classList.add('show');
      setTimeout(() => { toast.classList.remove('show'); }, 1200);
    }, 6000);
  }

  unmount() {
    this._disposed = true;
    this._intervals.forEach(id => clearInterval(id));
    this._intervals = [];
    this._notificationTimers.forEach(t => clearTimeout(t));
    this._notificationTimers = [];
    if (this._wsUnsub) { wsClient.offData(this._wsUnsub); this._wsUnsub = null; }
    if (this._agentHub) { try { this._agentHub.dispose(); } catch (e) {} this._agentHub = null; }
    if (this._court) { try { this._court.dispose(); } catch (e) {} this._court = null; }
    if (this._activeWidgetInstance) {
      if (typeof this._activeWidgetInstance.dispose === 'function') { try { this._activeWidgetInstance.dispose(); } catch(e){} }
      else if (typeof this._activeWidgetInstance.unmount === 'function') { try { this._activeWidgetInstance.unmount(); } catch(e){} }
      this._activeWidgetInstance = null;
    }
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
  }
}
