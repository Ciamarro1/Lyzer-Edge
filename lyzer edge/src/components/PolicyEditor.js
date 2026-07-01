import db from '../db/database.js';
import { RedTeamService } from '../services/RedTeamService.js';

export class PolicyEditor {
  constructor() {
    this._container = null;
    
    // Default policies
    this.policies = {
      mneEnabled: true,
      driftThreshold: 65,
      maxVarSurvival: 5,
      blockToxicClusters: true,
      redTeamFrequency: 'hourly',
      chaosMode: false
    };

    // Bind methods
    this.savePolicies = this.savePolicies.bind(this);
    this.resetDefaults = this.resetDefaults.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.triggerDrill = this.triggerDrill.bind(this);
    this.triggerKillSwitch = this.triggerKillSwitch.bind(this);
  }

  async mount(container) {
    this._container = container;
    await this.loadPolicies();
    this.render();
  }

  async loadPolicies() {
    try {
      // Fetch each policy key from db.settings
      const keys = Object.keys(this.policies);
      for (const k of keys) {
        const record = await db.settings.get(k);
        if (record !== undefined) {
          this.policies[k] = record.value;
        }
      }
    } catch (err) {
      console.error("Erro ao carregar policies:", err);
    }
  }

  async savePolicies() {
    try {
      const keys = Object.keys(this.policies);
      for (const k of keys) {
        await db.settings.put({ key: k, value: this.policies[k] });
      }
      alert("⚠️ Protocolos de Governança Salvos e Aplicados ao Motor.");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar policies.");
    }
  }

  async resetDefaults() {
    if(confirm("Deseja resetar todas as políticas cognitivas para o padrão de fábrica?")) {
      this.policies = {
        mneEnabled: true,
        driftThreshold: 65,
        maxVarSurvival: 5,
        blockToxicClusters: true,
        redTeamFrequency: 'hourly',
        chaosMode: false
      };
      await this.savePolicies();
      this.render();
    }
  }

  handleInputChange(e) {
    const target = e.target;
    const key = target.id.replace('policy-', '');
    
    if (target.type === 'checkbox') {
      this.policies[key] = target.checked;
    } else if (target.type === 'number' || target.type === 'range') {
      this.policies[key] = parseFloat(target.value);
      // Update label if it's a range
      const label = this._container.querySelector(`#val-${key}`);
      if (label) label.textContent = target.value;
    } else {
      this.policies[key] = target.value;
    }
  }

  async triggerDrill() {
    if(confirm("⚠️ ATENÇÃO: Isso irá injetar pesadas perdas na base de dados local para testar a sobrevivência do motor de risco. Tem certeza?")) {
      const success = await RedTeamService.runDrill();
      if (success) alert("💣 Chaos Engine executado. Acesse a aba 'Alerts' ou 'Risk Analysis' para ver o estrago e a contenção.");
    }
  }

  async triggerKillSwitch() {
    if(confirm("🛑 ALERTA VERMELHO: Isso irá paralisar todo o sistema de execução de ordens. Continuar?")) {
      const success = await RedTeamService.triggerKillSwitch();
      if (success) {
        alert("🛑 SISTEMA PARALISADO. Kill Switch ativado com sucesso.");
        this.render(); // Refresh UI to potentially show halted state
      }
    }
  }

  render() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Policy Editor</h1>
            <p class="page-subtitle">Governança Epistêmica e Central Adversarial (Red Team)</p>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button id="btn-drill" class="btn" style="background: rgba(255, 170, 0, 0.1); border: 1px solid var(--accent-amber); color: var(--accent-amber); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              💣 Iniciar Red Team Drill
            </button>
            <button id="btn-kill-switch" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
              🛑 EMERGENCY KILL SWITCH
            </button>
            <button id="btn-reset-policies" class="btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Reset Defaults
            </button>
            <button id="btn-save-policies" class="btn" style="background: rgba(0, 200, 255, 0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
              🛡️ Save Policies
            </button>
          </div>
        </div>

        <div class="dashboard-grid">
          
          <!-- Layer 1: MNE Core -->
          <div class="card glass-panel" style="grid-column: span 1; border-top: 3px solid var(--accent-cyan);">
            <h3 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V20h8v-5.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z"/></svg>
              Meta-Cognitive Engine (MNE)
            </h3>
            
            <div style="margin-bottom: 20px;">
              <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-secondary);">
                <span>Habilitar MNE Core (Piloto Automático)</span>
                <input type="checkbox" id="policy-mneEnabled" ${this.policies.mneEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-cyan);">
              </label>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Permite que a IA assuma o controle (Inversão) caso a sua performance caia abaixo do limiar.</p>
            </div>

            <div>
              <label style="display: block; color: var(--text-secondary); margin-bottom: 8px;">
                Limiar de Intervenção (Drift Threshold): <span id="val-driftThreshold" style="color: var(--accent-cyan); font-weight: bold;">${this.policies.driftThreshold}</span>%
              </label>
              <input type="range" id="policy-driftThreshold" min="30" max="90" value="${this.policies.driftThreshold}" style="width: 100%; accent-color: var(--accent-cyan);">
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Se o Edge Score cair abaixo deste valor, o MNE intervém nos seus lotes.</p>
            </div>
          </div>

          <!-- Layer 2: Invariantes Epistêmicos (CIA) -->
          <div class="card glass-panel" style="grid-column: span 1; border-top: 3px solid var(--color-alpha-green);">
            <h3 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Invariantes Epistêmicos (Blue Team)
            </h3>
            
            <div style="margin-bottom: 20px;">
              <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-secondary);">
                <span>Bloquear 'Toxic Clusters'</span>
                <input type="checkbox" id="policy-blockToxicClusters" ${this.policies.blockToxicClusters ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-alpha-green);">
              </label>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Hard-block no envio de ordens que cruzam as assinaturas vermelhas de Pattern Recognition.</p>
            </div>

            <div>
              <label style="display: block; color: var(--text-secondary); margin-bottom: 8px;">
                Max VaR Survival Threshold: <span id="val-maxVarSurvival" style="color: var(--color-alpha-green); font-weight: bold;">${this.policies.maxVarSurvival}</span>%
              </label>
              <input type="range" id="policy-maxVarSurvival" min="1" max="20" value="${this.policies.maxVarSurvival}" style="width: 100%; accent-color: var(--color-alpha-green);">
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">O capital máximo absoluto em risco antes de o sistema iniciar um Desligamento Tático.</p>
            </div>
          </div>

          <!-- Layer 3: Red Team Configuration (ACTO) -->
          <div class="card glass-panel" style="grid-column: span 1; border-top: 3px solid var(--color-drift-red);">
            <h3 style="color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
              Red Team / Chaos (ACTO)
            </h3>
            
            <div style="margin-bottom: 20px;">
              <label style="display: block; color: var(--text-secondary); margin-bottom: 8px;">Frequência de Stress Test Oculto</label>
              <select id="policy-redTeamFrequency" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px; border-radius: 4px;">
                <option value="realtime" ${this.policies.redTeamFrequency === 'realtime' ? 'selected' : ''}>Real-Time (Máximo Custo Computacional)</option>
                <option value="hourly" ${this.policies.redTeamFrequency === 'hourly' ? 'selected' : ''}>Hourly (Equilibrado)</option>
                <option value="eod" ${this.policies.redTeamFrequency === 'eod' ? 'selected' : ''}>End of Day (Simulação de Fechamento)</option>
              </select>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Com que frequência os subagentes tentarão quebrar o seu portfólio no simulador.</p>
            </div>

            <div>
              <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-secondary);">
                <span style="color: var(--color-drift-red); font-weight: bold;">Ativar Chaos Mode (Cisne Negro)</span>
                <input type="checkbox" id="policy-chaosMode" ${this.policies.chaosMode ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-drift-red);">
              </label>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Injeta eventos catastróficos aleatórios nos cálculos de risco. Atenção: Pode disparar alertas falsos de pânico.</p>
            </div>
          </div>

        </div>
      </div>
    `;

    // Attach Event Listeners
    const inputs = this._container.querySelectorAll('input, select');
    inputs.forEach(input => input.addEventListener('input', this.handleInputChange));

    const btnSave = this._container.querySelector('#btn-save-policies');
    const btnReset = this._container.querySelector('#btn-reset-policies');
    const btnDrill = this._container.querySelector('#btn-drill');
    const btnKillSwitch = this._container.querySelector('#btn-kill-switch');

    if (btnSave) btnSave.addEventListener('click', this.savePolicies);
    if (btnReset) btnReset.addEventListener('click', this.resetDefaults);
    if (btnDrill) btnDrill.addEventListener('click', this.triggerDrill);
    if (btnKillSwitch) btnKillSwitch.addEventListener('click', this.triggerKillSwitch);
  }

  unmount() {
    if (this._container) {
      const inputs = this._container.querySelectorAll('input, select');
      inputs.forEach(input => input.removeEventListener('input', this.handleInputChange));

      const btnSave = this._container.querySelector('#btn-save-policies');
      const btnReset = this._container.querySelector('#btn-reset-policies');
      const btnDrill = this._container.querySelector('#btn-drill');
      const btnKillSwitch = this._container.querySelector('#btn-kill-switch');

      if (btnSave) btnSave.removeEventListener('click', this.savePolicies);
      if (btnReset) btnReset.removeEventListener('click', this.resetDefaults);
      if (btnDrill) btnDrill.removeEventListener('click', this.triggerDrill);
      if (btnKillSwitch) btnKillSwitch.removeEventListener('click', this.triggerKillSwitch);
      
      this._container.innerHTML = '';
    }
  }
}