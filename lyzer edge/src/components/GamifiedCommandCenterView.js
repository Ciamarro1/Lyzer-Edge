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
    this._container.style.gridTemplateRows = '60px 1fr 52px';
    this._container.style.gridTemplateColumns = '280px 1fr 260px';
    this._container.style.height = '100vh';
    this._container.style.width = '100vw';
    this._container.style.backgroundColor = '#020617';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = 'monospace';
    this._container.style.overflow = 'hidden';

    this._renderShell();
    await this._mountStaticWidgets();
    await this._mountActiveWidget();
    this._startGamification();
  }

  _renderShell() {
    this._container.innerHTML = `
      <style>
        .g-topbar { grid-column: 1 / 4; background: #0f172a; border-bottom: 2px solid #10b981; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; transition: border-color 0.5s; z-index: 10; }
        .g-left { grid-column: 1; border-right: 1px solid #1e293b; overflow-y: auto; }
        .g-main { grid-column: 2; overflow-y: auto; background: #020617; position: relative; }
        .g-right { grid-column: 3; border-left: 1px solid #1e293b; overflow-y: auto; display: flex; flex-direction: column; }
        .g-dock { grid-column: 1 / 4; background: #0f172a; border-top: 1px solid #1e293b; display: flex; align-items: center; padding: 0 16px; overflow-x: auto; gap: 8px; z-index: 10; }
        
        .g-metric { display: flex; flex-direction: column; align-items: center; background: #1e293b; padding: 4px 12px; border-radius: 4px; }
        .g-metric-label { font-size: 10px; color: #94a3b8; }
        .g-metric-value { font-size: 16px; font-weight: bold; }
        
        .g-dock-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #1e293b; color: #94a3b8; border: 1px solid transparent; border-radius: 4px; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .g-dock-btn:hover { background: #334155; color: #f8fafc; }
        .g-dock-btn.active { background: #10b981; color: #020617; font-weight: bold; }

        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .logo-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse-green 2s infinite; margin-right: 8px; }
        
        .toast { position: absolute; bottom: 16px; right: 16px; padding: 8px 16px; border-radius: 4px; font-weight: bold; opacity: 0; transform: translateY(10px); transition: all 0.2s; z-index: 100; pointer-events: none; }
        .toast.show { opacity: 1; transform: translateY(0); }
        
        .leaderboard { padding: 12px; }
        .lb-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; }
        .lb-bar-bg { flex-grow: 1; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
        .lb-bar-fg { height: 100%; transition: width 0.5s ease; }
      </style>

      <div id="g-topbar" class="g-topbar">
        <div style="font-weight: bold; font-size: 16px; display: flex; align-items: center;">
          <span class="logo-dot"></span> COGNITIVE COCKPIT
        </div>
        <div style="display: flex; gap: 16px;">
          <div class="g-metric">
            <span class="g-metric-label">SYSTEM SCORE</span>
            <span class="g-metric-value" style="color: #fbbf24;" id="g-score">0.00</span>
          </div>
          <div class="g-metric">
            <span class="g-metric-label">THROUGHPUT</span>
            <span class="g-metric-value" style="color: #22d3ee;"><span id="g-tps-fixed">132,</span><span id="g-tps-rand">820</span> t/s</span>
          </div>
          <div class="g-metric">
            <span class="g-metric-label">DECISION STREAK</span>
            <span class="g-metric-value" style="color: #a855f7;" id="g-streak">0</span>
          </div>
          <div class="g-metric">
            <span class="g-metric-label">LHDS LEVEL</span>
            <span class="g-metric-value" id="g-lhds" style="letter-spacing: 2px;">●●●○○</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end;">
          <span style="background: #10b981; color: #020617; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-bottom: 4px;">SIMULATION</span>
          <span id="g-clock" style="color: #94a3b8; font-size: 10px;">00:00:00 UTC</span>
        </div>
      </div>

      <div id="g-left" class="g-left"></div>
      <div id="g-main" class="g-main">
        <div id="g-main-content" style="height: 100%;"></div>
        <div id="g-toast" class="toast"></div>
      </div>
      
      <div id="g-right" class="g-right">
        <div id="g-court-container" style="flex: 1; min-height: 400px; border-bottom: 1px solid #1e293b;"></div>
        <div class="leaderboard">
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 12px; font-weight: bold;">ASSET SIGNAL STRENGTH (SIM)</div>
          <div id="g-leaderboard-list"></div>
        </div>
      </div>

      <div id="g-dock" class="g-dock"></div>
    `;

    // Render Dock
    const dockContainer = this._container.querySelector('#g-dock');
    const tabs = [
      { id: 'lacw-workspace-widget', icon: '🧠', label: 'LACW OS' },
      { id: 'cognitive-audit-widget', icon: '🔬', label: 'Cognitive Audit' },
      { id: 'alpha-discovery-widget', icon: '⚡', label: 'Alpha Discovery' },
      { id: 'observability-dashboard-widget', icon: '📡', label: 'Observability' },
      { id: 'timeline-widget', icon: '📌', label: 'Timeline' },
      { id: 'causal-graph-widget', icon: '🌐', label: 'Causal Graph' },
      { id: 'chart-host-widget', icon: '📈', label: 'Chart' },
      { id: 'runtime-inspector-widget', icon: '⚙️', label: 'Runtime' },
      { id: 'reality-status-widget', icon: '🌍', label: 'Reality' }
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
      await this._agentHub.mount(this._container.querySelector('#g-left'));
    } catch (e) {
      console.warn('AgentHub load failed', e);
    }

    try {
      this._court = new CourtWidget();
      await this._court.mount(this._container.querySelector('#g-court-container'));
    } catch (e) {
      console.warn('Court load failed', e);
    }
  }

  async _mountActiveWidget() {
    const mainContent = this._container.querySelector('#g-main-content');
    
    if (this._activeWidgetInstance && typeof this._activeWidgetInstance.dispose === 'function') {
      try { this._activeWidgetInstance.dispose(); } catch (e) { console.warn(e); }
    } else if (this._activeWidgetInstance && typeof this._activeWidgetInstance.unmount === 'function') {
      try { this._activeWidgetInstance.unmount(); } catch (e) { console.warn(e); }
    }

    mainContent.innerHTML = '';
    this._activeWidgetInstance = null;

    const WidgetClass = this._widgetRegistry[this._activeWidgetId];
    if (WidgetClass) {
      try {
        this._activeWidgetInstance = new WidgetClass();
        await this._activeWidgetInstance.mount(mainContent);
      } catch (e) {
        mainContent.innerHTML = `<div style="padding: 20px; color: #ef4444;">Error loading widget: ${e.message}</div>`;
        console.warn('Widget load failed:', this._activeWidgetId, e);
      }
    } else {
      mainContent.innerHTML = `<div style="padding: 20px; color: #94a3b8;">Widget not found in registry</div>`;
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
    let streak = 0;
    const streakEl = this._container.querySelector('#g-streak');
    setInt(() => {
      streak++;
      if (streak > 100) streak = 0;
      if (streakEl) streakEl.innerText = streak;
    }, 4000);

    // Flash Toast
    const toast = this._container.querySelector('#g-toast');
    setInt(() => {
      if (!toast) return;
      const isVeto = Math.random() > 0.8;
      toast.innerText = isVeto ? '🔴 VETOED' : '✅ ALLOW_TRANSITION';
      toast.style.background = isVeto ? '#ef4444' : '#10b981';
      toast.style.color = isVeto ? '#fff' : '#020617';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 800);
    }, 5200);

    // Threat Level & Border
    const lhdsEl = this._container.querySelector('#g-lhds');
    const topbar = this._container.querySelector('#g-topbar');
    let trg = 0.3;
    let trgDir = 1;
    setInt(() => {
      trg += 0.05 * trgDir;
      if (trg >= 0.9) trgDir = -1;
      if (trg <= 0.3) trgDir = 1;
      
      if (!lhdsEl || !topbar) return;

      if (trg < 0.5) {
        lhdsEl.innerText = '●○○○○';
        lhdsEl.style.color = '#10b981';
        topbar.style.borderBottomColor = '#10b981';
      } else if (trg < 0.7) {
        lhdsEl.innerText = '●●●○○';
        lhdsEl.style.color = '#f59e0b';
        topbar.style.borderBottomColor = '#f59e0b';
      } else {
        lhdsEl.innerText = '●●●●●';
        lhdsEl.style.color = '#ef4444';
        topbar.style.borderBottomColor = '#ef4444';
      }
    }, 1500);

    // Leaderboard
    const assets = [
      { sym: 'BTC', val: 80, dir: 1 },
      { sym: 'ETH', val: 40, dir: -1 },
      { sym: 'SOL', val: 95, dir: 1 },
      { sym: 'AAPL', val: 20, dir: -1 }
    ];
    const lbContainer = this._container.querySelector('#g-leaderboard-list');
    setInt(() => {
      if (!lbContainer) return;
      lbContainer.innerHTML = assets.map(a => {
        a.val += (Math.random() * 10 - 5);
        if (a.val > 100) a.val = 100;
        if (a.val < 0) a.val = 0;
        a.dir = a.val > 50 ? 1 : -1;
        const color = a.dir > 0 ? '#10b981' : '#ef4444';
        return `
          <div class="lb-row">
            <span style="width: 40px; font-weight: bold; color: #cbd5e1;">${a.sym}</span>
            <div class="lb-bar-bg">
              <div class="lb-bar-fg" style="width: ${a.val}%; background: ${color};"></div>
            </div>
            <span style="width: 30px; text-align: right; color: ${color};">${Math.round(a.val)}%</span>
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
