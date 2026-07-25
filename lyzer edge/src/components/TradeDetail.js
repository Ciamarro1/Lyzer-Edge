import { getTrade, closeTrade, deleteTrade } from '../db/queries.js';
import { TRADE_STATUS } from '../db/database.js';

export class TradeDetail {
  constructor(params) {
    this.tradeId = parseInt(params.id, 10);
    this.container = null;
    this.trade = null;
  }

  async mount(container) {
    this.container = container;
    await this.loadTrade();
    this.render();
    this.bindEvents();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  async loadTrade() {
    this.trade = await getTrade(this.tradeId);
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  }

  render() {
    if (!this.trade) {
      this.container.innerHTML = `
        <div class="page-container">
          <div class="card">
            <h2 style="color: var(--color-danger);">Trade not found</h2>
            <button class="btn btn-secondary" onclick="window.history.back()">Go Back</button>
          </div>
        </div>
      `;
      return;
    }

    const t = this.trade;
    const ctx = t.marketContext || {};
    const isClosed = t.status === TRADE_STATUS.CLOSED;

    this.container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Trade #${t.id}: ${t.symbol}</h1>
            <p class="page-subtitle">${this.formatDate(t.entryDate)}</p>
          </div>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn btn-secondary" id="btn-delete">Delete</button>
            ${!isClosed ? `<button class="btn btn-primary" id="btn-exit-modal">Close Trade</button>` : ''}
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: var(--spacing-lg);">
          <div class="card glass-panel">
            <h3>Execution Details</h3>
            <ul style="list-style: none; padding: 0; line-height: 1.8;">
              <li><strong>Direction:</strong> ${t.direction.toUpperCase()}</li>
              <li><strong>Asset:</strong> ${t.asset} (${t.market})</li>
              <li><strong>Timeframe:</strong> ${t.timeframe}</li>
              <li><strong>Entry Price:</strong> ${t.entryPrice}</li>
              <li><strong>Stop Loss:</strong> ${t.stopLoss || 'N/A'}</li>
              <li><strong>Take Profit:</strong> ${t.takeProfit || 'N/A'}</li>
              ${isClosed ? `
                <li><strong>Exit Price:</strong> ${t.exitPrice}</li>
                <li><strong>Exit Date:</strong> ${this.formatDate(t.exitDate)}</li>
                <li><strong>PnL:</strong> <span class="${t.pnl > 0 ? 'badge badge-win' : t.pnl < 0 ? 'badge badge-loss' : 'badge badge-breakeven'}" style="background:none;border:1px solid currentColor;">${t.pnl.toFixed(2)}</span></li>
                <li><strong>R:R:</strong> ${t.rr ? t.rr.toFixed(2) + 'R' : 'N/A'}</li>
              ` : ''}
            </ul>
          </div>

          <div class="card glass-panel">
            <h3>Market Context</h3>
            <ul style="list-style: none; padding: 0; line-height: 1.8;">
              <li><strong>Session:</strong> ${ctx.session || 'N/A'}</li>
              <li><strong>Market State:</strong> ${ctx.marketState || 'N/A'}</li>
              <li><strong>Structure:</strong> ${(ctx.structure || []).join(', ') || 'N/A'}</li>
            </ul>
            ${ctx.notes ? `
              <div style="margin-top: var(--spacing-md);">
                <strong>Notes:</strong>
                <p style="white-space: pre-wrap; margin-top: var(--spacing-xs);">${ctx.notes}</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Exit Modal Overlay -->
      <div id="exit-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; align-items: center; justify-content: center;">
        <div class="card glass-panel" style="width: 100%; max-width: 400px; padding: var(--spacing-lg);">
          <h2>Close Trade</h2>
          <form id="exit-form" style="margin-top: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-sm);">
            <div class="form-group">
              <label>Exit Date/Time</label>
              <input type="datetime-local" name="exitDate" class="input" required />
            </div>
            <div class="form-group">
              <label>Exit Price</label>
              <input type="number" step="any" name="exitPrice" class="input" required />
            </div>
            <div class="form-group">
              <label>Fees / Commissions</label>
              <input type="number" step="any" name="fees" class="input" value="0" />
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md); justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-exit">Cancel</button>
              <button type="submit" class="btn btn-primary">Confirm Exit</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Initialize date in modal
    if (!isClosed) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      this.container.querySelector('[name="exitDate"]').value = now.toISOString().slice(0, 16);
    }
  }

  bindEvents() {
    if (!this.trade) return;

    const btnDelete = this.container.querySelector('#btn-delete');
    btnDelete?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this trade?')) {
        await deleteTrade(this.trade.id);
        window.location.hash = '#/trades';
      }
    });

    const btnExitModal = this.container.querySelector('#btn-exit-modal');
    const modal = this.container.querySelector('#exit-modal');
    const btnCancelExit = this.container.querySelector('#btn-cancel-exit');
    const exitForm = this.container.querySelector('#exit-form');

    if (btnExitModal && modal) {
      btnExitModal.addEventListener('click', () => {
        modal.style.display = 'flex';
      });

      btnCancelExit.addEventListener('click', () => {
        modal.style.display = 'none';
      });

      exitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(exitForm);
        
        try {
          await closeTrade(this.trade.id, {
            exitDate: new Date(formData.get('exitDate')).toISOString(),
            exitPrice: parseFloat(formData.get('exitPrice')),
            fees: parseFloat(formData.get('fees') || 0)
          });
          
          modal.style.display = 'none';
          await this.loadTrade();
          this.render();
          this.bindEvents();
        } catch (err) {
          alert('Error closing trade: ' + err.message);
        }
      });
    }
  }
}
 