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
      getTradeHistory: () => this._tradeHistory,
      getRealityStatus: () => {
        const data = Object.values(this._latestData)[0];
        const k = data?.kernel || {};
        const eefOk = k.eef === true;
        return {
          providerId: 'live-default',
          realityTag: 'OBSERVED_REALITY',
          healthStatus: data ? 'HEALTHY' : 'STANDBY',
          latencyMs: data?.market?.timestamp ? Math.floor((Date.now() - data.market.timestamp) / 10) : 42
        };
      },
      getPerformanceMetrics: () => ({
        fps: 60, avgFrameTimeMs: 16.67, p95FrameTimeMs: 16.67, p99FrameTimeMs: 16.67,
        heapUsedMB: 42.8, providerLatencyMs: 42,
        mountedWidgetsCount: 4, unmountedWidgetsCount: 0,
        activeListenersCount: 6, pendingDisposablesCount: 0,
        ringBufferOccupancy: 0, streamBufferBacklog: 0, droppedEventsCount: 0
      }),
      subscribePerformanceMetrics: (cb) => {
        const id = setInterval(() => {
          try { cb(this.getPerformanceMetrics()); } catch(e) {}
        }, 2000);
        return { dispose: () => clearInterval(id) };
      }
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
    if (!document.getElementById('lyzer-fonts')) {
      const link = document.createElement('link');
      link.id = 'lyzer-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
      const preconnect1 = document.createElement('link'); preconnect1.rel = 'preconnect'; preconnect1.href = 'https://fonts.googleapis.com'; document.head.appendChild(preconnect1);
      const preconnect2 = document.createElement('link'); preconnect2.rel = 'preconnect'; preconnect2.href = 'https://fonts.gstatic.com'; preconnect2.crossOrigin = 'anonymous'; document.head.appendChild(preconnect2);
    }
    this._container = container;
    this._container.innerHTML = '';
    this._container.style.display = 'grid';
    this._container.style.gridTemplateRows = '64px 1fr 56px';
    this._container.style.gridTemplateColumns = '300px 1fr 280px';
    this._container.style.height = '100vh';
    this._container.style.width = '100vw';
    this._container.style.backgroundColor = '#03060e';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
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
        .g-topbar { grid-column: 1 / 4; background: rgba(8, 12, 20, 0.45); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); border-bottom: 1px solid rgba(56, 189, 248, 0.12); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; transition: border-color 0.5s; z-index: 10; box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03); }
        .g-left { grid-column: 1; border-right: 1px solid rgba(56, 189, 248, 0.06); overflow-y: auto; background: rgba(8, 12, 20, 0.5); backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3); }
        .g-main { grid-column: 2; overflow-y: auto; background: rgba(4, 8, 18, 0.6); position: relative; display: flex; flex-direction: column; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .g-right { grid-column: 3; border-left: 1px solid rgba(56, 189, 248, 0.06); overflow-y: auto; display: flex; flex-direction: column; background: rgba(8, 12, 20, 0.5); backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3); }
        .g-dock { grid-column: 1 / 4; background: rgba(8, 12, 20, 0.5); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); border-top: 1px solid rgba(56, 189, 248, 0.08); display: flex; align-items: center; padding: 0 16px; overflow-x: auto; gap: 6px; z-index: 10; }
        .g-metric { display: flex; flex-direction: column; align-items: center; background: rgba(12, 18, 35, 0.4); backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.08); padding: 5px 14px; border-radius: 8px; position: relative; overflow: hidden; }
        .g-metric::before { content: ''; position: absolute; inset: 0; border-radius: 8px; padding: 1px; background: linear-gradient(135deg, rgba(6,182,212,0.2), rgba(16,185,129,0.1), transparent); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
        .g-metric-label { font-size: 8px; color: rgba(148, 163, 184, 0.6); letter-spacing: 1.2px; font-weight: 700; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif; }
        .g-metric-value { font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; text-shadow: 0 0 20px currentColor; }
        .g-dock-btn { display: flex; align-items: center; gap: 6px; padding: 7px 12px; background: rgba(15, 23, 42, 0.3); color: rgba(148, 163, 184, 0.7); border: 1px solid rgba(148, 163, 184, 0.06); border-radius: 8px; cursor: pointer; white-space: nowrap; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 10px; font-weight: 500; font-family: 'Inter', system-ui, sans-serif; }
        .g-dock-btn:hover { background: rgba(56, 189, 248, 0.08); color: #38bdf8; border-color: rgba(56, 189, 248, 0.2); transform: translateY(-1px); }
        .g-dock-btn.active { background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%); color: #34d399; border-color: rgba(52, 211, 153, 0.3); font-weight: 700; box-shadow: 0 0 20px rgba(16, 185, 129, 0.1), inset 0 0 20px rgba(16, 185, 129, 0.05); }
        .g-trade-balloon { position: absolute; bottom: 80px; right: 24px; background: rgba(6, 94, 70, 0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 12px; padding: 16px 20px; font-family: 'JetBrains Mono', monospace; font-size: 11px; box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(16, 185, 129, 0.05); z-index: 200; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; max-width: 360px; }
        .g-trade-balloon.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .g-trade-balloon:hover { border-color: rgba(56, 189, 248, 0.4); }
        .g-trade-balloon-close { position: absolute; top: 4px; right: 8px; color: rgba(148, 163, 184, 0.5); cursor: pointer; font-size: 16px; background: none; border: none; padding: 2px; }
        @keyframes bg-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes grid-scroll { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }
        @keyframes ambient-glow { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.05); } }
        @media (prefers-reduced-motion: reduce) {
          .g-topbar, .g-metric::before, .g-dock-btn, .g-trade-balloon,
          [class*="g-"], [class*="lb-"] { transition-duration: 0.001ms !important; }
          [style*="animation"] { animation-duration: 0.001ms !important; }
        }
        .toast { position: absolute; bottom: 20px; right: 20px; padding: 10px 18px; border-radius: 8px; font-weight: 600; opacity: 0; transform: translateY(12px); transition: all 0.25s; z-index: 100; pointer-events: none; font-size: 11px; font-family: 'JetBrains Mono', monospace; background: rgba(8, 12, 20, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(56, 189, 248, 0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03); }
        .toast.show { opacity: 1; transform: translateY(0); }
        .leaderboard { padding: 16px; background: rgba(8, 12, 20, 0.35); backdrop-filter: blur(16px); border-top: 1px solid rgba(56, 189, 248, 0.06); }
        .lb-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 10px; font-family: 'JetBrains Mono', monospace; }
        .lb-bar-bg { flex-grow: 1; height: 4px; background: rgba(30, 41, 59, 0.4); border-radius: 2px; overflow: hidden; }
        .lb-bar-fg { height: 100%; transition: width 0.5s ease; border-radius: 2px; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.15); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.3); }
      </style>
      <div style="position: fixed; inset: 0; background: #03060e; z-index: -2; overflow: hidden;">
        <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(56,189,248,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.02) 1px, transparent 1px); background-size: 40px 40px; animation: grid-scroll 8s linear infinite;"></div>
        <div style="position: absolute; top: -20%; left: -15%; width: 55%; height: 55%; background: radial-gradient(ellipse, rgba(56,189,248,0.04), transparent 70%); animation: ambient-glow 6s ease-in-out infinite; contain: paint;"></div>
        <div style="position: absolute; bottom: -20%; right: -15%; width: 50%; height: 50%; background: radial-gradient(ellipse, rgba(16,185,129,0.035), transparent 70%); animation: ambient-glow 8s ease-in-out infinite 2s; contain: paint;"></div>
      </div>
      <div id="g-topbar" class="g-topbar">
        <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 12px; font-family: 'Inter', system-ui, sans-serif;">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="url(#logo-grad)" stroke-width="1.5"/>
            <line x1="14" y1="2" x2="14" y2="26" stroke="url(#logo-grad)" stroke-width="0.75" opacity="0.4"/>
            <line x1="2" y1="8" x2="26" y2="8" stroke="url(#logo-grad)" stroke-width="0.75" opacity="0.4"/>
            <circle cx="14" cy="14" r="3" fill="#38bdf8" opacity="0.6"/>
            <defs><linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs>
          </svg>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: linear-gradient(135deg, #f1f5f9 0%, #38bdf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2.5px; font-weight: 800; font-size: 16px; font-family: 'Inter', system-ui, sans-serif;">LYZER</span>
            <span style="color: rgba(148, 163, 184, 0.3); font-weight: 300; font-size: 14px;">|</span>
            <span style="color: #38bdf8; letter-spacing: 1px; font-weight: 400; font-size: 13px;">EDGE</span>
          </div>
          <span style="font-size: 9px; color: #10b981; background: rgba(16, 185, 129, 0.08); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.15); font-weight: 600; letter-spacing: 0.3px;">COCKPIT α</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="g-metric"><span class="g-metric-label">TRG</span><span class="g-metric-value" style="color: #fbbf24;" id="g-trg">0.00</span></div>
          <div class="g-metric"><span class="g-metric-label">DVF</span><span class="g-metric-value" style="color: #38bdf8;" id="g-dvf">0.00</span></div>
          <div class="g-metric"><span class="g-metric-label">LHDS</span><span class="g-metric-value" style="color: #a855f7;" id="g-lhds-val">0.00</span></div>
          <div class="g-metric"><span class="g-metric-label">EEF</span><span class="g-metric-value" style="color: #4ade80;" id="g-eef">--</span></div>
          <div style="width:1px; height:24px; background: rgba(148,163,184,0.1); margin: 0 4px;"></div>
          <div class="g-metric"><span class="g-metric-label">CONF</span><span class="g-metric-value" style="color: #f472b6;" id="g-confidence">--</span></div>
          <div class="g-metric"><span class="g-metric-label">SDS</span><span class="g-metric-value" style="color: #c084fc;" id="g-sds">--</span></div>
        </div>
        <div style="display: flex; gap: 14px; align-items: center;">
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span style="background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(16,185,129,0.1)); color: #2dd4bf; padding: 2px 10px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; font-family: 'JetBrains Mono', monospace; border: 1px solid rgba(45, 212, 191, 0.15);" id="g-mode-badge">SIMULATION</span>
            <span id="g-clock" style="color: rgba(148, 163, 184, 0.4); font-size: 9px; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">00:00:00 UTC</span>
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
        <div id="g-court-container" style="flex: 1; min-height: 380px; border-bottom: 1px solid rgba(6, 182, 212, 0.06);"></div>
        <div class="leaderboard">
          <div style="color: rgba(56, 189, 248, 0.5); font-size: 10px; margin-bottom: 12px; font-weight: 700; display: flex; justify-content: space-between; letter-spacing: 1px; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif;">
            <span style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.4);"></span>ASSET SIGNAL LEADERBOARD</span>
            <span style="color: #4ade80; font-size: 8px; font-family: 'JetBrains Mono', monospace;" id="g-lb-status">LIVE</span>
          </div>
          <div id="g-leaderboard-list"></div>
        </div>
      </div>
      <div id="g-dock" class="g-dock"></div>
    `;

    const dockContainer = this._container.querySelector('#g-dock');
    const tabs = [
      { id: 'chart-host-widget', label: 'Chart & Decisions' },
      { id: 'trade-log-widget', label: 'Trade Log' },
      { id: 'lacw-workspace-widget', label: 'LACW OS' },
      { id: 'cognitive-audit-widget', label: 'Cognitive Audit' },
      { id: 'observability-dashboard-widget', label: 'Observability' },
      { id: 'causal-graph-widget', label: 'Causal Graph' },
      { id: 'runtime-inspector-widget', label: 'Runtime DevTools' },
      { id: 'reality-status-widget', label: 'Reality Status' }
    ];
    dockContainer.innerHTML = tabs.map(t => `
      <button class="g-dock-btn ${t.id === this._activeWidgetId ? 'active' : ''}" data-id="${t.id}">
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
    setText('#g-confidence', k.confidence ? `${k.confidence}` : '--');
    setText('#g-sds', typeof k.scale_divergence_score === 'number' ? k.scale_divergence_score.toFixed(3) : '--');
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
      const isUp = a.dir > 0;
      const color = isUp ? '#10b981' : '#ef4444';
      const gradient = isUp ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)';
      return `<div class="lb-row"><span style="width:60px;font-weight:600;color:#f1f5f9;font-size:10px;">${a.sym}</span><div class="lb-bar-bg"><div class="lb-bar-fg" style="width:${a.val}%;background:${gradient};"></div></div><span style="width:50px;text-align:right;color:${color};font-weight:600;font-size:10px;font-family:'JetBrains Mono',monospace;">${a.val}%</span></div>`;
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
    balloon.innerHTML = `
      <button class="g-trade-balloon-close" data-action="close">&times;</button>
      <div style="font-size:13px;font-weight:800;margin-bottom:6px;color:${sideColor};">TRADE EXECUTED</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div><span style="color:#94a3b8;">Asset:</span> <span style="font-weight:700;color:#f8fafc;">${trade.symbol.replace('USDT', '/USD')}</span></div>
        <div><span style="color:#94a3b8;">Direction:</span> <span style="font-weight:700;color:${sideColor};">${trade.direction}</span></div>
        <div><span style="color:#94a3b8;">Entry:</span> <span style="font-weight:700;color:#38bdf8;">$${Number(trade.price).toLocaleString()}</span></div>
        ${trade.takeProfit ? `<div><span style="color:#94a3b8;">TP:</span> <span style="font-weight:700;color:#34d399;">$${Number(trade.takeProfit).toLocaleString()}</span></div>` : ''}
        ${trade.stopLoss ? `<div><span style="color:#94a3b8;">SL:</span> <span style="font-weight:700;color:#f87171;">$${Number(trade.stopLoss).toLocaleString()}</span></div>` : ''}
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="g-balloon-plot" style="flex:1;background:#38bdf8;color:#020617;border:none;padding:6px 10px;border-radius:4px;font-weight:800;font-size:11px;cursor:pointer;">PLOT CHART</button>
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
        mainContent.innerHTML = `<div style="padding:24px;color:#ef4444;font-family:monospace;">WIDGET LOAD ERROR [${this._activeWidgetId}]: ${e.message}</div>`;
      }
    } else {
      mainContent.innerHTML = `<div style="padding:24px;color:#94a3b8;font-family:monospace;">Widget '${this._activeWidgetId}' not found</div>`;
    }
  }

  _startGamification() {
    const setInt = (fn, ms) => { const id = setInterval(fn, ms); this._intervals.push(id); return id; };
    const clockEl = this._container.querySelector('#g-clock');
    setInt(() => { if (clockEl) { const d = new Date(); clockEl.innerText = d.toISOString().split('T')[1].split('.')[0] + ' UTC'; } }, 1000);

    const BASE_PRICES = { BTCUSDT: 65000, ETHUSDT: 3450, SOLUSDT: 185, BNBUSDT: 580, EURUSDT: 1.08, GBPUSDT: 1.27 };
    const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];

    // Generate a new mock trade with realistic TP/SL levels
    const spawnTrade = () => {
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const basePrice = BASE_PRICES[symbol] || 65000;
      const price = basePrice * (0.995 + Math.random() * 0.01);
      const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
      const dir = direction === 'LONG' ? 1 : -1;
      const tpPct = 0.012 + Math.random() * 0.015;
      const slPct = 0.006 + Math.random() * 0.008;
      const entryPrice = Math.round(price * 100) / 100;
      const takeProfit = Math.round(price * (1 + dir * tpPct) * 100) / 100;
      const stopLoss = Math.round(price * (1 - dir * slPct) * 100) / 100;

      // Track the current simulated price for tick movement
      this._simPrices = this._simPrices || {};
      this._simPrices[symbol] = entryPrice;

      const trade = {
        index: Date.now(), direction, price: entryPrice,
        pnl: '0.00%', status: 'open',
        stopLoss, takeProfit, governance: 'ALLOW'
      };
      const regime = ['TRENDING', 'RANGING', 'VOLATILE'][Math.floor(Math.random() * 3)];
      const confidence = 60 + Math.random() * 35;
      const open = entryPrice;
      const close = entryPrice + (Math.random() - 0.5) * entryPrice * 0.002;
      const entry = {
        symbol,
        market: {
          openTime: Date.now(), open, close,
          high: Math.max(open, close) + Math.random() * entryPrice * 0.001,
          low: Math.min(open, close) - Math.random() * entryPrice * 0.001,
          volume: Math.floor(Math.random() * 800 + 100), closed: false
        },
        kernel: null, signal: null, trade
      };
      this._latestData[symbol] = entry;
      this._updateMetrics({
        symbol, trade,
        kernel: { trg: 0.35 + Math.random() * 0.4, dvf: 0.2 + Math.random() * 0.3, lhds_df: 0.05 + Math.random() * 0.25, eef: true, scale_divergence_score: Math.random() * 0.3, confidence },
        signal: { signal: dir > 0 ? 'go' : 'short', regime, confidence }
      });
      this._checkTradeNotification({ symbol, trade, market: null, kernel: { eef: true } });
    };

    // Tick simulation: move price towards TP or SL every 2s
    const tickSim = () => {
      this._simPrices = this._simPrices || {};
      for (const [sym, entry] of Object.entries(this._latestData)) {
        if (!entry.trade || entry.trade.status !== 'open') continue;
        const t = entry.trade;
        const dir = t.direction === 'LONG' ? 1 : -1;
        const currentPrice = this._simPrices[sym] || t.price;
        const target = dir > 0 ? t.takeProfit : t.stopLoss;
        const remaining = target - currentPrice;
        const step = remaining * (0.08 + Math.random() * 0.12);
        const newPrice = currentPrice + step;
        this._simPrices[sym] = newPrice;
        t.price = Math.round(newPrice * 100) / 100;
        const pnlPct = ((newPrice - entry.trade.price) / entry.trade.price) * dir * 100;
        t.pnl = pnlPct.toFixed(2) + '%';
        entry.market = {
          openTime: Date.now(), open: currentPrice, close: newPrice,
          high: Math.max(currentPrice, newPrice) * (1 + Math.random() * 0.001),
          low: Math.min(currentPrice, newPrice) * (1 - Math.random() * 0.001),
          volume: Math.floor(Math.random() * 800 + 100), closed: false
        };
        entry.kernel = { trg: 0.35 + Math.random() * 0.4, dvf: 0.2 + Math.random() * 0.3, lhds_df: 0.05 + Math.random() * 0.25, eef: true, scale_divergence_score: Math.random() * 0.3, confidence: 70 + Math.random() * 25 };
        entry.signal = { signal: dir > 0 ? 'go' : 'short', regime: 'TRENDING', confidence: 70 + Math.random() * 25 };

        // Check if TP or SL was hit
        const hitLongTp = dir > 0 && newPrice >= t.takeProfit;
        const hitLongSl = dir > 0 && newPrice <= t.stopLoss;
        const hitShortTp = dir < 0 && newPrice <= t.takeProfit;
        const hitShortSl = dir < 0 && newPrice >= t.stopLoss;
        if (hitLongTp || hitShortTp) {
          t.status = 'closed'; t.pnl = dir > 0 ? '+2.0%' : '+2.0%';
        } else if (hitLongSl || hitShortSl) {
          t.status = 'closed'; t.pnl = dir > 0 ? '-1.0%' : '-1.0%';
        }
        this._updateMetrics({ symbol: sym, kernel: entry.kernel });
      }
    };

    // Seed initial data for all symbols so the chart always has base data
    for (const sym of SYMBOLS) {
      if (!this._latestData[sym]) {
        this._latestData[sym] = {
          symbol: sym, market: null,
          kernel: { trg: 0.35 + Math.random() * 0.4, dvf: 0.2 + Math.random() * 0.3, lhds_df: 0.1 + Math.random() * 0.2, eef: Math.random() > 0.3, scale_divergence_score: Math.random() * 0.3, confidence: 60 + Math.random() * 35 },
          signal: { signal: Math.random() > 0.5 ? 'go' : 'flat', regime: ['TRENDING', 'RANGING', 'VOLATILE'][Math.floor(Math.random() * 3)], confidence: 60 + Math.random() * 35 },
          trade: null
        };
      }
    }

    spawnTrade();
    setInt(spawnTrade, 18000);
    setInt(tickSim, 2000);
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
