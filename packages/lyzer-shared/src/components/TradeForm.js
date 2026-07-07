import { createTrade, setMarketContext } from '../db/queries.js';
import { eventBus } from '../lib/eventBus.js';

export class TradeForm {
  constructor() {
    this.container = null;
  }

  mount(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  render() {
    this.container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">New Trade</h1>
          <p class="page-subtitle">Record a new trade entry</p>
        </div>
        <div class="card glass-panel">
          <form id="trade-form" class="form-layout">
            <div class="form-section">
              <h3>Basic Info</h3>
              <div class="grid-2">
                <div class="form-group">
                  <label>Symbol</label>
                  <input type="text" name="symbol" class="input" placeholder="e.g. EURUSD" required />
                </div>
                <div class="form-group">
                  <label>Asset Class</label>
                  <select name="asset" class="input" required>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                    <option value="commodities">Commodities</option>
                    <option value="indices">Indices</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Market</label>
                  <input type="text" name="market" class="input" placeholder="e.g. Spot, Futures" required />
                </div>
                <div class="form-group">
                  <label>Direction</label>
                  <select name="direction" class="input" required>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Timeframe</label>
                  <input type="text" name="timeframe" class="input" placeholder="e.g. 15m, 1h, 4h" required />
                </div>
                <div class="form-group">
                  <label>Entry Date/Time</label>
                  <input type="datetime-local" name="entryDate" class="input" required />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Execution</h3>
              <div class="grid-3">
                <div class="form-group">
                  <label>Entry Price</label>
                  <input type="number" step="any" name="entryPrice" class="input" required />
                </div>
                <div class="form-group">
                  <label>Stop Loss</label>
                  <input type="number" step="any" name="stopLoss" class="input" required />
                </div>
                <div class="form-group">
                  <label>Take Profit</label>
                  <input type="number" step="any" name="takeProfit" class="input" />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Context</h3>
              <div class="grid-2">
                <div class="form-group">
                  <label>Market State</label>
                  <select name="marketState" class="input">
                    <option value="">Select...</option>
                    <option value="trending">Trending</option>
                    <option value="ranging">Ranging</option>
                    <option value="volatile">Volatile</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Session</label>
                  <select name="session" class="input">
                    <option value="">Select...</option>
                    <option value="london">London</option>
                    <option value="new_york">New York</option>
                    <option value="tokyo">Tokyo</option>
                    <option value="sydney">Sydney</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Structure (multi-select)</label>
                  <select name="structure" class="input" multiple>
                    <option value="bos">BOS</option>
                    <option value="choch">CHOCH</option>
                    <option value="liquidity">Liquidity Sweep</option>
                    <option value="fvg">FVG</option>
                    <option value="orderblock">Order Block</option>
                  </select>
                  <small class="text-muted">Hold Ctrl/Cmd to select multiple</small>
                </div>
              </div>
              <div class="form-group">
                <label>Notes</label>
                <textarea name="notes" class="input" rows="4"></textarea>
              </div>
            </div>

            <div class="form-actions" style="margin-top: var(--spacing-lg); display: flex; gap: var(--spacing-md); justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" onclick="window.history.back()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Trade</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Set default entryDate to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.container.querySelector('[name="entryDate"]').value = now.toISOString().slice(0, 16);
  }

  bindEvents() {
    const form = this.container.querySelector('#trade-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      const structureSelect = form.querySelector('[name="structure"]');
      const structure = Array.from(structureSelect.selectedOptions).map(opt => opt.value);

      const tradeData = {
        symbol: formData.get('symbol').toUpperCase(),
        asset: formData.get('asset'),
        market: formData.get('market'),
        direction: formData.get('direction'),
        timeframe: formData.get('timeframe'),
        entryDate: new Date(formData.get('entryDate')).toISOString(),
        entryPrice: parseFloat(formData.get('entryPrice')),
        stopLoss: parseFloat(formData.get('stopLoss')),
        takeProfit: formData.get('takeProfit') ? parseFloat(formData.get('takeProfit')) : null,
      };

      try {
        const tradeId = await createTrade(tradeData);
        
        await setMarketContext(tradeId, {
          marketState: formData.get('marketState'),
          session: formData.get('session'),
          structure: structure,
          notes: formData.get('notes'),
        });

        // Redirect to trade log
        window.location.hash = '#/trades';
      } catch (err) {
        console.error('Failed to create trade:', err);
        alert('Error creating trade: ' + err.message);
      }
    });
  }
}
 