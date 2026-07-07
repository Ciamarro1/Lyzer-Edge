import { getSetting, setSetting, exportAllData, importData } from '../db/queries.js';

export class Settings {
  constructor() {
    this._container = null;
  }

  async mount(container) {
    this._container = container;
    
    // Load initial settings
    const balance = await getSetting('accountBalance') || 10000;
    const riskPct = await getSetting('riskPercentage') || 1;

    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure your trading parameters and manage data</p>
        </div>
        
        <div class="card" style="max-width: 600px; margin-bottom: 1rem;">
          <h3>Trading Parameters</h3>
          <form id="settings-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div>
              <label for="account-balance" style="display: block; margin-bottom: 0.5rem;">Account Balance ($)</label>
              <input type="number" id="account-balance" value="${balance}" step="0.01" style="width: 100%; padding: 0.5rem; background: var(--color-bg-alt, #2a2a2a); border: 1px solid var(--color-border, #333); color: white; border-radius: 4px;" />
            </div>
            <div>
              <label for="risk-pct" style="display: block; margin-bottom: 0.5rem;">Default Risk (%)</label>
              <input type="number" id="risk-pct" value="${riskPct}" step="0.1" style="width: 100%; padding: 0.5rem; background: var(--color-bg-alt, #2a2a2a); border: 1px solid var(--color-border, #333); color: white; border-radius: 4px;" />
            </div>
            <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 0.5rem 1rem; background: var(--color-accent, #3b82f6); color: white; border: none; border-radius: 4px; cursor: pointer;">Save Settings</button>
          </form>
          <div id="settings-msg" style="margin-top: 1rem; color: var(--color-success, #06d6a0); display: none;">Settings saved successfully!</div>
        </div>

        <div class="card" style="max-width: 600px;">
          <h3>Data Management</h3>
          <p class="text-muted" style="margin-bottom: 1rem;">Export your trading data to a JSON file for backup, or import an existing backup. Note: Importing will overwrite all existing data.</p>
          
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <button id="btn-export" class="btn btn-secondary" style="padding: 0.5rem 1rem; background: var(--color-bg-alt, #2a2a2a); color: white; border: 1px solid var(--color-border, #333); border-radius: 4px; cursor: pointer;">Export JSON</button>
            
            <label for="file-import" class="btn btn-secondary" style="padding: 0.5rem 1rem; background: var(--color-bg-alt, #2a2a2a); color: white; border: 1px solid var(--color-border, #333); border-radius: 4px; cursor: pointer;">
              Import JSON
            </label>
            <input type="file" id="file-import" accept="application/json" style="display: none;" />
          </div>
          <div id="data-msg" style="margin-top: 1rem;"></div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  _bindEvents() {
    const form = this._container.querySelector('#settings-form');
    const msg = this._container.querySelector('#settings-msg');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const balance = parseFloat(this._container.querySelector('#account-balance').value);
      const riskPct = parseFloat(this._container.querySelector('#risk-pct').value);
      
      await setSetting('accountBalance', balance);
      await setSetting('riskPercentage', riskPct);
      
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    });

    const btnExport = this._container.querySelector('#btn-export');
    const fileImport = this._container.querySelector('#file-import');
    const dataMsg = this._container.querySelector('#data-msg');

    btnExport.addEventListener('click', async () => {
      try {
        const jsonStr = await exportAllData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyzer_edge_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        dataMsg.textContent = 'Export complete!';
        dataMsg.style.color = 'var(--color-success, #06d6a0)';
      } catch (err) {
        console.error(err);
        dataMsg.textContent = 'Export failed.';
        dataMsg.style.color = 'var(--color-danger, #ef4444)';
      }
    });

    fileImport.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!confirm("Warning: Importing will overwrite all existing data. Are you sure?")) {
        fileImport.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const jsonStr = evt.target.result;
          await importData(jsonStr);
          dataMsg.textContent = 'Import complete! Refreshing...';
          dataMsg.style.color = 'var(--color-success, #06d6a0)';
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          console.error(err);
          dataMsg.textContent = 'Import failed. Check console.';
          dataMsg.style.color = 'var(--color-danger, #ef4444)';
        }
      };
      reader.readAsText(file);
    });
  }
}
 