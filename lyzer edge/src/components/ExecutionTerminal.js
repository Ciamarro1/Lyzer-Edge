export class ExecutionTerminal {
  constructor(options = {}) {
    this._container = null;
    this.divergences = options.initialDivergences || 0;
    this.truthKernelState = options.truthKernelState || null; 
    this.onExecute = options.onExecute || (() => {});
    this.onLogDivergence = options.onLogDivergence || (() => {});
    this.proposedSize = options.proposedSize || 100;
    this.symbol = options.symbol || 'N/A';
  }

  mount(container) {
    this._container = container;
    this._render();
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  /**
   * Expects a state object conforming to the Truth Kernel contract:
   * { signal: "go" | "no-go" | "caution", confidence: 0-100, reason_codes: [], raw_metrics: {} }
   */
  updateKernelState(state) {
    this.truthKernelState = state;
    this._render();
  }

  updateTradeContext(symbol, size) {
    this.symbol = symbol;
    this.proposedSize = size;
    this._render();
  }

  _getSignalColor(signal) {
    switch(signal) {
      case 'go': return 'var(--color-signal-green, #2ecc71)';
      case 'caution': return 'var(--color-signal-yellow, #f1c40f)';
      case 'no-go': return 'var(--color-signal-red, #e74c3c)';
      default: return 'var(--color-text-muted, #888888)';
    }
  }
  
  _getSignalText(signal) {
    switch(signal) {
      case 'go': return 'GREEN (GO)';
      case 'caution': return 'YELLOW (OPPORTUNITY FLOOR)';
      case 'no-go': return 'RED (NO-GO)';
      default: return 'AWAITING KERNEL';
    }
  }

  _getAllowedSize() {
    if (!this.truthKernelState) return 0;
    const { signal } = this.truthKernelState;
    if (signal === 'go') return this.proposedSize;
    if (signal === 'caution') return Math.max(1, Math.floor(this.proposedSize * 0.25)); // Opportunity Floor: 25% max size
    return 0; // no-go generally means 0 size, unless forced
  }

  _handleExecute() {
    if (!this.truthKernelState) return;

    const { signal } = this.truthKernelState;

    if (signal === 'no-go') {
      // Intra-Session Divergence
      this.divergences++;
      this.onLogDivergence({
        type: 'INTRA_SESSION_DIVERGENCE',
        message: 'Executed on RED (NO-GO) signal. Ignored Truth Kernel.',
        kernelState: this.truthKernelState,
        timestamp: Date.now()
      });
      // User forces execution on RED signal
      this.onExecute({ symbol: this.symbol, size: this.proposedSize, divergence: true, signal });
    } else {
      const allowedSize = this._getAllowedSize();
      this.onExecute({ symbol: this.symbol, size: allowedSize, divergence: false, signal });
    }
    
    this._render();
  }

  _render() {
    if (!this._container) return;

    const signal = this.truthKernelState ? this.truthKernelState.signal : null;
    const confidence = this.truthKernelState ? this.truthKernelState.confidence : 0;
    const reasons = this.truthKernelState && this.truthKernelState.reason_codes ? this.truthKernelState.reason_codes : [];
    
    const color = this._getSignalColor(signal);
    const text = this._getSignalText(signal);
    const allowedSize = this._getAllowedSize();

    this._container.innerHTML = `
      <div class="execution-terminal" style="border: 1px solid var(--color-border, #333); border-radius: 8px; padding: 20px; background: var(--color-bg, #1e1e1e); color: var(--color-text, #fff); font-family: monospace;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border, #333); padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 1.2rem; color: var(--color-text-alt, #ddd);">EXECUTION TERMINAL (Pre-Trade)</h2>
          <span style="font-size: 0.9rem; color: var(--color-text-muted, #888);">Intra-Session Divergences: <strong style="color: ${this.divergences > 0 ? '#e74c3c' : 'inherit'};">${this.divergences}</strong></span>
        </div>
        
        <div style="margin: 15px 0; padding: 15px; border-left: 6px solid ${color}; background: var(--color-bg-alt, #2a2a2a); border-radius: 0 4px 4px 0;">
          <div style="font-size: 1.6rem; font-weight: bold; color: ${color}; letter-spacing: 1px;">${text}</div>
          ${signal ? \`
            <div style="margin-top: 12px; font-size: 0.95rem; display: flex; gap: 20px; flex-wrap: wrap;">
              <div>Confidence: <strong style="color: #fff;">\${confidence}%</strong></div>
              <div>Reasons: <strong style="color: #fff;">\${reasons.length > 0 ? reasons.join(', ') : 'None'}</strong></div>
            </div>
          \` : '<div style="margin-top: 10px; color: var(--color-text-muted, #888);">Waiting for Truth Kernel evaluation...</div>'}
        </div>

        <div style="display: flex; gap: 15px; margin-top: 20px; align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px;">
            <label style="display: block; font-size: 0.8rem; color: var(--color-text-muted, #888); margin-bottom: 5px;">Proposed Size</label>
            <input type="number" id="exec-proposed-size" value="${this.proposedSize}" min="1" style="width: 100%; padding: 8px; background: #111; color: #fff; border: 1px solid #444; border-radius: 4px; font-family: monospace; box-sizing: border-box;" />
          </div>
          <div style="flex: 1; min-width: 120px;">
            <label style="display: block; font-size: 0.8rem; color: var(--color-text-muted, #888); margin-bottom: 5px;">Approved Size</label>
            <div style="padding: 8px; background: #111; color: ${signal === 'caution' ? '#f1c40f' : '#fff'}; border: 1px solid #444; border-radius: 4px; display: flex; justify-content: space-between; box-sizing: border-box;">
              <span>${allowedSize}</span>
              ${signal === 'caution' ? '<span style="font-size: 0.75rem; align-self: center;" title="Opportunity Floor">Handicapped</span>' : ''}
            </div>
          </div>
          <div style="flex: 1.5; min-width: 200px;">
            <button id="exec-term-btn" style="width: 100%; padding: 10px; font-weight: bold; cursor: ${!signal ? 'not-allowed' : 'pointer'}; background: ${signal === 'no-go' ? 'transparent' : color}; color: ${signal === 'no-go' ? '#e74c3c' : (signal ? '#000' : '#555')}; border: ${signal === 'no-go' ? '2px solid #e74c3c' : 'none'}; border-radius: 4px; font-family: monospace; transition: all 0.2s; box-sizing: border-box;" ${!signal ? 'disabled' : ''}>
              ${signal === 'no-go' ? 'FORCE EXECUTE (DIVERGENCE)' : 'EXECUTE TRADE'}
            </button>
          </div>
        </div>
      </div>
    `;

    this._attachEvents();
  }

  _attachEvents() {
    const btn = this._container.querySelector('#exec-term-btn');
    if (btn) {
      btn.addEventListener('click', () => this._handleExecute());
    }

    const sizeInput = this._container.querySelector('#exec-proposed-size');
    if (sizeInput) {
      sizeInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val > 0) {
          this.proposedSize = val;
          this._render(); // Re-render to update allowed size
        }
      });
    }
  }
}
 