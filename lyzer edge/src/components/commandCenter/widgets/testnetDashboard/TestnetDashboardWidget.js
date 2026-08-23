export class TestnetDashboardWidget {
  constructor() {
    this._container = null;
    this._pollInterval = null;
    this._mounted = false;
  }

  mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
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
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase;">Live Sync</span>
            <button id="cancel-orders-btn" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(234,179,8,0.4); background: rgba(234,179,8,0.1); color: #eab308; cursor: pointer; font-family: inherit;">⨉ Cancelar Ordens</button>
            <button id="reset-trades-btn" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); color: #ef4444; cursor: pointer; font-family: inherit;">⟳ Zerar Trades</button>
          </div>
        </div>
        
        <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Balances (Testnet)</h4>
            <div id="testnet-balances-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
              <div style="color: var(--text-secondary); font-style: italic;">Loading...</div>
            </div>
          </div>
          
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Open Orders (Testnet)</h4>
            <div id="testnet-orders-container" style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; overflow-y: auto; max-height: 160px;">
              <div style="color: var(--text-secondary); font-style: italic;">Loading...</div>
            </div>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Engine Trade History</h4>
            <div id="engine-trades-container" style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; overflow-y: auto; max-height: 220px;">
              <div style="color: var(--text-secondary); font-style: italic;">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const resetBtn = this._container.querySelector('#reset-trades-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this._resetTrades());
    }

    const cancelBtn = this._container.querySelector('#cancel-orders-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this._cancelOrders());
    }
  }

  async _cancelOrders() {
    const btn = this._container.querySelector('#cancel-orders-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Cancelando...'; }
    try {
      const res = await fetch('/api/cancel-all-orders', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const c = this._container.querySelector('#testnet-orders-container');
        if (c) c.innerHTML = '<div style="color: var(--success-color); text-align: center; padding: 12px 0;">✓ Todas as ordens abertas foram canceladas!</div>';
        setTimeout(() => this._fetchData(), 800);
      }
    } catch (e) {
      console.error('[TestnetDashboard] Cancel orders error:', e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '⨉ Cancelar Ordens'; }
    }
  }

  async _resetTrades() {
    const btn = this._container.querySelector('#reset-trades-btn');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      const res = await fetch('/api/reset-engine', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const c = this._container.querySelector('#engine-trades-container');
        if (c) c.innerHTML = '<div style="color: var(--success-color);">✓ Trades zerados com sucesso!</div>';
        setTimeout(() => this._fetchData(), 500);
      }
    } catch (e) {
      console.error('[TestnetDashboard] Reset error:', e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '⟳ Zerar Trades'; }
    }
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
    // Fetch testnet dashboard (Binance API)
    try {
      const response = await fetch('/api/testnet-dashboard');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      this._updateTestnetUI(data);
    } catch (err) {
      console.error('[TestnetDashboard] Fetch error:', err);
      const ordersContainer = this._container.querySelector('#testnet-orders-container');
      const balancesContainer = this._container.querySelector('#testnet-balances-container');
      if (ordersContainer) ordersContainer.innerHTML = `<div style="color: var(--danger-color); font-size:10px;">API Error: ${err.message}</div>`;
      if (balancesContainer) balancesContainer.innerHTML = `<div style="color: var(--danger-color); font-size:10px;">API Error: ${err.message}</div>`;
    }

    // Fetch engine trade history from aggregated /api/engine/trades endpoint
    try {
      const r = await fetch('/api/engine/trades');
      if (r.ok) {
        const d = await r.json();
        if (d.success && Array.isArray(d.trades)) {
          this._updateEngineTradesUI(d.trades, false);
        } else {
          this._updateEngineTradesUI([], false);
        }
      } else {
        this._updateEngineTradesUI([], true);
      }
    } catch (err) {
      console.error('[TestnetDashboard] Engine trades error:', err);
      this._updateEngineTradesUI([], true);
    }
  }

  _updateTestnetUI({ account, orders }) {
    if (!this._mounted) return;

    const balancesContainer = this._container.querySelector('#testnet-balances-container');
    if (balancesContainer && account) {
      if (account.code) {
        balancesContainer.innerHTML = `<div style="color: var(--danger-color); font-size:10px;">API Error (${account.code}): ${account.msg}</div>`;
      } else if (account.balances) {
        const priorityAssets = ['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA'];
        const activeBalances = account.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
        // Sort priority assets to the front
        activeBalances.sort((a, b) => {
          const idxA = priorityAssets.indexOf(a.asset);
          const idxB = priorityAssets.indexOf(b.asset);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.asset.localeCompare(b.asset);
        });

        if (activeBalances.length === 0) {
          balancesContainer.innerHTML = '<div style="color: var(--text-secondary);">No balances</div>';
        } else {
          balancesContainer.innerHTML = activeBalances.slice(0, 12).map(b => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 10px; display: flex; flex-direction: column;">
              <span style="font-weight: 600; font-size: 11px; color: var(--text-bright);">${b.asset}</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-primary);">${parseFloat(b.free).toFixed(4)}</span>
              ${parseFloat(b.locked) > 0 ? `<span style="font-size: 9px; color: var(--warning-color);">${parseFloat(b.locked).toFixed(4)} LCK</span>` : ''}
            </div>
          `).join('');
        }
      }
    }

    const ordersContainer = this._container.querySelector('#testnet-orders-container');
    if (ordersContainer && orders) {
      if (orders.code) {
        ordersContainer.innerHTML = `<div style="color: var(--danger-color); text-align: center; padding: 20px 0; font-size:10px;">API Error (${orders.code}): ${orders.msg}</div>`;
      } else if (!Array.isArray(orders) || orders.length === 0) {
        ordersContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px 0;">No open orders</div>';
      } else {
        ordersContainer.innerHTML = orders.map(o => {
          const isBuy = o.side === 'BUY';
          const sideColor = isBuy ? 'var(--success-color)' : 'var(--danger-color)';
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: 'JetBrains Mono', monospace; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${sideColor}; font-weight: bold; width: 36px;">${o.side}</span>
                <span style="color: var(--text-bright);">${o.symbol}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; text-align: right;">
                <span style="color: var(--text-secondary);">${parseFloat(o.origQty).toString()} @</span>
                <span style="color: var(--text-primary); font-weight: 500;">${parseFloat(o.price).toString()}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  _updateEngineTradesUI(trades, hadError = false) {
    if (!this._mounted) return;
    const container = this._container.querySelector('#engine-trades-container');
    if (!container) return;

    if (hadError) {
      container.innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 16px 0; font-size: 11px;">Erro ao carregar trades (HTTP Error)</div>';
      return;
    }

    if (trades.length === 0) {
      container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 16px 0;">Sem trades registrados</div>';
      return;
    }

    container.innerHTML = trades.map(t => {
      const isLong = t.direction === 'LONG';
      const sideColor = isLong ? '#10b981' : '#ef4444';
      const pnlVal = parseFloat(t.pnl);
      const pnlColor = pnlVal >= 0 ? '#10b981' : '#ef4444';
      const tsMs = t.timestamp ? (t.timestamp > 1e11 ? t.timestamp : t.timestamp * 1000) : 0;
      const date = tsMs ? new Date(tsMs).toLocaleString('pt-BR', { hour12: false, timeStyle: 'short', dateStyle: 'short' }) : '--';
      return `
        <div style="display: grid; grid-template-columns: 60px 70px 1fr 1fr 60px; align-items: center; gap: 6px; padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,0.04); font-family: 'JetBrains Mono', monospace; font-size: 10px;">
          <span style="color: ${sideColor}; font-weight: 700;">${t.direction || '--'}</span>
          <span style="color: var(--text-secondary);">${t.symbol || '--'}</span>
          <span style="color: var(--text-secondary);">${date}</span>
          <span style="color: var(--text-primary);">E: ${t.entryPrice ? parseFloat(t.entryPrice).toFixed(2) : '--'}</span>
          <span style="color: ${pnlColor}; font-weight: 600;">${isNaN(pnlVal) ? t.pnl || '--' : (pnlVal >= 0 ? '+' : '') + pnlVal.toFixed(2) + '%'}</span>
        </div>
      `;
    }).join('');
  }
}
