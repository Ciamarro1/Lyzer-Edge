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
  }

  async mount(container, context) {
    this._container = container;
    this._render();
    return {
      dispose: () => this.dispose()
    };
  }

  _render() {
    if (this._disposed || !this._container) return;

    const layout = this.layoutEngine.getLayoutSnapshot();
    const history = this.eventBus.getHistory('*', 5);
    const searchResults = this.commandPalette.searchCommands(this._commandQuery);

    this._container.innerHTML = `
      <div style="padding: 14px; font-family: monospace; background: #040711; color: #f8fafc; border-radius: 8px; font-size: 11px; border: 1px solid #1e293b;">
        <!-- Header & State Bar -->
        <div style="font-weight: bold; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 13px;">🧠 LYZER ADAPTIVE COGNITIVE WORKSPACE (LACW)</span>
            <span style="background: #1e1b4b; color: #a855f7; padding: 2px 6px; border-radius: 4px; font-size: 9px; border: 1px solid #4c1d95;">PRESET: ${layout.activePreset}</span>
          </div>
          <div style="color: #4ade80; font-size: 10px;">● COGNITIVE OS ACTIVE</div>
        </div>

        <!-- Ctrl+K Command Bar -->
        <div style="margin-bottom: 10px; background: #0f172a; padding: 8px; border-radius: 6px; border: 1px solid #334155;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #94a3b8;">
            <span style="font-weight: bold; color: #facc15;">⌨️ Ctrl+K Universal Command Palette</span>
            <span>(Raycast/Cursor Engine)</span>
          </div>
          <input
            id="lacw-cmd-input"
            type="text"
            placeholder="Type command (e.g. 'switch', 'agent', 'explain', 'traces')..."
            value="${this._commandQuery}"
            style="width: 100%; background: #020617; border: 1px solid #334155; color: #38bdf8; padding: 6px; border-radius: 4px; font-family: monospace; font-size: 11px; box-sizing: border-box;"
          />
          <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${searchResults.slice(0, 4).map(cmd => `
              <button class="lacw-cmd-btn" data-cmd="${cmd.id}" style="background: #1e293b; color: #cbd5e1; border: 1px solid #475569; padding: 4px 8px; border-radius: 4px; font-family: monospace; cursor: pointer; font-size: 10px;">
                ${cmd.shortcut ? `<span style="color: #facc15;">[${cmd.shortcut}]</span> ` : ''}${cmd.title}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Workspace Presets Bar -->
        <div style="margin-bottom: 10px; background: #0f172a; padding: 6px; border-radius: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
          <span style="color: #94a3b8; align-self: center; font-weight: bold; margin-right: 4px;">Presets:</span>
          ${WORKSPACE_PRESETS.map(p => `
            <button class="lacw-preset-btn" data-preset="${p}" style="background: ${p === layout.activePreset ? '#38bdf8' : '#1e293b'}; color: ${p === layout.activePreset ? '#020617' : '#94a3b8'}; border: none; padding: 3px 6px; border-radius: 3px; font-family: monospace; font-size: 9px; cursor: pointer; font-weight: bold;">
              ${p}
            </button>
          `).join('')}
        </div>

        <!-- Main Adaptive Docking Canvas -->
        <div style="display: grid; grid-template-columns: 240px 1fr 280px; gap: 8px; margin-bottom: 10px; min-height: 160px;">
          <!-- Left Panel -->
          <div style="background: #0f172a; padding: 8px; border-radius: 4px; border: 1px solid #1e293b;">
            <div style="color: #38bdf8; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 6px;">
              📌 LEFT PANEL
            </div>
            ${layout.regions.LEFT_PANEL.widgets.map(w => `<div style="color: #4ade80; margin-bottom: 2px;">• \`${w}\`</div>`).join('')}
          </div>

          <!-- Center Canvas -->
          <div style="background: #0f172a; padding: 8px; border-radius: 4px; border: 1px solid #1e293b;">
            <div style="color: #38bdf8; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>🌐 CENTER CANVAS</span>
              <button id="lacw-explain-btn" style="background: #a855f7; color: white; border: none; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 9px; cursor: pointer;">
                🔍 Explain Lineage
              </button>
            </div>
            ${layout.regions.CENTER_CANVAS.widgets.map(w => `<div style="color: #38bdf8; margin-bottom: 2px;">• \`${w}\`</div>`).join('')}
          </div>

          <!-- Right Panel -->
          <div style="background: #0f172a; padding: 8px; border-radius: 4px; border: 1px solid #1e293b;">
            <div style="color: #38bdf8; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 6px;">
              📊 RIGHT PANEL
            </div>
            ${layout.regions.RIGHT_PANEL.widgets.map(w => `<div style="color: #facc15; margin-bottom: 2px;">• \`${w}\`</div>`).join('')}
          </div>
        </div>

        <!-- Event Bus Stream Footer -->
        <div style="background: #0f172a; padding: 6px; border-radius: 4px; border: 1px solid #1e293b;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">📡 Real-Time Event Bus History (Decoupled Stream):</div>
          ${history.length > 0 ? history.map(evt => `
            <div style="color: #cbd5e1; font-size: 10px;">
              <span style="color: #a855f7;">[${evt.priority}]</span> <strong style="color: #38bdf8;">${evt.topic}</strong>: ${JSON.stringify(evt.payload)}
            </div>
          `).join('') : '<div style="color: #94a3b8;">No events captured.</div>'}
        </div>

        <!-- Explainability Modal Overlay -->
        ${this._activeModal ? `
          <div style="margin-top: 10px; background: #1e1b4b; padding: 10px; border-radius: 6px; border: 1px solid #a855f7;">
            <div style="color: #a855f7; font-weight: bold; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>🔍 EXPLAINABILITY LINEAGE & ATTRIBUTION</span>
              <button id="lacw-modal-close" style="background: none; border: none; color: #f87171; cursor: pointer; font-family: monospace;">[Close]</button>
            </div>
            <div style="color: #cbd5e1;">
              <div>Entity ID: <strong>${this._activeModal.entityId}</strong></div>
              <div>Calculated By: <span style="color: #38bdf8;">${this._activeModal.calculatedBy}</span></div>
              <div>Confidence: <strong style="color: #4ade80;">${(this._activeModal.confidenceScore * 100).toFixed(1)}%</strong></div>
              <div>Participating Agents: ${this._activeModal.participatingAgents.join(', ')}</div>
              <div>Court Approval: <span style="color: #4ade80;">${this._activeModal.constitutionalCourtApproval.status} (${this._activeModal.constitutionalCourtApproval.certificateId})</span></div>
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
        this._render();
      });
    }

    this._container.querySelectorAll('.lacw-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        this.layoutEngine.switchPreset(preset);
        this._render();
      });
    });

    this._container.querySelectorAll('.lacw-cmd-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cmdId = btn.getAttribute('data-cmd');
        await this.commandPalette.executeCommand(cmdId, { layoutEngine: this.layoutEngine });
        this._render();
      });
    });

    const explainBtn = this._container.querySelector('#lacw-explain-btn');
    if (explainBtn) {
      explainBtn.addEventListener('click', () => {
        this._activeModal = this.explainEngine.explainEntity('dec_market_99182');
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

  dispose() {
    this._disposed = true;
    if (this.eventBus) this.eventBus.dispose();
    if (this.layoutEngine) this.layoutEngine.dispose();
    if (this.widgetRegistry) this.widgetRegistry.dispose();
    if (this.commandPalette) this.commandPalette.dispose();
    if (this.vizEngine) this.vizEngine.dispose();
    if (this.explainEngine) this.explainEngine.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
