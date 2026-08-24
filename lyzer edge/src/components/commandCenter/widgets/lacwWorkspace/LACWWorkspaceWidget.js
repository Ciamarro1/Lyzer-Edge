import { manifest } from './manifest.js';
import { LACWEventBus } from '../../sdk/lacw/LACWEventBus.js';
import { LACWLayoutEngine, WORKSPACE_PRESETS } from '../../sdk/lacw/LACWLayoutEngine.js';
import { LACWWidgetRegistry } from '../../sdk/lacw/LACWWidgetRegistry.js';
import { LACWCommandPalette } from '../../sdk/lacw/LACWCommandPalette.js';
import { LACWVisualizationEngine } from '../../sdk/lacw/LACWVisualizationEngine.js';
import { LACWExplainabilityEngine } from '../../sdk/lacw/LACWExplainabilityEngine.js';

export class LACWWorkspaceWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._disposed = false;

    this.eventBus = new LACWEventBus();
    this.layoutEngine = new LACWLayoutEngine(this.eventBus);
    this.widgetRegistry = new LACWWidgetRegistry(this.eventBus);
    this.commandPalette = new LACWCommandPalette(this.eventBus);
    this.vizEngine = new LACWVisualizationEngine();
    this.explainEngine = new LACWExplainabilityEngine();

    this._commandQuery = '';
    this._activeModal = null;
    this._keyListener = null;
  }

  async mount(container, context) {
    this._container = container;
    this._injectGlobalKeyboardShortcuts();
    this._render();
    return {
      dispose: () => this.dispose()
    };
  }

  _injectGlobalKeyboardShortcuts() {
    if (this._keyListener) return;
    this._keyListener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = this._container?.querySelector('#lacw-cmd-input');
        if (input) {
          input.focus();
          input.select();
          this._showToast('Command Palette Focused (Ctrl+K)');
        }
      } else if (e.key === 'Escape') {
        if (this._activeModal) {
          this._activeModal = null;
          this._render();
        }
      }
    };
    window.addEventListener('keydown', this._keyListener);
  }

  _render() {
    if (this._disposed || !this._container) return;

    const layout = this.layoutEngine.getLayoutSnapshot();
    const history = this.eventBus.getHistory('*', 5);
    const searchResults = this.commandPalette.searchCommands(this._commandQuery);

    this._container.innerHTML = `
      <div style="padding: 20px; font-family: 'JetBrains Mono', monospace; background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); color: #f8fafc; border-radius: 16px; font-size: 11px; border: 1px solid rgba(0, 243, 255, 0.2); box-shadow: 0 20px 50px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.15);">
        <!-- Header & State Bar -->
        <div style="font-weight: 800; color: #00f3ff; border-bottom: 1px solid rgba(0, 243, 255, 0.15); padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 14px; font-family: 'Inter', system-ui, sans-serif; letter-spacing: 1px;">LYZER ADAPTIVE COGNITIVE WORKSPACE (LACW OS)</span>
            <span style="background: rgba(176, 38, 255, 0.15); color: #b026ff; padding: 3px 8px; border-radius: 6px; font-size: 9px; border: 1px solid rgba(176, 38, 255, 0.3); font-weight: 800;">PRESET: ${layout.activePreset}</span>
          </div>
          <div style="color: #00ff9d; font-size: 10px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #00ff9d; box-shadow: 0 0 10px #00ff9d;"></span>
            COGNITIVE OS ACTIVE
          </div>
        </div>

        <!-- Ctrl+K Command Bar -->
        <div style="margin-bottom: 16px; background: rgba(10, 16, 32, 0.45); padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.18); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #94a3b8;">
            <span style="font-weight: 800; color: #ffb700;">Ctrl+K / Cmd+K Universal Command Palette</span>
            <span style="font-size: 10px; color: #64748b;">(Raycast / Cursor Cognitive Engine)</span>
          </div>
          <input
            id="lacw-cmd-input"
            type="text"
            placeholder="Type command (e.g. 'trading', 'research', 'explain', 'chart')..."
            value="${this._commandQuery}"
            style="width: 100%; background: rgba(3, 6, 14, 0.6); border: 1px solid rgba(0, 243, 255, 0.25); color: #00f3ff; padding: 8px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; box-sizing: border-box; outline: none; transition: all 0.2s;"
          />
          <div id="lacw-cmd-results" style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
            ${searchResults.slice(0, 4).map(cmd => `
              <button class="lacw-cmd-btn" data-cmd="${cmd.id}" style="background: rgba(15, 23, 42, 0.5); color: #00f3ff; border: 1px solid rgba(0, 243, 255, 0.25); padding: 6px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; cursor: pointer; font-size: 10px; font-weight: 700; transition: all 0.2s;">
                ${cmd.shortcut ? `<span style="color: #ffb700;">[${cmd.shortcut}]</span> ` : ''}${cmd.title}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Workspace Presets Bar -->
        <div style="margin-bottom: 16px; background: rgba(10, 16, 32, 0.45); padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15); display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="color: #94a3b8; font-weight: 800; margin-right: 6px; font-size: 10px;">PRESET LAYOUTS:</span>
          ${WORKSPACE_PRESETS.map(p => `
            <button class="lacw-preset-btn" data-preset="${p}" style="background: ${p === layout.activePreset ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(0, 255, 157, 0.15))' : 'rgba(15, 23, 42, 0.4)'}; color: ${p === layout.activePreset ? '#00f3ff' : '#94a3b8'}; border: 1px solid ${p === layout.activePreset ? 'rgba(0, 243, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)'}; padding: 6px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px; cursor: pointer; font-weight: 800; transition: all 0.2s;">
              ${p}
            </button>
          `).join('')}
        </div>

        <!-- Main Adaptive Docking Canvas -->
        <div style="display: grid; grid-template-columns: 240px 1fr 280px; gap: 14px; margin-bottom: 16px; min-height: 180px;">
          <!-- Left Panel -->
          <div style="background: rgba(10, 16, 32, 0.45); padding: 14px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);">
            <div style="color: #00f3ff; font-weight: 800; border-bottom: 1px solid rgba(0, 243, 255, 0.15); padding-bottom: 6px; margin-bottom: 10px;">
              LEFT DOCK REGION
            </div>
            ${layout.regions.LEFT_PANEL.widgets.map(w => `<div style="color: #00ff9d; margin-bottom: 4px; font-weight: 600;">• \`${w}\`</div>`).join('')}
          </div>

          <!-- Center Canvas -->
          <div style="background: rgba(10, 16, 32, 0.45); padding: 14px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);">
            <div style="color: #00f3ff; font-weight: 800; border-bottom: 1px solid rgba(0, 243, 255, 0.15); padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <span>CENTER WORKSPACE CANVAS</span>
              <button id="lacw-explain-btn" style="background: linear-gradient(135deg, rgba(176, 38, 255, 0.25), rgba(0, 243, 255, 0.15)); color: #b026ff; border: 1px solid rgba(176, 38, 255, 0.4); padding: 4px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; cursor: pointer; transition: all 0.2s;">
                Explain Lineage
              </button>
            </div>
            ${layout.regions.CENTER_CANVAS.widgets.map(w => `<div style="color: #00f3ff; margin-bottom: 4px; font-weight: 600;">• \`${w}\`</div>`).join('')}
          </div>

          <!-- Right Panel -->
          <div style="background: rgba(10, 16, 32, 0.45); padding: 14px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);">
            <div style="color: #00f3ff; font-weight: 800; border-bottom: 1px solid rgba(0, 243, 255, 0.15); padding-bottom: 6px; margin-bottom: 10px;">
              RIGHT COURT REGION
            </div>
            ${layout.regions.RIGHT_PANEL.widgets.map(w => `<div style="color: #ffb700; margin-bottom: 4px; font-weight: 600;">• \`${w}\`</div>`).join('')}
          </div>
        </div>

        <!-- Event Bus Stream Footer -->
        <div style="background: rgba(10, 16, 32, 0.45); padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15);">
          <div style="color: #94a3b8; font-weight: 800; margin-bottom: 6px; font-size: 10px;">Real-Time Event Bus History (Decoupled Stream):</div>
          ${history.length > 0 ? history.map(evt => `
            <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 3px;">
              <span style="color: #b026ff; font-weight: 700;">[${evt.priority}]</span> <strong style="color: #00f3ff;">${evt.topic}</strong>: ${JSON.stringify(evt.payload)}
            </div>
          `).join('') : '<div style="color: #64748b;">No events captured yet. Click presets or run commands to emit events.</div>'}
        </div>

        <!-- Explainability Modal Overlay -->
        ${this._activeModal ? `
          <div style="margin-top: 14px; background: rgba(20, 10, 35, 0.7); backdrop-filter: blur(20px); padding: 16px; border-radius: 12px; border: 1px solid #b026ff; box-shadow: 0 10px 30px rgba(176,38,255,0.2);">
            <div style="color: #b026ff; font-weight: 800; margin-bottom: 8px; display: flex; justify-content: space-between; font-size: 12px;">
              <span>EXPLAINABILITY LINEAGE & ATTRIBUTION AUDIT</span>
              <button id="lacw-modal-close" style="background: none; border: none; color: #ff3366; cursor: pointer; font-family: monospace; font-weight: 800;">[Close]</button>
            </div>
            <div style="color: #cbd5e1; font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
              <div>Entity ID: <strong>${this._activeModal.entityId}</strong></div>
              <div>Calculated By: <span style="color: #00f3ff; font-weight: 700;">${this._activeModal.calculatedBy}</span></div>
              <div>Confidence: <strong style="color: #00ff9d;">${(this._activeModal.confidenceScore * 100).toFixed(1)}%</strong></div>
              <div>Participating Agents: ${this._activeModal.participatingAgents.join(', ')}</div>
              <div>ECA Court Certificate: <span style="color: #00ff9d; font-weight: 700;">${this._activeModal.constitutionalCourtApproval.status} (${this._activeModal.constitutionalCourtApproval.certificateId})</span></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const input = this._container.querySelector('#lacw-cmd-input');
    if (input) {
      input.addEventListener('input', (e) => {
        this._commandQuery = e.target.value;
        const searchResults = this.commandPalette.searchCommands(this._commandQuery);
        const resultsEl = this._container.querySelector('#lacw-cmd-results');
        if (resultsEl) {
          resultsEl.innerHTML = searchResults.slice(0, 4).map(cmd => `
            <button class="lacw-cmd-btn" data-cmd="${cmd.id}" style="background: rgba(15, 23, 42, 0.5); color: #00f3ff; border: 1px solid rgba(0, 243, 255, 0.25); padding: 6px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; cursor: pointer; font-size: 10px; font-weight: 700; transition: all 0.2s;">
              ${cmd.shortcut ? `<span style="color: #ffb700;">[${cmd.shortcut}]</span> ` : ''}${cmd.title}
            </button>
          `).join('');
          this._bindCmdButtons();
        }
      });
    }

    this._container.querySelectorAll('.lacw-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        this.layoutEngine.switchPreset(preset);
        this._showToast(`Preset Switched to: ${preset}`);
        
        // Map all 10 presets to corresponding main dock tabs
        const presetTabMap = {
          'EXECUTIVE': 'edge-dashboard-widget',
          'RESEARCH': 'pattern-recognition-widget',
          'REVENUE': 'testnet-dashboard-widget',
          'EXPERIMENT': 'chart-host-widget',
          'KNOWLEDGE': 'cognitive-audit-widget',
          'MEMORY': 'causal-graph-widget',
          'OBSERVABILITY': 'observability-dashboard-widget',
          'DEVELOPMENT': 'runtime-inspector-widget',
          'INCIDENT_RESPONSE': 'reality-status-widget',
          'GOVERNANCE': 'cognitive-audit-widget'
        };
        const targetTab = presetTabMap[preset];
        if (targetTab) {
          window.dispatchEvent(new CustomEvent('lyzer:switch-dock-tab', { detail: { tabId: targetTab } }));
        }
        this._render();
      });
    });

    this._bindCmdButtons();

    const explainBtn = this._container.querySelector('#lacw-explain-btn');
    if (explainBtn) {
      explainBtn.addEventListener('click', () => {
        this._activeModal = this.explainEngine.explainEntity('dec_market_99182');
        this._showToast('Generated Causal Lineage Audit');
        this._render();
      });
    }

    const closeBtn = this._container.querySelector('#lacw-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this._activeModal = null;
        this._render();
      });
    }
  }

  _bindCmdButtons() {
    this._container.querySelectorAll('.lacw-cmd-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cmdId = btn.getAttribute('data-cmd');
        await this.commandPalette.executeCommand(cmdId, { layoutEngine: this.layoutEngine });
        this._showToast(`Executed Command: ${cmdId}`);

        const cmdTabMap = {
          'cmd_switch_trading': 'chart-host-widget',
          'cmd_switch_research': 'pattern-recognition-widget',
          'cmd_switch_execution': 'edge-dashboard-widget',
          'cmd_explain_decision': 'cognitive-audit-widget',
          'cmd_open_observability': 'observability-dashboard-widget',
          'cmd_open_memory': 'causal-graph-widget',
          'cmd_open_dev': 'runtime-inspector-widget'
        };
        const targetTab = cmdTabMap[cmdId];
        if (targetTab) {
          window.dispatchEvent(new CustomEvent('lyzer:switch-dock-tab', { detail: { tabId: targetTab } }));
        }

        this._render();
      });
    });
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
    }, 3000);
  }

  dispose() {
    this._disposed = true;
    if (this._keyListener) {
      window.removeEventListener('keydown', this._keyListener);
      this._keyListener = null;
    }
    if (this.eventBus) this.eventBus.dispose();
    if (this.layoutEngine) this.layoutEngine.dispose();
    if (this.widgetRegistry) this.widgetRegistry.dispose();
    if (this.commandPalette) this.commandPalette.dispose();
    if (this.vizEngine) this.vizEngine.dispose();
    if (this.explainEngine) this.explainEngine.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
