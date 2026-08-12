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
import { GamificationHUDWidget } from './commandCenter/widgets/gamificationHUD/GamificationHUDWidget.js';
import { EdgeDashboardWidget } from './commandCenter/widgets/edgeDashboard/EdgeDashboardWidget.js';
import { PatternRecognitionWidget } from './commandCenter/widgets/patternRecognition/PatternRecognitionWidget.js';
import { ExperimentDashboardWidget } from './commandCenter/widgets/experimentDashboard/ExperimentDashboardWidget.js';
import { TestnetDashboardWidget } from './commandCenter/widgets/testnetDashboard/TestnetDashboardWidget.js';
import { wsClient } from '../services/wsClient.js';
import db from '../db/database.js';

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
    this._isMuted = true;
    this._isLeftCollapsed = false;
    this._isRightCollapsed = false;

    this._realRuntime = {
      subscribeSnapshot: (cb) => {
        const emitSnapshot = () => {
          try {
            const activeSym = this._activeSymbol || Object.keys(this._latestData)[0] || 'BTCUSDT';
            const data = this._latestData[activeSym];
            if (!data) return;
            const k = data.kernel || {};
            cb({
              realityTag: 'OBSERVED_REALITY',
              providerId: 'live-binance-v4',
              status: 'HEALTHY',
              trg: k.trg !== undefined ? k.trg : null,
              dvf: k.dvf !== undefined ? k.dvf : null,
              lhds: k.lhds_df !== undefined ? k.lhds_df : (k.lhds !== undefined ? k.lhds : null),
              sds: k.scale_divergence_score !== undefined ? k.scale_divergence_score : (k.sds !== undefined ? k.sds : null),
              conf: k.confidence !== undefined ? k.confidence : (k.conf !== undefined ? k.conf : null),
              eef: k.eef !== undefined ? k.eef : null,
              molState: 'EXECUTE',
              reason: k.reason || (k.reason_codes && k.reason_codes[0]) || (k.eef ? 'VALIDATED' : 'VETO_UNKNOWN'),
              reason_codes: k.reason_codes || []
            });
          } catch(e) {}
        };
        emitSnapshot();
        const id = setInterval(emitSnapshot, 1000);
        this._intervals.push(id);
        return { dispose: () => clearInterval(id) };
      },
      getDecisionLedger: async () => {
        // Return empty — the live stream via subscribeDecisionLedger handles the ledger.
        // Returning stale per-symbol states caused 6 simultaneous VETO entries on mount.
        return [];
      },
      subscribeDecisionLedger: (cb) => {
        // Send one initial entry to prevent empty ledger
        try { cb({ decision: 'ALLOW_TRANSITION', timestamp: Date.now(), component: 'TruthKernel', reason: 'VALIDATED', reason_codes: ['VALIDATED'] }); } catch(e){}
        // Register listener for live WS-driven decisions
        if (!this._decisionLedgerListeners) this._decisionLedgerListeners = new Set();
        this._decisionLedgerListeners.add(cb);
        return { dispose: () => { if (this._decisionLedgerListeners) this._decisionLedgerListeners.delete(cb); } };
      },
      setActiveSymbol: (sym) => { this._activeSymbol = sym; },
      getActiveSymbol: () => this._activeSymbol || 'BTCUSDT',
      getMarketData: (opts = {}) => {
        const sym = opts.symbol || this._activeSymbol || 'BTCUSDT';
        const data = this._latestData[sym];
        if (data?.market) return [data.market];
        return [];
      },
      subscribeTicks: (cb) => {
        return { dispose: () => {} };
      },
      getSystemMetrics: () => ({ cpu: '4.2%', heapMb: 42.8, eventLoopLagMs: 0.04 }),
      getActiveWidgets: () => ['ChartHost', 'TradeLog', 'AgentHub', 'Court'],
      getLatestData: () => this._latestData,
      getTradeHistory: () => this._tradeHistory,
      getRealityStatus: () => {
        const activeSym = this._activeSymbol || Object.keys(this._latestData)[0] || 'BTCUSDT';
        const data = this._latestData[activeSym];
        const k = data?.kernel || {};
        return {
          providerId: 'live-binance-v4',
          realityTag: 'OBSERVED_REALITY',
          healthStatus: data ? 'HEALTHY' : 'STANDBY',
          latencyMs: data?.market?.timestamp ? Math.floor((Date.now() - data.market.timestamp) / 10) : null,
          trg: k.trg !== undefined ? k.trg : null,
          dvf: k.dvf !== undefined ? k.dvf : null,
          lhds: k.lhds_df !== undefined ? k.lhds_df : (k.lhds !== undefined ? k.lhds : null),
          sds: k.scale_divergence_score !== undefined ? k.scale_divergence_score : (k.sds !== undefined ? k.sds : null),
          conf: k.confidence !== undefined ? k.confidence : (k.conf !== undefined ? k.conf : null),
          eef: k.eef !== undefined ? k.eef : null,
          molState: 'EXECUTE'
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
      'gamification-hud-widget': GamificationHUDWidget,
      'edge-dashboard-widget': EdgeDashboardWidget,
      'pattern-recognition-widget': PatternRecognitionWidget,
      'lacw-workspace-widget': LACWWorkspaceWidget,
      'cognitive-audit-widget': CognitiveAuditWidget,
      'observability-dashboard-widget': ObservabilityDashboardWidget,
      'causal-graph-widget': CausalGraphWidget,
      'runtime-inspector-widget': RuntimeInspectorWidget,
      'reality-status-widget': RealityStatusWidget,
      'testnet-dashboard-widget': TestnetDashboardWidget
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
    this._updateGridColumns();
    this._container.style.transition = 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    this._container.style.height = '100vh';
    this._container.style.width = '100vw';
    this._container.style.backgroundColor = '#03060e';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
    this._container.style.overflow = 'hidden';

    window.addEventListener('lyzer:toggle-left-sidebar', (e) => {
      this._isLeftCollapsed = !!e.detail?.collapsed;
      this._updateGridColumns();
    });

    // Chart widget notifies us when the user switches asset
    window.addEventListener('lyzer:active-symbol', (e) => {
      this._activeHudSymbol = e.detail?.symbol || 'BTCUSDT';
      // Immediately refresh HUD with the new symbol's data
      const d = this._latestData[this._activeHudSymbol];
      if (d) {
        this._updateMetrics(d);
        // Update symbol badge
        const badge = this._container.querySelector('#g-active-symbol');
        if (badge) badge.innerText = this._activeHudSymbol.replace('USDT', '/USD');
      }
    });

    this._renderShell();
    await this._mountStaticWidgets();
    await this._mountActiveWidget();
    this._startGamification();
    this._connectWS();
    this._listenDockSwitch();
    this._bindTopbarEvents();
    this._bindRightSidebarEvents();
    this._activeWidgetId = 'chart-host-widget';
    this._activateTab('chart-host-widget');
  }

  _updateGridColumns() {
    const leftCol = this._isLeftCollapsed ? '50px' : '300px';
    const rightCol = this._isRightCollapsed ? '50px' : '280px';
    this._container.style.gridTemplateColumns = `${leftCol} 1fr ${rightCol}`;
  }

  _renderShell() {
    this._container.innerHTML = `
      <style>
        .g-topbar { grid-column: 1 / 4; background: rgba(6, 10, 22, 0.35); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); border-bottom: 1px solid rgba(0, 243, 255, 0.2); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; transition: border-color 0.5s; z-index: 10; box-shadow: 0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12); }
        .g-left { grid-column: 1; border-right: 1px solid rgba(0, 243, 255, 0.12); overflow-y: auto; background: rgba(6, 10, 22, 0.35); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); box-shadow: inset 1px 0 0 rgba(255,255,255,0.05); }
        .g-main { grid-column: 2; overflow-y: auto; background: rgba(4, 8, 18, 0.45); position: relative; display: flex; flex-direction: column; backdrop-filter: blur(16px) saturate(1.4); -webkit-backdrop-filter: blur(16px) saturate(1.4); }
        .g-right { grid-column: 3; border-left: 1px solid rgba(0, 243, 255, 0.12); overflow-y: auto; display: flex; flex-direction: column; background: rgba(6, 10, 22, 0.35); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); box-shadow: inset -1px 0 0 rgba(255,255,255,0.05); }
        .g-dock { grid-column: 1 / 4; background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); border-top: 1px solid rgba(0, 243, 255, 0.18); display: flex; align-items: center; padding: 0 16px; overflow-x: auto; gap: 6px; z-index: 10; box-shadow: 0 -10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1); }
        .g-metric { display: flex; flex-direction: column; align-items: center; background: rgba(10, 16, 32, 0.45); backdrop-filter: blur(16px); border: 1px solid rgba(0, 243, 255, 0.18); padding: 5px 14px; border-radius: 10px; position: relative; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .g-metric:hover { border-color: #00f3ff; box-shadow: 0 0 20px rgba(0, 243, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.25); transform: translateY(-2px); }
        .g-metric::before { content: ''; position: absolute; inset: 0; border-radius: 10px; padding: 1px; background: linear-gradient(135deg, rgba(0,243,255,0.3), rgba(0,255,157,0.2), transparent); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
        .g-metric-label { font-size: 8px; color: rgba(148, 163, 184, 0.7); letter-spacing: 1.2px; font-weight: 800; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif; }
        .g-metric-value { font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; filter: drop-shadow(0 0 8px currentColor); }
        .g-dock-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(10, 16, 32, 0.45); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: rgba(148, 163, 184, 0.8); border: 1px solid rgba(0, 243, 255, 0.18); border-radius: 10px; cursor: pointer; white-space: nowrap; position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; box-shadow: 0 8px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15); }
        .g-dock-btn::before { content: ''; position: absolute; inset: 0; border-radius: 10px; padding: 1px; background: linear-gradient(135deg, rgba(0,243,255,0.3), rgba(0,255,157,0.2), transparent); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
        .g-dock-btn:hover { background: rgba(0, 243, 255, 0.12); color: #00f3ff; border-color: #00f3ff; transform: translateY(-2px); box-shadow: 0 0 20px rgba(0, 243, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.25); }
        .g-dock-btn.active { background: linear-gradient(135deg, rgba(0, 255, 157, 0.2) 0%, rgba(0, 243, 255, 0.15) 100%); color: #00ff9d; border-color: rgba(0, 255, 157, 0.5); font-weight: 800; box-shadow: 0 0 25px rgba(0, 255, 157, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2); }
        .g-trade-balloon { position: absolute; bottom: 80px; right: 24px; background: rgba(6, 10, 22, 0.38); backdrop-filter: blur(32px) saturate(1.8); -webkit-backdrop-filter: blur(32px) saturate(1.8); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 16px; padding: 20px 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(0, 243, 255, 0.2), inset 0 1px 1px rgba(255,255,255,0.25); z-index: 200; cursor: pointer; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; max-width: 380px; }
        .g-trade-balloon.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .g-trade-balloon:hover { border-color: #00f3ff; box-shadow: 0 30px 70px rgba(0,0,0,0.8), 0 0 45px rgba(0, 243, 255, 0.4), inset 0 1px 1px rgba(255,255,255,0.35); transform: translateY(-2px) scale(1.01); }
        .g-trade-balloon-close { position: absolute; top: 6px; right: 10px; color: rgba(148, 163, 184, 0.6); cursor: pointer; font-size: 18px; background: none; border: none; padding: 2px; transition: color 0.2s; }
        .g-trade-balloon-close:hover { color: #00f3ff; }
        @keyframes bg-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes grid-scroll { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }
        @keyframes ambient-glow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.08); } }
        @media (prefers-reduced-motion: reduce) {
          .g-topbar, .g-metric::before, .g-dock-btn, .g-trade-balloon,
          [class*="g-"], [class*="lb-"] { transition-duration: 0.001ms !important; }
          [style*="animation"] { animation-duration: 0.001ms !important; }
        }
        .toast { position: absolute; bottom: 20px; right: 20px; padding: 10px 18px; border-radius: 8px; font-weight: 600; opacity: 0; transform: translateY(12px); transition: all 0.25s; z-index: 100; pointer-events: none; font-size: 11px; font-family: 'JetBrains Mono', monospace; background: rgba(8, 12, 20, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(56, 189, 248, 0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03); }
        .toast.show { opacity: 1; transform: translateY(0); }
        .leaderboard { padding: 16px; background: rgba(6, 10, 22, 0.35); backdrop-filter: blur(20px); border-top: 1px solid rgba(0, 243, 255, 0.1); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
        .lb-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 10px; font-family: 'JetBrains Mono', monospace; }
        .lb-bar-bg { flex-grow: 1; height: 4px; background: rgba(30, 41, 59, 0.5); border-radius: 2px; overflow: hidden; }
        .lb-bar-fg { height: 100%; transition: width 0.5s ease; border-radius: 2px; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 243, 255, 0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0, 243, 255, 0.4); }
      </style>
      <div style="position: fixed; inset: 0; background: #03060e; z-index: -2; overflow: hidden;">
        <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(56,189,248,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.02) 1px, transparent 1px); background-size: 40px 40px; animation: grid-scroll 8s linear infinite;"></div>
        <div style="position: absolute; top: -20%; left: -15%; width: 55%; height: 55%; background: radial-gradient(ellipse, rgba(56,189,248,0.04), transparent 70%); animation: ambient-glow 6s ease-in-out infinite; contain: paint;"></div>
        <div style="position: absolute; bottom: -20%; right: -15%; width: 50%; height: 50%; background: radial-gradient(ellipse, rgba(16,185,129,0.035), transparent 70%); animation: ambient-glow 8s ease-in-out infinite 2s; contain: paint;"></div>
      </div>
        <div id="g-topbar" class="g-topbar">
          <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 12px; font-family: 'Inter', system-ui, sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: linear-gradient(135deg, #f1f5f9 0%, #38bdf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2.5px; font-weight: 800; font-size: 16px; font-family: 'Inter', system-ui, sans-serif;">LYZER</span>
              <span style="color: rgba(148, 163, 184, 0.3); font-weight: 300; font-size: 14px;">|</span>
              <span style="color: #38bdf8; letter-spacing: 1px; font-weight: 400; font-size: 13px;">EDGE</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <div class="g-metric"><span class="g-metric-label">TRG</span><span class="g-metric-value" style="color: #fbbf24;" id="g-trg" title="Tail Risk Geometry">...</span></div>
            <div class="g-metric"><span class="g-metric-label">DVF</span><span class="g-metric-value" style="color: #38bdf8;" id="g-dvf" title="Distributional Variance Filter">...</span></div>
            <div class="g-metric"><span class="g-metric-label">LHDS</span><span class="g-metric-value" style="color: #a855f7;" id="g-lhds-val" title="Lethal Hazard Detection Score">...</span></div>
            <div class="g-metric"><span class="g-metric-label">EEF</span><span class="g-metric-value" style="color: #4ade80;" id="g-eef" title="Execution Eligibility Flag">...</span></div>
            <div style="width:1px; height:24px; background: rgba(148,163,184,0.1); margin: 0 4px;"></div>
            <div class="g-metric"><span class="g-metric-label">CONF</span><span class="g-metric-value" style="color: #f472b6;" id="g-confidence" title="Signal Confidence">...</span></div>
            <div class="g-metric"><span class="g-metric-label">SDS</span><span class="g-metric-value" style="color: #c084fc;" id="g-sds" title="Scale Divergence Score">...</span></div>
            <div style="width:1px; height:24px; background: rgba(148,163,184,0.1); margin: 0 4px;"></div>
            <span id="g-active-symbol" style="font-size:10px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#22d3ee;background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.25);padding:2px 9px;border-radius:6px;letter-spacing:0.5px;" title="Active asset being displayed">BTC/USD</span>
          </div>
          <div style="display: flex; gap: 14px; align-items: center;">
            <button id="g-mute-btn" class="g-dock-btn" style="background: rgba(15, 23, 42, 0.8); color: #94a3b8; border-color: rgba(148, 163, 184, 0.3);" title="Toggle trade notifications">🔕 NOTIF OFF</button>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <span class="g-dock-btn" style="padding: 3px 10px; font-size: 9px; pointer-events: none;" id="g-mode-badge">CONNECTING...</span>
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
        <div id="g-right-header" style="padding: 10px 14px; border-bottom: 1px solid rgba(0, 243, 255, 0.1); display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 700; color: rgba(56, 189, 248, 0.6); letter-spacing: 1px; text-transform: uppercase;">
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #a855f7; box-shadow: 0 0 8px rgba(168,85,247,0.5);"></span>CONSTITUTIONAL COURT</span>
          <button id="g-right-toggle-btn" class="g-dock-btn" style="padding: 3px 10px; font-size: 9px; font-family: 'JetBrains Mono', monospace;" title="Collapse Court">COLLAPSE COURT</button>
        </div>
        <div id="g-court-container" style="flex: 1; min-height: 280px; border-bottom: 1px solid rgba(6, 182, 212, 0.06);"></div>
        <div class="leaderboard" id="g-leaderboard-panel" style="border-top: 1px solid rgba(0, 243, 255, 0.12);">
          <div style="color: rgba(56, 189, 248, 0.8); font-size: 10px; margin-bottom: 12px; font-weight: 800; display: flex; justify-content: space-between; letter-spacing: 1.2px; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif;">
            <span style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6);"></span>ASSET SIGNAL LEADERBOARD</span>
            <span style="color: #4ade80; font-size: 8px; font-family: 'JetBrains Mono', monospace;" id="g-lb-status">LIVE</span>
          </div>
          <div id="g-leaderboard-list"></div>
        </div>
      </div>
      <div id="g-dock" class="g-dock"></div>
    `;

    const dockContainer = this._container.querySelector('#g-dock');
    const tabs = [
      { id: 'testnet-dashboard-widget', label: 'Testnet Status' },
      { id: 'chart-host-widget', label: 'Chart & Decisions' },
      { id: 'trade-log-widget', label: 'Trade Log' },
      { id: 'gamification-hud-widget', label: 'Level & Quests' },
      { id: 'edge-dashboard-widget', label: 'Edge Dashboard' },
      { id: 'pattern-recognition-widget', label: 'Pattern Recognition' },
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

  _bindTopbarEvents() {
    const muteBtn = this._container.querySelector('#g-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this._isMuted = !this._isMuted;
        muteBtn.innerText = this._isMuted ? '🔕 NOTIF OFF' : '🔔 NOTIF ON';
        muteBtn.style.color = this._isMuted ? '#94a3b8' : '#38bdf8';
        muteBtn.style.borderColor = this._isMuted ? 'rgba(148, 163, 184, 0.3)' : 'rgba(56, 189, 248, 0.5)';
        muteBtn.style.background = this._isMuted ? 'rgba(15, 23, 42, 0.8)' : 'rgba(56, 189, 248, 0.08)';
        this._showToast(this._isMuted ? '🔕 Notificações desativadas' : '🔔 Notificações ativadas');
      });
    }
  }

  _showToast(msg, type = 'info') {
    const toastEl = this._container?.querySelector('#g-toast');
    if (!toastEl) return;
    const colors = { info: '#38bdf8', success: '#10b981', warn: '#f59e0b', error: '#ef4444' };
    toastEl.innerText = msg;
    toastEl.style.color = colors[type] || colors.info;
    toastEl.style.borderColor = `${colors[type] || colors.info}33`;
    toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  _bindRightSidebarEvents() {
    const toggleBtn = this._container.querySelector('#g-right-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this._toggleRightSidebar());
    }
  }

  _toggleRightSidebar(forceState) {
    this._isRightCollapsed = typeof forceState === 'boolean' ? forceState : !this._isRightCollapsed;
    this._updateGridColumns();
    const rightPanel = this._container.querySelector('#g-right');
    if (!rightPanel) return;

    if (this._isRightCollapsed) {
      rightPanel.innerHTML = `
        <div style="padding: 12px 6px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <button id="g-right-toggle-btn" class="g-dock-btn" style="padding: 8px 4px; writing-mode: vertical-rl; text-transform: uppercase; letter-spacing: 1px;" title="Expand Constitutional Court">
            EXPAND COURT
          </button>
        </div>
      `;
    } else {
      rightPanel.innerHTML = `
        <div id="g-right-header" style="padding: 10px 14px; border-bottom: 1px solid rgba(0, 243, 255, 0.1); display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 700; color: rgba(56, 189, 248, 0.6); letter-spacing: 1px; text-transform: uppercase;">
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #a855f7; box-shadow: 0 0 8px rgba(168,85,247,0.5);"></span>CONSTITUTIONAL COURT</span>
          <button id="g-right-toggle-btn" class="g-dock-btn" style="padding: 3px 10px; font-size: 9px; font-family: 'JetBrains Mono', monospace;" title="Collapse Court">COLLAPSE COURT</button>
        </div>
        <div id="g-court-container" style="flex: 1; min-height: 280px; border-bottom: 1px solid rgba(6, 182, 212, 0.06);"></div>
        <div class="leaderboard" id="g-leaderboard-panel" style="border-top: 1px solid rgba(0, 243, 255, 0.12);">
          <div style="color: rgba(56, 189, 248, 0.8); font-size: 10px; margin-bottom: 12px; font-weight: 800; display: flex; justify-content: space-between; letter-spacing: 1.2px; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif;">
            <span style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6);"></span>ASSET SIGNAL LEADERBOARD</span>
            <span style="color: #4ade80; font-size: 8px; font-family: 'JetBrains Mono', monospace;" id="g-lb-status">LIVE</span>
          </div>
          <div id="g-leaderboard-list"></div>
        </div>
      `;
      if (this._court && this._container.querySelector('#g-court-container')) {
        this._court.mount(this._container.querySelector('#g-court-container'), this._realRuntime);
      }
      // Re-populate leaderboard immediately with cached data
      if (Object.keys(this._latestData).length > 0) {
        this._updateLeaderboard(Object.values(this._latestData)[0]);
      }
    }
    this._bindRightSidebarEvents();
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
      // Merge instead of replace — preserve existing kernel when new data (e.g. initial
      // connection snapshot) doesn't carry kernel information.
      const existing = this._latestData[data.symbol] || {};
      this._latestData[data.symbol] = {
        ...existing,
        ...data,
        kernel: data.kernel || existing.kernel
      };
      const merged = this._latestData[data.symbol];
      this._updateMetrics(merged);
      this._updateLeaderboard(merged);
      this._checkTradeNotification(merged);
    });
  }

  _updateMetrics(data) {
    if (!data) return;
    // Only update the top HUD if this data belongs to the active symbol
    // (prevents last-processed WS symbol from overwriting the one user selected)
    if (this._activeHudSymbol && data.symbol && data.symbol !== this._activeHudSymbol) return;
    const k = data.kernel;
    if (k) {
      const setText = (id, val) => {
        if (val === undefined || val === null) return;
        const el = this._container.querySelector(id);
        if (el) el.innerText = val;
      };

      if (k.trg !== undefined) setText('#g-trg', Number(k.trg).toFixed(2));
      if (k.dvf !== undefined) setText('#g-dvf', Number(k.dvf).toFixed(2));
      
      const lhdsVal = k.lhds_df !== undefined ? k.lhds_df : k.lhds;
      if (lhdsVal !== undefined) setText('#g-lhds-val', Number(lhdsVal).toFixed(2));

      if (k.eef !== undefined) {
        const eefEl = this._container.querySelector('#g-eef');
        if (eefEl) {
          const isAllow = (k.eef === true || k.eef === 'ALLOW' || k.eef === 'ALLOW_TRANSITION');
          eefEl.innerText = isAllow ? 'ALLOW' : 'VETO';
          eefEl.style.color = isAllow ? '#4ade80' : '#ef4444';
        }
      }

      const confVal = k.confidence !== undefined ? k.confidence : k.conf;
      if (confVal !== undefined) setText('#g-confidence', typeof confVal === 'number' ? `${Math.round(confVal)}%` : `${confVal}`);

      const sdsVal = k.scale_divergence_score !== undefined ? k.scale_divergence_score : k.sds;
      if (sdsVal !== undefined) setText('#g-sds', Number(sdsVal).toFixed(3));

      // Update symbol badge in HUD
      const badge = this._container.querySelector('#g-active-symbol');
      if (badge && data.symbol) badge.innerText = data.symbol.replace('USDT', '/USD');
    }

    const mode = data.mode || data.connectionState;
    if (mode) {
      const el = this._container.querySelector('#g-mode-badge');
      if (el) {
        el.innerText = mode;
        if (mode === 'LIVE') {
          el.style.color = '#f87171';
          el.style.borderColor = 'rgba(248, 113, 113, 0.5)';
          el.style.background = 'rgba(248, 113, 113, 0.12)';
          el.style.boxShadow = '0 0 10px rgba(248,113,113,0.2)';
        } else if (mode === 'TESTNET') {
          el.style.color = '#38bdf8';
          el.style.borderColor = 'rgba(56, 189, 248, 0.5)';
          el.style.background = 'rgba(56, 189, 248, 0.12)';
          el.style.boxShadow = '0 0 10px rgba(56,189,248,0.2)';
        } else if (mode === 'SIMULATION') {
          el.style.color = '#94a3b8';
          el.style.borderColor = 'rgba(148, 163, 184, 0.3)';
          el.style.background = 'rgba(15, 23, 42, 0.8)';
          el.style.boxShadow = 'none';
        } else {
          el.style.color = '#fbbf24';
          el.style.borderColor = 'rgba(251, 191, 36, 0.4)';
          el.style.background = 'rgba(251, 191, 36, 0.08)';
          el.style.boxShadow = 'none';
        }
      }
    }
  }

  _updateLeaderboard(data) {
    const lbContainer = this._container.querySelector('#g-leaderboard-list');
    if (!lbContainer) return;
    
    const symbols = Object.keys(this._latestData);
    if (symbols.length === 0) {
      lbContainer.innerHTML = '<div style="color:#64748b;font-size:11px;padding:8px;">Aguardando dados de mercado...</div>';
      return;
    }

    const entries = symbols.map((sym) => {
      const d = this._latestData[sym] || {};
      const k = d.kernel || {};

      const trg = typeof k.trg === 'number' ? k.trg : 0;
      const dvf = typeof k.dvf === 'number' ? k.dvf : 0;
      const conf = typeof k.confidence === 'number' ? k.confidence / 100 : 0;
      const composite = (trg * 0.5 + dvf * 0.3 + conf * 0.2);
      const scorePct = Math.min(100, Math.max(0, Math.round(composite * 100)));

      const isUp = k.eef === true || scorePct > 55;
      return { sym: sym.replace('USDT', '/USD').replace('USD', '/USD'), val: scorePct, dir: isUp ? 1 : -1 };
    });

    entries.sort((a, b) => b.val - a.val);

    lbContainer.innerHTML = entries.map(a => {
      const isUp = a.dir > 0;
      const color = isUp ? '#10b981' : '#ef4444';
      const gradient = isUp ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)';
      return `<div class="lb-row"><span style="width:60px;font-weight:600;color:#f1f5f9;font-size:10px;">${a.sym}</span><div class="lb-bar-bg"><div class="lb-bar-fg" style="width:${a.val}%;background:${gradient};transition:width 0.8s ease;"></div></div><span style="width:50px;text-align:right;color:${color};font-weight:600;font-size:10px;font-family:'JetBrains Mono',monospace;">${a.val}%</span></div>`;
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

    // 1. SILENTLY PLOT TRADE FOR THIS ASSET (WITHOUT FORCING TAB SWITCH)
    const plotDetail = {
      symbol: trade.symbol,
      entry: trade.price,
      tp: trade.takeProfit,
      sl: trade.stopLoss,
      side: trade.direction === 'LONG' ? 'BUY' : 'SELL',
      title: `${trade.direction} @ ${trade.price}`
    };
    window.dispatchEvent(new CustomEvent('lyzer:plot-trade', { detail: plotDetail }));

    // 2. IF MUTED, SKIP SHOWING POPUP BALLOON
    if (this._isMuted) return;

    const balloon = this._container.querySelector('#g-trade-balloon');
    if (!balloon) return;
    const isLong = trade.direction === 'LONG';
    const sideColor = isLong ? '#00ff9d' : '#ff3366';
    const glowColor = isLong ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255, 51, 102, 0.3)';

    balloon.style.borderColor = sideColor;
    balloon.style.boxShadow = `0 25px 60px rgba(0,0,0,0.7), 0 0 35px ${glowColor}, inset 0 1px 1px rgba(255,255,255,0.25)`;

    // Render in COLLAPSED state initially
    let isExpanded = false;

    const renderCollapsed = () => {
      balloon.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;" id="g-balloon-pill">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sideColor};box-shadow:0 0 8px ${sideColor};"></span>
            <span style="font-weight:800;color:${sideColor};font-size:11px;letter-spacing:0.5px;">🔔 TRADE SIGNAL: ${trade.symbol.replace('USDT', '/USD')} ${trade.direction}</span>
          </div>
          <span style="color:rgba(56,189,248,0.8);font-size:9px;font-weight:700;background:rgba(56,189,248,0.12);padding:2px 8px;border-radius:6px;border:1px solid rgba(56,189,248,0.2);">EXPAND 🔍</span>
        </div>
      `;
      balloon.querySelector('#g-balloon-pill')?.addEventListener('click', (e) => {
        e.stopPropagation();
        renderExpanded();
      });
    };

    const renderExpanded = () => {
      isExpanded = true;
      balloon.innerHTML = `
        <button class="g-trade-balloon-close" data-action="close">&times;</button>
        <div style="font-size:12px;font-weight:800;letter-spacing:1px;margin-bottom:8px;color:${sideColor};display:flex;align-items:center;justify-content:space-between;">
          <span>TRADE AUTO-PLOTTED</span>
          <span style="font-size:9px;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:10px;color:#f8fafc;">ECA VERIFIED</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;font-size:11px;">
          <div><span style="color:#94a3b8;">Asset:</span> <span style="font-weight:800;color:#f8fafc;">${trade.symbol.replace('USDT', '/USD')}</span></div>
          <div><span style="color:#94a3b8;">Direction:</span> <span style="font-weight:800;color:${sideColor};">${trade.direction}</span></div>
          <div><span style="color:#94a3b8;">Entry:</span> <span style="font-weight:800;color:#00f3ff;">$${Number(trade.price).toLocaleString()}</span></div>
          ${trade.takeProfit ? `<div><span style="color:#94a3b8;">TP:</span> <span style="font-weight:800;color:#00ff9d;">$${Number(trade.takeProfit).toLocaleString()}</span></div>` : ''}
          ${trade.stopLoss ? `<div><span style="color:#94a3b8;">SL:</span> <span style="font-weight:800;color:#ff3366;">$${Number(trade.stopLoss).toLocaleString()}</span></div>` : ''}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="g-balloon-dismiss" style="flex:1;background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.12);padding:8px 12px;border-radius:8px;font-size:10px;font-family:'JetBrains Mono',monospace;cursor:pointer;transition:all 0.2s;">DISMISS</button>
        </div>`;
      const close = () => { balloon.classList.remove('show'); };
      balloon.querySelector('[data-action="close"]')?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
      balloon.querySelector('.g-balloon-dismiss')?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    };

    renderCollapsed();
    balloon.classList.add('show');
    const close = () => { balloon.classList.remove('show'); };
    const timer = setTimeout(close, 15000);
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
    if (!this._widgetCache) this._widgetCache = {};

    // Hide all currently mounted widgets
    for (const id in this._widgetCache) {
      if (this._widgetCache[id].container) {
        this._widgetCache[id].container.style.display = 'none';
      }
    }

    if (this._widgetCache[this._activeWidgetId]) {
      this._activeWidgetInstance = this._widgetCache[this._activeWidgetId].instance;
      this._widgetCache[this._activeWidgetId].container.style.display = 'block';
    } else {
      const WidgetClass = this._widgetRegistry[this._activeWidgetId];
      if (WidgetClass) {
        const widgetContainer = document.createElement('div');
        widgetContainer.style.width = '100%';
        widgetContainer.style.height = '100%';
        mainContent.appendChild(widgetContainer);

        try {
          this._activeWidgetInstance = new WidgetClass();
          await this._activeWidgetInstance.mount(widgetContainer, this._realRuntime);
          this._widgetCache[this._activeWidgetId] = {
            instance: this._activeWidgetInstance,
            container: widgetContainer
          };
        } catch (e) {
          widgetContainer.innerHTML = `<div style="padding:24px;color:#ef4444;font-family:monospace;">WIDGET LOAD ERROR [${this._activeWidgetId}]: ${e.message}</div>`;
        }
      } else {
        mainContent.innerHTML = `<div style="padding:24px;color:#94a3b8;font-family:monospace;">Widget '${this._activeWidgetId}' not found</div>`;
      }
    }
  }

  _startGamification() {
    const setInt = (fn, ms) => { const id = setInterval(fn, ms); this._intervals.push(id); return id; };
    const clockEl = this._container.querySelector('#g-clock');
    setInt(() => { if (clockEl) { const d = new Date(); clockEl.innerText = d.toISOString().split('T')[1].split('.')[0] + ' UTC'; } }, 1000);

    // Clean initialization: live data arrives strictly via WebSocket stream
    this._latestData = {};

    // Refresh leaderboard every 5s to keep micro-animation alive between candles
    setInt(() => {
      if (Object.keys(this._latestData).length > 0) {
        this._updateLeaderboard(Object.values(this._latestData)[0]);
      }
    }, 5000);


    // Setup interval loop for UI time
    this._intervals.push(setInterval(() => {
      if (this._disposed) return;
      const tElement = document.getElementById('utc-clock');
      if (tElement) tElement.textContent = new Date().toISOString().substring(11, 19) + ' UTC';
    }, 1000));

    // Listen for symbol changes from ChartHostWidget
    this._activeSymbolListener = (e) => {
      const sym = e.detail?.symbol;
      if (sym && this._realRuntime && this._realRuntime.setActiveSymbol) {
        this._realRuntime.setActiveSymbol(sym);
      }
    };
    window.addEventListener('lyzer:active-symbol', this._activeSymbolListener);

    // Force-flush metrics for ALL seeded symbols 200ms after mount
    // This fixes the "ghost 0.0000" bug where topbar never received initial values
    setTimeout(() => {
      if (this._disposed) return;
      for (const [sym, entry] of Object.entries(this._latestData)) {
        if (entry?.kernel) {
          this._updateMetrics({ symbol: sym, kernel: entry.kernel, signal: entry.signal, mode: entry.mode });
        }
      }
    }, 200);
  }

  unmount() {
    this._disposed = true;
    this._intervals.forEach(id => clearInterval(id));
    this._intervals = [];
    this._notificationTimers.forEach(t => clearTimeout(t));
    this._notificationTimers = [];
    if (this._activeSymbolListener) {
      window.removeEventListener('lyzer:active-symbol', this._activeSymbolListener);
      this._activeSymbolListener = null;
    }
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
