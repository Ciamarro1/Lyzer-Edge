import { evaluateScenario } from '../engine/scenarios.js';

export class StrategyLab {
  constructor() {
    this.container = null;
    this.scenarios = [
      {
        id: this.generateId(),
        name: 'Baseline',
        rules: {
          excludeState: '',
          riskMultiplier: 1.0,
          tpTarget: ''
        },
        results: null,
        loading: false
      }
    ];
  }

  generateId() {
    return 'sc-' + Math.random().toString(36).substr(2, 9);
  }

  mount(container) {
    this.container = container;
    this.render();
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }

  async runScenario(id) {
    const scenario = this.scenarios.find(s => s.id === id);
    if (!scenario) return;

    scenario.loading = true;
    this.render();

    try {
      // The other agent builds scenarios.js. Assume evaluateScenario takes (rules) and returns a stats profile.
      // E.g. { winRate, profitFactor, netPnl, maxDrawdown }
      const results = await evaluateScenario(scenario.rules);
      scenario.results = results || {
        winRate: 0,
        profitFactor: 0,
        netPnl: 0,
        maxDrawdown: 0
      };
    } catch (err) {
      console.error('Error running scenario:', err);
      // Fallback mock if scenarios.js isn't perfectly wired yet, so UI still works visually
      scenario.results = {
        winRate: (Math.random() * 20 + 40).toFixed(1),
        profitFactor: (Math.random() * 1.5 + 0.8).toFixed(2),
        netPnl: (Math.random() * 2000 - 500).toFixed(2),
        maxDrawdown: (Math.random() * 15).toFixed(1),
        error: err.message
      };
    } finally {
      scenario.loading = false;
      this.render();
    }
  }

  cloneScenario(id) {
    const scenario = this.scenarios.find(s => s.id === id);
    if (!scenario) return;

    const newScenario = {
      id: this.generateId(),
      name: scenario.name + ' (Copy)',
      rules: { ...scenario.rules },
      results: null,
      loading: false
    };

    this.scenarios.push(newScenario);
    this.render();
  }

  removeScenario(id) {
    this.scenarios = this.scenarios.filter(s => s.id !== id);
    this.render();
  }

  updateRule(id, field, value) {
    const scenario = this.scenarios.find(s => s.id === id);
    if (!scenario) return;
    
    scenario.rules[field] = value;
    // We clear results when rules change so user knows they need to re-run
    scenario.results = null; 
  }

  updateName(id, value) {
    const scenario = this.scenarios.find(s => s.id === id);
    if (scenario) {
      scenario.name = value;
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Strategy Lab</h1>
          <p class="page-subtitle">Test and compare different strategy rules side-by-side</p>
        </div>
        
        <div class="lab-actions" style="margin-bottom: 2rem;">
          <button id="add-scenario-btn" class="btn btn-primary">Add Blank Scenario</button>
        </div>

        <div class="scenarios-container" style="display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem; align-items: flex-start;">
          ${this.scenarios.map(scen => this.renderScenarioCard(scen)).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderScenarioCard(scenario) {
    const res = scenario.results;
    
    let resultsHtml = '';
    if (scenario.loading) {
      resultsHtml = '<p class="text-muted" style="font-size: 0.9rem;">Running scenario...</p>';
    } else if (res) {
      resultsHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.9rem;">
          <div class="text-muted">Win Rate:</div>
          <div style="font-weight: bold; color: ${res.winRate > 50 ? 'var(--color-success, #06d6a0)' : 'inherit'};">${res.winRate}%</div>
          
          <div class="text-muted">Profit Factor:</div>
          <div style="font-weight: bold; color: ${res.profitFactor > 1.5 ? 'var(--color-success, #06d6a0)' : 'inherit'};">${res.profitFactor}</div>
          
          <div class="text-muted">Net PnL:</div>
          <div style="font-weight: bold; color: ${res.netPnl > 0 ? 'var(--color-success, #06d6a0)' : res.netPnl < 0 ? 'var(--color-danger, #ef4444)' : 'inherit'};">$${res.netPnl}</div>
          
          <div class="text-muted">Max DD:</div>
          <div style="font-weight: bold; color: var(--color-danger, #ef4444);">${res.maxDrawdown}%</div>
        </div>
      `;
      if (res.error) {
        resultsHtml += `<div style="margin-top: 0.5rem; color: var(--color-warning, #f59e0b); font-size: 0.8rem;">Using fallback data (Engine error: ${res.error})</div>`;
      }
    } else {
      resultsHtml = '<p class="text-muted" style="font-size: 0.9rem;">Not run yet. Click Run Scenario to calculate.</p>';
    }

    return `
      <div class="card scenario-card glass-panel" data-id="${scenario.id}" style="min-width: 320px; flex: 0 0 320px; display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="scenario-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border, #333); padding-bottom: 0.5rem;">
          <input type="text" class="input scenario-name-input" value="${scenario.name}" style="font-weight: bold; font-size: 1.1rem; border: none; background: transparent; padding: 0; width: 60%; box-shadow: none;" />
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary clone-scenario-btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="Clone Scenario">Clone</button>
            <button class="btn btn-secondary remove-scenario-btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--color-danger, #ef4444);" title="Remove Scenario">X</button>
          </div>
        </div>

        <div class="scenario-rules" style="display: flex; flex-direction: column; gap: 1rem;">
          <h4 style="margin: 0;">Rules</h4>
          <div class="form-group">
            <label style="font-size: 0.85rem;">Exclude Market State</label>
            <select class="input rule-exclude-state" style="padding: 0.4rem;">
              <option value="">None (Include All)</option>
              <option value="ranging" ${scenario.rules.excludeState === 'ranging' ? 'selected' : ''}>Ranging</option>
              <option value="volatile" ${scenario.rules.excludeState === 'volatile' ? 'selected' : ''}>Volatile</option>
              <option value="trending" ${scenario.rules.excludeState === 'trending' ? 'selected' : ''}>Trending</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size: 0.85rem;">Risk Multiplier (e.g. 1.5 = +50% Risk)</label>
            <input type="number" step="0.1" class="input rule-risk-multiplier" value="${scenario.rules.riskMultiplier}" style="padding: 0.4rem;" />
          </div>
          <div class="form-group">
            <label style="font-size: 0.85rem;">Fixed RR Target (Leave blank for actuals)</label>
            <input type="number" step="0.5" class="input rule-tp-target" value="${scenario.rules.tpTarget}" placeholder="e.g. 2" style="padding: 0.4rem;" />
          </div>
        </div>

        <button class="btn btn-primary run-scenario-btn" style="width: 100%;">
          ${scenario.loading ? 'Running...' : 'Run Scenario'}
        </button>

        <div class="scenario-results" style="padding-top: 1rem; border-top: 1px solid var(--color-border, #333); min-height: 120px;">
          <h4 style="margin: 0 0 1rem 0;">Results</h4>
          ${resultsHtml}
        </div>
      </div>
    `;
  }

  bindEvents() {
    const addBtn = this.container.querySelector('#add-scenario-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.scenarios.push({
          id: this.generateId(),
          name: 'New Scenario',
          rules: { excludeState: '', riskMultiplier: 1.0, tpTarget: '' },
          results: null,
          loading: false
        });
        this.render();
      });
    }

    const cards = this.container.querySelectorAll('.scenario-card');
    cards.forEach(card => {
      const id = card.dataset.id;
      
      const nameInput = card.querySelector('.scenario-name-input');
      if (nameInput) {
        nameInput.addEventListener('change', (e) => this.updateName(id, e.target.value));
      }

      const excludeState = card.querySelector('.rule-exclude-state');
      if (excludeState) {
        excludeState.addEventListener('change', (e) => this.updateRule(id, 'excludeState', e.target.value));
      }

      const riskMultiplier = card.querySelector('.rule-risk-multiplier');
      if (riskMultiplier) {
        riskMultiplier.addEventListener('change', (e) => this.updateRule(id, 'riskMultiplier', parseFloat(e.target.value) || 1.0));
      }

      const tpTarget = card.querySelector('.rule-tp-target');
      if (tpTarget) {
        tpTarget.addEventListener('change', (e) => this.updateRule(id, 'tpTarget', e.target.value));
      }

      const cloneBtn = card.querySelector('.clone-scenario-btn');
      if (cloneBtn) {
        cloneBtn.addEventListener('click', () => this.cloneScenario(id));
      }

      const removeBtn = card.querySelector('.remove-scenario-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.removeScenario(id));
      }

      const runBtn = card.querySelector('.run-scenario-btn');
      if (runBtn) {
        runBtn.addEventListener('click', () => this.runScenario(id));
      }
    });
  }
}
 