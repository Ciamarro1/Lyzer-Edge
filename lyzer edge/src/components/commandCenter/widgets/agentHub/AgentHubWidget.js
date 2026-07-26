import { UniversalAgentModel } from '../../sdk/lacw/agents/UniversalAgentModel.js';
import { AgentOrchestratorEngine } from '../../sdk/lacw/agents/AgentOrchestratorEngine.js';
import { agentHubManifest } from './manifest.js';

export class AgentHubWidget {
  constructor() {
    this.manifest = agentHubManifest;
    this._container = null;
    this._orchestrator = new AgentOrchestratorEngine();
    this._models = [];
    this._ticker = null;
    this._disposed = false;
  }

  async mount(container, context) {
    this._container = container;
    
    if (!document.getElementById('agent-hub-styles')) {
      const style = document.createElement('style');
      style.id = 'agent-hub-styles';
      style.textContent = `
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        @keyframes card-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .agent-card.EXECUTING, .agent-card::before, .agent-dot.EXECUTING { animation: none !important; }
        }
        .agent-card {
          background: rgba(8, 14, 28, 0.5);
          backdrop-filter: blur(16px) saturate(1.3);
          -webkit-backdrop-filter: blur(16px) saturate(1.3);
          border: 1px solid rgba(56, 189, 248, 0.06);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          animation: slide-in 0.3s ease-out;
        }
        .agent-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, rgb(var(--accent-rgb)), rgba(var(--accent-rgb), 0.3));
          border-radius: 3px 0 0 3px;
        }
        .agent-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events: none;
        }
        .agent-card:hover {
          border-color: rgba(56, 189, 248, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3), 0 0 15px rgba(var(--accent-rgb), 0.05);
        }
        .agent-card.EXECUTING::before { animation: card-glow 2s ease-in-out infinite; }
        .agent-card.EXECUTING { --accent-rgb: 245, 158, 11; }
        .agent-card.AVAILABLE { --accent-rgb: 16, 185, 129; }
        .agent-card.LEARNING { --accent-rgb: 59, 130, 246; }
        .agent-card.INITIALIZED { --accent-rgb: 99, 102, 241; }
        .agent-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 9px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .agent-badge.AVAILABLE { color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.15); }
        .agent-badge.EXECUTING { color: #f59e0b; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.15); }
        .agent-badge.LEARNING { color: #60a5fa; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.15); }
        .agent-badge.INITIALIZED { color: #818cf8; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.15); }
        .agent-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
        .agent-dot.AVAILABLE { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.6); }
        .agent-dot.EXECUTING { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.6); animation: pulse-dot 1s ease-in-out infinite; }
        .agent-dot.LEARNING { background: #60a5fa; box-shadow: 0 0 6px rgba(59,130,246,0.6); }
        .agent-dot.INITIALIZED { background: #818cf8; box-shadow: 0 0 6px rgba(99,102,241,0.6); }
        .agent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .agent-name { font-size: 12px; font-weight: 700; color: #f1f5f9; letter-spacing: 0.2px; }
        .agent-purpose { color: rgba(148, 163, 184, 0.6); font-size: 10px; margin-bottom: 6px; font-family: 'JetBrains Mono', monospace; }
        .agent-mission { color: rgba(203, 213, 225, 0.5); font-size: 10px; margin-bottom: 10px; font-style: italic; border-left: 2px solid rgba(148,163,184,0.08); padding-left: 8px; }
        .agent-progress { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
        .agent-progress-bg { flex-grow: 1; height: 3px; background: rgba(30, 41, 59, 0.3); border-radius: 2px; overflow: hidden; }
        .agent-progress-fg { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
        .agent-progress-fg.AVAILABLE { background: linear-gradient(90deg, #10b981, #34d399); }
        .agent-progress-fg.EXECUTING { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .agent-progress-fg.LEARNING { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        .agent-progress-fg.INITIALIZED { background: linear-gradient(90deg, #6366f1, #818cf8); }
        .agent-delegate-btn {
          width: 100%; padding: 6px; background: rgba(15, 23, 42, 0.3);
          color: rgba(148, 163, 184, 0.6); border: 1px solid rgba(148, 163, 184, 0.06);
          border-radius: 6px; cursor: pointer; font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px; font-weight: 500; transition: all 0.3s;
        }
        .agent-delegate-btn:hover { background: rgba(56, 189, 248, 0.06); color: #38bdf8; border-color: rgba(56, 189, 248, 0.15); }
      `;
      document.head.appendChild(style);
    }

    const agentsData = [
      { id: 'ag_research', name: 'ResearchAgent', purpose: 'Quantitative Research', mission: 'Discover SMC alpha patterns', capabilities: ['market_data:read', 'evidence:publish'] },
      { id: 'ag_risk', name: 'RiskGuardAgent', purpose: 'Risk Management', mission: 'Monitor LHDS and veto dangerous signals', capabilities: ['risk:assess', 'veto:execute'] },
      { id: 'ag_alpha', name: 'AlphaHunterAgent', purpose: 'Alpha Discovery', mission: 'Scan for inefficiencies in order flow', capabilities: ['market_data:read', 'pattern:detect'] },
      { id: 'ag_exec', name: 'ExecutionAgent', purpose: 'Execution Optimization', mission: 'Minimize slippage and maximize fill quality', capabilities: ['execution:optimize', 'market_data:read'] },
      { id: 'ag_learn', name: 'LearningAgent', purpose: 'Continuous Learning', mission: 'Update strategy weights from recent outcomes', capabilities: ['history:read', 'weights:update'] }
    ];

    this._models = agentsData.map(data => {
      const model = new UniversalAgentModel(data);
      this._orchestrator.registerAgent(model);
      model.transitionLifecycle('INITIALIZED');
      model.transitionLifecycle('AVAILABLE');
      return model;
    });

    this.render();

    this._ticker = setInterval(() => {
      if (this._disposed) return;
      const available = this._models.filter(m => m.getAgentSnapshot().status === 'AVAILABLE');
      if (available.length > 0) {
        const selected = available[Math.floor(Math.random() * available.length)];
        selected.transitionLifecycle('EXECUTING');
        this.render();
        setTimeout(() => {
          if (this._disposed) return;
          if (selected.getAgentSnapshot().status === 'EXECUTING') {
            selected.transitionLifecycle('AVAILABLE');
            this.render();
          }
        }, 1500);
      }
    }, 3000);

    return { dispose: () => this.dispose() };
  }

  render() {
    if (!this._container || this._disposed) return;
    
    let html = `<div style="padding: 16px; height: 100%; box-sizing: border-box; overflow-y: auto;">
      <div style="color: rgba(56, 189, 248, 0.5); font-weight: 700; margin-bottom: 16px; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px rgba(56,189,248,0.4);"></span>
        AGENT HUB
        <span style="color: rgba(148, 163, 184, 0.2); font-size: 9px;">(${this._models.length})</span>
      </div>
    `;

    for (const model of this._models) {
      const snap = model.getAgentSnapshot();
      const accPct = (snap.metrics.accuracy * 100).toFixed(1);
      html += `
        <div class="agent-card ${snap.status}">
          <div class="agent-header">
            <span class="agent-name">${snap.name}</span>
            <span class="agent-badge ${snap.status}"><span class="agent-dot ${snap.status}"></span>${snap.status}</span>
          </div>
          <div class="agent-purpose">${snap.purpose}</div>
          <div class="agent-mission">"${snap.mission}"</div>
          
          <div class="agent-progress">
            <div class="agent-progress-bg">
              <div class="agent-progress-fg ${snap.status}" style="width: ${accPct}%;"></div>
            </div>
            <span style="color: rgba(148, 163, 184, 0.4); font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600;">${accPct}%</span>
          </div>

          <button class="agent-delegate-btn">
            ${snap.status === 'AVAILABLE' ? '→ Delegate Mission' : snap.status === 'EXECUTING' ? '◉ Executing...' : '● Standby'}
          </button>
        </div>
      `;
    }

    html += '</div>';
    this._container.innerHTML = html;
    this._bindEvents();
  }

  _bindEvents() {
    if (!this._container) return;
    const btns = this._container.querySelectorAll('.agent-delegate-btn');
    btns.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const model = this._models[index];
        if (!model) return;
        this._handleDelegate(model);
      });
    });
  }

  _handleDelegate(model) {
    const snap = model.getAgentSnapshot();
    if (snap.status === 'EXECUTING') {
      this._showToast(`${snap.name} is currently executing a mission...`);
      return;
    }

    const presets = [
      'Audit BTC/USD Orderbook Liquidity & TRG',
      'Scan ETH/USD for Toxic SMC Signatures',
      'Recalibrate ECA Court Veto Thresholds',
      'Benchmark UUIDv7 Execution Latency'
    ];

    const chosenMission = prompt(
      `DELEGATE MISSION TO [${snap.name}]\n\nEnter custom objective or choose preset:\n1. ${presets[0]}\n2. ${presets[1]}\n3. ${presets[2]}\n4. ${presets[3]}`,
      presets[0]
    );

    if (!chosenMission) return;

    model.updateMission(chosenMission);
    model.transitionLifecycle('EXECUTING');
    this.render();

    this._showToast(`Mission Delegated to ${snap.name}: "${chosenMission}"`);

    window.dispatchEvent(new CustomEvent('lyzer:agent-mission-delegated', {
      detail: { agentId: snap.id, agentName: snap.name, mission: chosenMission, timestamp: Date.now() }
    }));

    setTimeout(() => {
      if (this._disposed) return;
      model.updateMetrics({ accuracy: Math.min(0.99, snap.metrics.accuracy + 0.015) });
      model.transitionLifecycle('AVAILABLE');
      this.render();
      this._showToast(`${snap.name} Completed Mission Successfully!`);
    }, 4000);
  }

  _showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 24px; z-index: 999;
      background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8);
      border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px;
      padding: 12px 18px; color: #00f3ff; font-family: 'JetBrains Mono', monospace;
      font-size: 11px; font-weight: 700; box-shadow: 0 15px 40px rgba(0,0,0,0.7), 0 0 25px rgba(0,243,255,0.2), inset 0 1px 1px rgba(255,255,255,0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  dispose() {
    this._disposed = true;
    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
    if (this._orchestrator) {
      this._orchestrator.dispose();
    }
    for (const model of this._models) {
      model.dispose();
    }
    this._models = [];
    if (this._container) {
      this._container.innerHTML = '';
    }
  }
}
