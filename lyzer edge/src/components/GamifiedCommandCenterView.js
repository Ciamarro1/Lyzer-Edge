import { AgentHubWidget } from './commandCenter/widgets/agentHub/AgentHubWidget.js';
import { CourtWidget } from './commandCenter/widgets/court/CourtWidget.js';

import { LACWWorkspaceWidget } from './commandCenter/widgets/lacwWorkspace/LACWWorkspaceWidget.js';
import { CognitiveAuditWidget } from './commandCenter/widgets/cognitiveAudit/CognitiveAuditWidget.js';
import { AlphaDiscoveryWidget } from './commandCenter/widgets/alphaDiscovery/AlphaDiscoveryWidget.js';
import { ObservabilityDashboardWidget } from './commandCenter/widgets/observabilityDashboard/ObservabilityDashboardWidget.js';
import { TimelineWidget } from './commandCenter/widgets/timeline/TimelineWidget.js';
import { CausalGraphWidget } from './commandCenter/widgets/causalGraph/CausalGraphWidget.js';
import { ChartHostWidget } from './commandCenter/widgets/chartHost/ChartHostWidget.js';
import { RuntimeInspectorWidget } from './commandCenter/widgets/runtimeInspector/RuntimeInspectorWidget.js';
import { RealityStatusWidget } from './commandCenter/widgets/realityStatus/RealityStatusWidget.js';

export class GamifiedCommandCenterView {
  constructor() {
    this._container = null;
    this._disposed = false;
    this._agentHub = null;
    this._court = null;
    this._activeWidgetInstance = null;
    this._activeWidgetId = 'lacw-workspace-widget';
    this._intervals = [];

    // Robust mock runtime passed to widgets requiring runtime subscriptions
    this._mockRuntime = {
      subscribeSnapshot: (cb) => {
        try { cb({ realityTag: 'OBSERVED_REALITY', providerId: 'live-default', status: 'HEALTHY' }); } catch(e){}
        return { dispose: () => {} };
      },
      getDecisionLedger: async (opts) => [
        { decision: 'ALLOW_TRANSITION', timestamp: Date.now(), metadata: { actor: 'TruthKernel', confidence: 0.98 } },
        { decision: 'ALLOW_TRANSITION', timestamp: Date.now() - 12000, metadata: { actor: 'ECA_Court', confidence: 0.96 } }
      ],
      subscribeDecisionLedger: async (cb) => {
        try { cb({ decision: 'ALLOW_TRANSITION', timestamp: Date.now(), metadata: { actor: 'TruthKernel' } }); } catch(e){}
        return { dispose: () => {} };
      },
      getMarketData: (opts) => [
        { time: Date.now() - 300000, open: 65000, high: 65400, low: 64900, close: 65300, volume: 142.5 },
        { time: Date.now(), open: 65300, high: 65600, low: 65200, close: 65550, volume: 189.2 }
      ],
      subscribeTicks: (cb) => {
        try { cb({ time: Date.now(), price: 65550, symbol: 'BTCUSDT' }); } catch(e){}
        return { dispose: () => {} };
      },
      getSystemMetrics: () => ({ cpu: '4.2%', heapMb: 42.8, eventLoopLagMs: 0.04 }),
      getActiveWidgets: () => ['AgentHub', 'Court', 'LACWWorkspace', 'CausalGraph']
    };

    this._widgetRegistry = {
      'lacw-workspace-widget': LACWWorkspaceWidget,
      'cognitive-audit-widget': CognitiveAuditWidget,
      'alpha-discovery-widget': AlphaDiscoveryWidget,
      'observability-dashboard-widget': ObservabilityDashboardWidget,
      'timeline-widget': TimelineWidget,
      'causal-graph-widget': CausalGraphWidget,
      'chart-host-widget': ChartHostWidget,
      'runtime-inspector-widget': RuntimeInspectorWidget,
      'reality-status-widget': RealityStatusWidget
    };
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = '';
    
    // Set up full CSS grid layout
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
  }

  _renderShell() {
    this._container.innerHTML = `
      <style>
        .g-topbar { 
          grid-column: 1 / 4; 
          background: rgba(15, 23, 42, 0.85); 
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.4); 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 0 20px; 
          transition: border-color 0.5s; 
          z-index: 10; 
          box-shadow: 0 4px 25px rgba(0,0,0,0.6);
        }
        .g-left { grid-column: 1; border-right: 1px solid #1e293b; overflow-y: auto; background: #070c18; }
        .g-main { grid-column: 2; overflow-y: auto; background: #020617; position: relative; display: flex; flex-direction: column; }
        .g-right { grid-column: 3; border-left: 1px solid #1e293b; overflow-y: auto; display: flex; flex-direction: column; background: #070c18; }
        .g-dock { 
          grid-column: 1 / 4; 
          background: rgba(15, 23, 42, 0.95); 
          backdrop-filter: blur(10px);
          border-top: 1px solid #1e293b; 
          display: flex; 
          align-items: center; 
          padding: 0 16px; 
          overflow-x: auto; 
          gap: 10px; 
          z-index: 10; 
        }
        
        .g-metric { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          background: rgba(30, 41, 59, 0.6); 
          border: 1px solid rgba(51, 65, 85, 0.6);
          padding: 6px 14px; 
          border-radius: 6px; 
        }
        .g-metric-label { font-size: 9px; color: #94a3b8; letter-spacing: 0.5px; font-weight: 700; text-transform: uppercase; }
        .g-metric-value { font-size: 15px; font-weight: 800; font-family: monospace; }
        
        .g-dock-btn { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px 14px; 
          background: #0f172a; 
          color: #94a3b8; 
          border: 1px solid #1e293b; 
          border-radius: 6px; 
          cursor: pointer; 
          white-space: nowrap; 
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
          font-size: 11px;
          font-weight: 600;
        }
        .g-dock-btn:hover { background: #1e293b; color: #38bdf8; border-color: #38bdf8; transform: translateY(-2px); }
        .g-dock-btn.active { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #020617; font-weight: 800; border-color: #34d399; box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }

        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .logo-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse-green 2s infinite; margin-right: 8px; }
        
        .toast { position: absolute; bottom: 20px; right: 20px; padding: 10px 18px; border-radius: 6px; font-weight: 800; opacity: 0; transform: translateY(12px); transition: all 0.25s; z-index: 100; pointer-events: none; font-size: 12px; font-family: monospace; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .toast.show { opacity: 1; transform: translateY(0); }
        
        .leaderboard { padding: 14px; background: #0b1120; border-top: 1px solid #1e293b; }
        .lb-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 11px; font-family: monospace; }
        .lb-bar-bg { flex-grow: 1; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
        .lb-bar-fg { height: 100%; transition: width 0.5s ease; }

        /* HUD Radar & XP elements */
        .radar-box { position: relative; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #38bdf8; background: rgba(56, 189, 248, 0.05); overflow: hidden; }
        .radar-sweep-line { position: absolute; top: 50%; left: 50%; width: 50%; height: 2px; background: linear-gradient(90deg, transparent, #38bdf8); transform-origin: left center; animation: radar-sweep 3s linear infinite; }
      </style>

      <div id="g-topbar" class="g-topbar">
        <div style="font-weight: 800; font-size: 15px; display: flex; align-items: center; gap: 10px;">
          <div class="radar-box"><div class="radar-sweep-line"></div></div>
          <div>
            <span style="color: #38bdf8; letter-spacing: 1px;">LYZER AI OS</span>
            <span style="font-size: 10px; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid rgba(16, 185, 129, 0.3);">LEVEL 42 COCKPIT</span>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="g-metric">
            <span class="g-metric-label">SYSTEM SCORE</span>
            <span class="g-metric-value" style="color: #fbbf24;" id="g-score">0.00</span>
          </div>
          <div class="g-metric">
            <span class="g-metric-label">THROUGHPUT</span>
            <span class="g-metric-value" style="color: #38bdf8;"><span id="g-tps-fixed">132,</span><span id="g-tps-rand">820</span> t/s</span>
          </div>
          <div class="g-metric">
            <span class="g-metric-label">DECISION STREAK</span>
            <span class="g-metric-value" style="color: #a855f7;" id="g-streak">🔥 47d</span>
          </div>
          <div class="g-metric">
            <span class="g-metric-label">LHDS THREAT</span>
            <span class="g-metric-value" id="g-lhds" style="letter-spacing: 2px;">●●●○○</span>
          </div>
        </div>

        <div style="display: flex; gap: 14px; align-items: center;">
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #a855f7; font-weight: 700;">XP: 84,250 / 100,000</div>
            <div style="width: 110px; height: 5px; background: #1e293b; border-radius: 3px; overflow: hidden; margin-top: 3px;">
              <div style="width: 84.2%; height: 100%; background: linear-gradient(90deg, #a855f7, #ec4899);"></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span style="background: #10b981; color: #020617; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;">SIMULATION MODE</span>
            <span id="g-clock" style="color: #94a3b8; font-size: 10px; font-family: monospace; margin-top: 2px;">00:00:00 UTC</span>
          </div>
        </div>
      </div>

      <div id="g-left" class="g-left"></div>
      <div id="g-main" class="g-main">
        <div id="g-main-content" style="height: 100%; flex-grow: 1;"></div>
        <div id="g-toast" class="toast"></div>
      </div>
      
      <div id="g-right" class="g-right">
        <div id="g-court-container" style="flex: 1; min-height: 380px; border-bottom: 1px solid #1e293b;"></div>
        <div class="leaderboard">
          <div style="color: #38bdf8; font-size: 11px; margin-bottom: 10px; font-weight: 800; display: flex; justify-content: space-between;">
            <span>🏆 ASSET SIGNAL LEADERBOARD</span>
            <span style="color: #4ade80;">LIVE</span>
          </div>
          <div id="g-leaderboard-list"></div>
        </div>
      </div>

      <div id="g-dock" class="g-dock"></div>
    `;

    // Render Dock Tabs
    const dockContainer = this._container.querySelector('#g-dock');
    const tabs = [
      { id: 'lacw-workspace-widget', icon: '🧠', label: 'LACW OS' },
      { id: 'cognitive-audit-widget', icon: '🔬', label: 'Cognitive Audit' },
      { id: 'alpha-discovery-widget', icon: '⚡', label: 'Alpha Discovery' },
      { id: 'observability-dashboard-widget', icon: '📡', label: 'Observability' },
      { id: 'timeline-widget', icon: '📌', label: 'Timeline' },
      { id: 'causal-graph-widget', icon: '🌐', label: 'Causal Graph' },
      { id: 'chart-host-widget', icon: '📈', label: 'Chart Host' },
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
        if (id !== this._activeWidgetId) {
          dockContainer.querySelectorAll('.g-dock-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this._activeWidgetId = id;
          await this._mountActiveWidget();
        }
      });
    });
  }

  async _mountStaticWidgets() {
    try {
      this._agentHub = new AgentHubWidget();
      await this._agentHub.mount(this._container.querySelector('#g-left'), this._mockRuntime);
    } catch (e) {
      console.warn('[GamifiedCockpit] AgentHub load warning:', e);
    }

    try {
      this._court = new CourtWidget();
      await this._court.mount(this._container.querySelector('#g-court-container'), this._mockRuntime);
    } catch (e) {
      console.warn('[GamifiedCockpit] Court load warning:', e);
    }
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
        // Always pass this._mockRuntime so subscribe methods never throw TypeError
        await this._activeWidgetInstance.mount(mainContent, this._mockRuntime);
      } catch (e) {
        mainContent.innerHTML = `<div style="padding: 24px; color: #ef4444; font-family: monospace;">❌ Widget Load Error [${this._activeWidgetId}]: ${e.message}</div>`;
        console.warn('Widget load error:', this._activeWidgetId, e);
      }
    } else {
      mainContent.innerHTML = `<div style="padding: 24px; color: #94a3b8; font-family: monospace;">Widget '${this._activeWidgetId}' not found in registry</div>`;
    }
  }

  _startGamification() {
    const setInt = (fn, ms) => {
      const id = setInterval(fn, ms);
      this._intervals.push(id);
      return id;
    };

    // Score counter
    let score = 0;
    const scoreEl = this._container.querySelector('#g-score');
    const scoreInt = setInt(() => {
      if (score < 98.75) {
        score += 1.25;
        if (score > 98.75) score = 98.75;
        if (scoreEl) scoreEl.innerText = score.toFixed(2);
      } else {
        clearInterval(scoreInt);
      }
    }, 20);

    // TPS flicker
    const tpsEl = this._container.querySelector('#g-tps-rand');
    setInt(() => {
      if (tpsEl) tpsEl.innerText = Math.floor(100 + Math.random() * 899);
    }, 80);

    // Clock
    const clockEl = this._container.querySelector('#g-clock');
    setInt(() => {
      if (clockEl) {
        const d = new Date();
        clockEl.innerText = d.toISOString().split('T')[1].split('.')[0] + ' UTC';
      }
    }, 1000);

    // Decision Streak
    let streak = 47;
    const streakEl = this._container.querySelector('#g-streak');
    setInt(() => {
      streak++;
      if (streak > 100) streak = 1;
      if (streakEl) streakEl.innerText = `🔥 ${streak}d`;
    }, 4000);

    // Flash Toast
    const toast = this._container.querySelector('#g-toast');
    setInt(() => {
      if (!toast) return;
      const isVeto = Math.random() > 0.85;
      toast.innerText = isVeto ? '🔴 COURT VETO: LHDS THRESHOLD EXCEEDED' : '✅ ECA COURT: ALLOW_TRANSITION (98.4%)';
      toast.style.background = isVeto ? '#ef4444' : '#10b981';
      toast.style.color = isVeto ? '#fff' : '#020617';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 1000);
    }, 5000);

    // Threat Level & Border
    const lhdsEl = this._container.querySelector('#g-lhds');
    const topbar = this._container.querySelector('#g-topbar');
    let trg = 0.3;
    let trgDir = 1;
    setInt(() => {
      trg += 0.04 * trgDir;
      if (trg >= 0.85) trgDir = -1;
      if (trg <= 0.25) trgDir = 1;
      
      if (!lhdsEl || !topbar) return;

      if (trg < 0.5) {
        lhdsEl.innerText = '●○○○○';
        lhdsEl.style.color = '#10b981';
        topbar.style.borderBottomColor = 'rgba(16, 185, 129, 0.4)';
      } else if (trg < 0.7) {
        lhdsEl.innerText = '●●●○○';
        lhdsEl.style.color = '#f59e0b';
        topbar.style.borderBottomColor = 'rgba(245, 158, 11, 0.4)';
      } else {
        lhdsEl.innerText = '●●●●●';
        lhdsEl.style.color = '#ef4444';
        topbar.style.borderBottomColor = 'rgba(239, 68, 68, 0.4)';
      }
    }, 1500);

    // Asset Leaderboard
    const assets = [
      { sym: 'BTC/USD', val: 82, dir: 1 },
      { sym: 'ETH/USD', val: 45, dir: -1 },
      { sym: 'SOL/USD', val: 94, dir: 1 },
      { sym: 'AAPL', val: 28, dir: -1 }
    ];
    const lbContainer = this._container.querySelector('#g-leaderboard-list');
    setInt(() => {
      if (!lbContainer) return;
      lbContainer.innerHTML = assets.map(a => {
        a.val += (Math.random() * 8 - 4);
        if (a.val > 100) a.val = 100;
        if (a.val < 0) a.val = 0;
        a.dir = a.val > 50 ? 1 : -1;
        const color = a.dir > 0 ? '#10b981' : '#ef4444';
        const arrow = a.dir > 0 ? '▲' : '▼';
        return `
          <div class="lb-row">
            <span style="width: 55px; font-weight: 700; color: #f8fafc;">${a.sym}</span>
            <div class="lb-bar-bg">
              <div class="lb-bar-fg" style="width: ${a.val}%; background: ${color};"></div>
            </div>
            <span style="width: 45px; text-align: right; color: ${color}; font-weight: 700;">${arrow} ${Math.round(a.val)}%</span>
          </div>
        `;
      }).join('');
    }, 2000);
  }

  unmount() {
    this._disposed = true;
    this._intervals.forEach(id => clearInterval(id));
    this._intervals = [];
    
    if (this._agentHub) {
      try { this._agentHub.dispose(); } catch (e) {}
      this._agentHub = null;
    }
    if (this._court) {
      try { this._court.dispose(); } catch (e) {}
      this._court = null;
    }
    if (this._activeWidgetInstance) {
      if (typeof this._activeWidgetInstance.dispose === 'function') {
        try { this._activeWidgetInstance.dispose(); } catch(e){}
      } else if (typeof this._activeWidgetInstance.unmount === 'function') {
        try { this._activeWidgetInstance.unmount(); } catch(e){}
      }
      this._activeWidgetInstance = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }
}
