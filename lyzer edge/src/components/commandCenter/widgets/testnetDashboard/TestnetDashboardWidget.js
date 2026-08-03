import { WidgetContext } from '../../sdk/WidgetContext.js';

export class TestnetDashboardWidget {
  constructor(container, options = {}) {
    this._container = container;
    this._ctx = new WidgetContext('testnet-dashboard-widget', options);
    this._pollInterval = null;
    this._mounted = false;
  }

  async mount() {
    this._mounted = true;
    this._renderFrame();
    this._startPolling();
  }

  unmount() {
    this._mounted = false;
    this._stopPolling();
    this._container.innerHTML = '';
  }

  dispose() {
    this.unmount();
  }

  _renderFrame() {
    this._container.innerHTML = `
      <div class="testnet-dashboard-widget" style="display: flex; flex-direction: column; height: 100%; color: var(--text-primary); font-family: 'Inter', system-ui, sans-serif; font-size: 13px; padding: 12px; box-sizing: border-box; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--success-color);"></div>
            <h3 style="margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; color: var(--text-bright);">TESTNET STATUS</h3>
          </div>
          <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase;">Live Sync</span>
        </div>
        
        <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Balances</h4>
            <div id="testnet-balances-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
              <div style="color: var(--text-secondary); font-style: italic;">Loading...</div>
            </div>
          </div>
          
          <div style="flex: 1; display: flex; flex-direction: column;">
            <h4 style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Open Orders</h4>
            <div id="testnet-orders-container" style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; overflow-y: auto; max-height: 200px;">
              <div style="color: var(--text-secondary); font-style: italic;">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _startPolling() {
    this._fetchData();
    this._pollInterval = setInterval(() => this._fetchData(), 5000);
  }

  _stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  async _fetchData() {
    if (!this._mounted) return;
    try {
      const response = await fetch('/api/testnet-dashboard');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      this._updateUI(data);
    } catch (err) {
      console.error('[TestnetDashboard] Fetch error:', err);
      const ordersContainer = this._container.querySelector('#testnet-orders-container');
      if (ordersContainer) ordersContainer.innerHTML = \`<div style="color: var(--danger-color);">Error fetching data</div>\`;
    }
  }

  _updateUI({ account, orders }) {
    if (!this._mounted) return;

    // Render Balances
    const balancesContainer = this._container.querySelector('#testnet-balances-container');
    if (balancesContainer && account && account.balances) {
      // Filter out empty balances
      const activeBalances = account.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
      
      if (activeBalances.length === 0) {
        balancesContainer.innerHTML = '<div style="color: var(--text-secondary);">No balances</div>';
      } else {
        balancesContainer.innerHTML = activeBalances.map(b => \`
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 10px; display: flex; flex-direction: column;">
            <span style="font-weight: 600; font-size: 11px; color: var(--text-bright);">\${b.asset}</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-primary);">\${parseFloat(b.free).toFixed(4)}</span>
            \${parseFloat(b.locked) > 0 ? \`<span style="font-size: 9px; color: var(--warning-color);">\${parseFloat(b.locked).toFixed(4)} LCK</span>\` : ''}
          </div>
        \`).join('');
      }
    }

    // Render Orders
    const ordersContainer = this._container.querySelector('#testnet-orders-container');
    if (ordersContainer && orders) {
      if (orders.length === 0) {
        ordersContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px 0;">No open orders</div>';
      } else {
        ordersContainer.innerHTML = orders.map(o => {
          const isBuy = o.side === 'BUY';
          const sideColor = isBuy ? 'var(--success-color)' : 'var(--danger-color)';
          return \`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: 'JetBrains Mono', monospace; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: \${sideColor}; font-weight: bold; width: 36px;">\${o.side}</span>
                <span style="color: var(--text-bright);">\${o.symbol}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; text-align: right;">
                <span style="color: var(--text-secondary);">\${parseFloat(o.origQty).toString()} @</span>
                <span style="color: var(--text-primary); font-weight: 500;">\${parseFloat(o.price).toString()}</span>
              </div>
            </div>
          \`;
        }).join('');
      }
    }
  }
}
