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
    
    // Inject styles
    if (!document.getElementById('agent-hub-styles')) {
      const style = document.createElement('style');
      style.id = 'agent-hub-styles';
      style.textContent = `
        @keyframes pulse-amber {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .agent-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          color: #f8fafc;
          font-family: monospace;
          font-size: 11px;
          transition: all 0.2s;
        }
        .agent-card:hover {
          border-color: #38bdf8;
          transform: translateY(-1px);
        }
        .badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .badge.AVAILABLE { color: #10b981; background: rgba(16,185,129,0.1); }
        .badge.EXECUTING { color: #f59e0b; background: rgba(245,158,11,0.1); }
        .badge.LEARNING { color: #3b82f6; background: rgba(59,130,246,0.1); }
        .badge.INITIALIZED { color: #6366f1; background: rgba(99,102,241,0.1); }
        
        .dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot.AVAILABLE { background: #10b981; }
        .dot.EXECUTING { background: #f59e0b; animation: pulse-amber 1.5s infinite; }
        .dot.LEARNING { background: #3b82f6; }
        .dot.INITIALIZED { background: #6366f1; }
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
    
    let html = `<div style="padding: 12px; height: 100%; box-sizing: border-box; overflow-y: auto;">
      <div style="color: #38bdf8; font-weight: bold; margin-bottom: 12px; font-family: monospace;">🧩 COGNITIVE AGENT HUB</div>
    `;

    for (const model of this._models) {
      const snap = model.getAgentSnapshot();
      html += `
        <div class="agent-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: #f8fafc; font-size: 12px;">${snap.name}</strong>
            <span class="badge ${snap.status}"><span class="dot ${snap.status}"></span>${snap.status}</span>
          </div>
          <div style="color: #94a3b8; margin-bottom: 4px;">${snap.purpose}</div>
          <div style="color: #cbd5e1; margin-bottom: 8px; font-style: italic;">"${snap.mission}"</div>
          
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="flex-grow: 1; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${snap.metrics.accuracy * 100}%; background: #10b981;"></div>
            </div>
            <span style="color: #10b981;">${(snap.metrics.accuracy * 100).toFixed(1)}%</span>
          </div>

          <button style="width: 100%; padding: 4px; background: #1e293b; color: #38bdf8; border: 1px solid #334155; border-radius: 4px; cursor: pointer; font-family: monospace; transition: background 0.2s;">
            Delegate Mission
          </button>
        </div>
      `;
    }

    html += '</div>';
    this._container.innerHTML = html;
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
