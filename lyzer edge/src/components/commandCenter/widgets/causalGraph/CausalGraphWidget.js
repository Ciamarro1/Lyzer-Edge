/**
 * Lyzer Edge Command Center V2 — CausalGraphWidget
 * Interactive Causal Event DAG & Cryptographic Forensics Engine
 * Connects directly to backend SQLite causal_events_log via /api/causal-events
 */

import { causalGraphManifest } from './manifest.js';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];

export class CausalGraphWidget {
  constructor() {
    this.manifest = causalGraphManifest;
    this._container = null;
    this._runtime = null;
    this._activeSymbol = 'BTCUSDT';
    this._events = [];
    this._selectedEvent = null;
    this._isLoading = false;
    this._pollInterval = null;
  }

  mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    if (runtime && typeof runtime.getActiveSymbol === 'function') {
      this._activeSymbol = runtime.getActiveSymbol() || 'BTCUSDT';
    }
    this._render();
    this._loadEvents();

    // Auto refresh every 4 seconds
    this._pollInterval = setInterval(() => {
      if (!this._container || !this._container.isConnected) {
        clearInterval(this._pollInterval);
        return;
      }
      this._loadEvents(true);
    }, 4000);

    return {
      dispose: () => this.dispose()
    };
  }

  async _loadEvents(silent = false) {
    if (!this._container || (this._isLoading && !silent)) return;
    if (!silent) this._isLoading = true;

    try {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'http://localhost:5173';
      const res = await fetch(`${origin}/api/causal-events?symbol=${this._activeSymbol}&limit=40`);
      if (res.ok) {
        const data = await res.json();
        this._events = data.events || [];
      }
    } catch (e) {
      console.warn('[CausalGraphWidget] Failed to fetch causal events:', e.message);
    } finally {
      this._isLoading = false;
      this._updateContent();
    }
  }

  _render() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div style="padding: 16px; font-family: 'JetBrains Mono', monospace; background: rgba(6, 10, 22, 0.5); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); color: #f8fafc; border-radius: 16px; font-size: 11px; border: 1px solid rgba(0, 243, 255, 0.2); box-shadow: 0 20px 50px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.15); height: 100%; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Header Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 243, 255, 0.15); padding-bottom: 12px; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 14px; font-weight: 800; font-family: 'Inter', system-ui, sans-serif; letter-spacing: 0.5px; color: #00f3ff;">
              🧬 INSTITUTIONAL CAUSAL GRAPH (DAG LINEAGE)
            </span>
            <span style="background: rgba(0, 255, 157, 0.15); color: #00ff9d; padding: 2px 8px; border-radius: 6px; font-size: 9px; border: 1px solid rgba(0, 255, 157, 0.3); font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #00ff9d; box-shadow: 0 0 8px #00ff9d;"></span>
              SQLITE CAUSAL WAL LIVE
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="cg-refresh-btn" style="background: rgba(15, 23, 42, 0.6); color: #00f3ff; border: 1px solid rgba(0, 243, 255, 0.3); padding: 4px 12px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              ↻ Refresh Events
            </button>
          </div>
        </div>

        <!-- Multi-Asset Selector Bar -->
        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;" id="cg-asset-bar">
          ${SYMBOLS.map(s => {
            const active = s === this._activeSymbol;
            return `
              <button class="cg-asset-btn ${active ? 'active' : ''}" data-sym="${s}" style="background: ${active ? 'rgba(0, 243, 255, 0.2)' : 'rgba(15, 23, 42, 0.4)'}; color: ${active ? '#00f3ff' : '#94a3b8'}; border: 1px solid ${active ? 'rgba(0, 243, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'}; padding: 4px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                ${s.replace('USDT', '/USD')}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Causal Pipeline Archetype Overview -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 16px; background: rgba(10, 16, 32, 0.45); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0, 243, 255, 0.15);">
          <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.06); padding: 4px;">
            <div style="color: #60a5fa; font-weight: 800; font-size: 10px;">1. INGESTION</div>
            <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">Binance WS Real Feed</div>
          </div>
          <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.06); padding: 4px;">
            <div style="color: #c084fc; font-weight: 800; font-size: 10px;">2. CSRL TOPO</div>
            <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">Scale Divergence (SDS)</div>
          </div>
          <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.06); padding: 4px;">
            <div style="color: #fbbf24; font-weight: 800; font-size: 10px;">3. TRUTHKERNEL</div>
            <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">DVF / TRG / LHDS</div>
          </div>
          <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.06); padding: 4px;">
            <div style="color: #f43f5e; font-weight: 800; font-size: 10px;">4. ECA COURT</div>
            <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">Constitutional Veto</div>
          </div>
          <div style="text-align: center; padding: 4px;">
            <div style="color: #34d399; font-weight: 800; font-size: 10px;">5. EXECUTION</div>
            <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">Order Fill & Guard</div>
          </div>
        </div>

        <!-- DAG Events List & Inspector Container -->
        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 14px; min-height: 280px;" id="cg-content-grid">
          <!-- Left: Causal Tree List -->
          <div id="cg-events-container" style="background: rgba(10, 16, 32, 0.45); border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15); padding: 12px; overflow-y: auto; max-height: 480px;">
            <div style="color: #94a3b8; text-align: center; padding: 20px;">Loading live causal DAG from SQLite...</div>
          </div>

          <!-- Right: Inspector Drawer -->
          <div id="cg-inspector-container" style="background: rgba(10, 16, 32, 0.55); border-radius: 12px; border: 1px solid rgba(176, 38, 255, 0.25); padding: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);">
            <div style="color: #b026ff; font-weight: 800; font-size: 11px; margin-bottom: 8px; border-bottom: 1px solid rgba(176, 38, 255, 0.2); padding-bottom: 6px;">
              🔍 CAUSAL FORENSIC INSPECTOR
            </div>
            <div id="cg-inspector-body" style="color: #64748b; font-size: 10px;">
              Click on any Causal Node in the DAG on the left to inspect its complete cryptographic hash, causation lineage, and raw JSON context.
            </div>
          </div>
        </div>

      </div>
    `;

    this._bindDOMEvents();
  }

  _bindDOMEvents() {
    if (!this._container) return;

    // Refresh Button
    const refBtn = this._container.querySelector('#cg-refresh-btn');
    if (refBtn) {
      refBtn.addEventListener('click', () => this._loadEvents(false));
    }

    // Asset buttons
    this._container.querySelectorAll('.cg-asset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.getAttribute('data-sym');
        if (sym === this._activeSymbol) return;
        this._activeSymbol = sym;
        this._selectedEvent = null;
        this._render();
        this._loadEvents(false);
      });
    });
  }

  _updateContent() {
    if (!this._container) return;

    const eventsList = this._container.querySelector('#cg-events-container');
    if (!eventsList) return;

    if (this._events.length === 0) {
      eventsList.innerHTML = `
        <div style="text-align: center; color: #64748b; padding: 30px 10px;">
          <div style="font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 6px;">Aguardando Novos Eventos Causais</div>
          <div>O motor de streaming para <strong>${this._activeSymbol}</strong> está gravando snapshots a cada vela de 60s.</div>
        </div>
      `;
      return;
    }

    eventsList.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${this._events.map((ev, idx) => {
          const isSelected = this._selectedEvent && this._selectedEvent.id === ev.id;
          const isVerdict = ev.event_type === 'KERNEL_VERDICT';
          const isSnapshot = ev.event_type === 'REALITY_SNAPSHOT_CREATED';
          
          let badgeColor = '#60a5fa';
          let badgeBg = 'rgba(96, 165, 250, 0.15)';
          let badgeBorder = 'rgba(96, 165, 250, 0.3)';

          if (isVerdict) {
            const auth = ev.payload?.epistemic_authority || ev.payload?.governance || 'ALLOW';
            const isVeto = auth === 'VETO' || ev.payload?.eef === false;
            badgeColor = isVeto ? '#ef4444' : '#34d399';
            badgeBg = isVeto ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)';
            badgeBorder = isVeto ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.3)';
          }

          const dateStr = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '--';
          const eventIdShort = (ev.event_id || `ev_${ev.id}`).substring(0, 22);

          return `
            <div class="cg-event-card" data-id="${ev.id}" style="background: ${isSelected ? 'rgba(0, 243, 255, 0.15)' : 'rgba(15, 23, 42, 0.6)'}; border: 1px solid ${isSelected ? '#00f3ff' : 'rgba(255, 255, 255, 0.08)'}; border-radius: 8px; padding: 10px; cursor: pointer; transition: all 0.2s; box-shadow: ${isSelected ? '0 0 15px rgba(0, 243, 255, 0.2)' : 'none'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9px;">
                    ${ev.event_type || 'CAUSAL_EVENT'}
                  </span>
                  <span style="color: #94a3b8; font-size: 9px; font-weight: 600;">${eventIdShort}...</span>
                </div>
                <span style="color: #64748b; font-size: 9px;">${dateStr}</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #cbd5e1;">
                <div>
                  ${isVerdict ? `
                    <span>TRG: <strong style="color:#fbbf24;">${ev.payload?.trg ? Number(ev.payload.trg).toFixed(2) : '--'}</strong></span>
                    <span style="margin-left: 8px;">DVF: <strong style="color:#38bdf8;">${ev.payload?.dvf ? Number(ev.payload.dvf).toFixed(2) : '--'}</strong></span>
                    <span style="margin-left: 8px;">LHDS: <strong style="color:#a855f7;">${ev.payload?.lhds ? Number(ev.payload.lhds).toFixed(3) : '--'}</strong></span>
                  ` : isSnapshot ? `
                    <span>Price: <strong style="color:#f8fafc;">$${ev.payload?.currentPrice || '--'}</strong></span>
                    <span style="margin-left: 8px;">SDS: <strong style="color:#34d399;">${ev.payload?.sds ? Number(ev.payload.sds).toFixed(3) : '--'}</strong></span>
                  ` : `
                    <span>Source: ${ev.source || 'StreamEngine'}</span>
                  `}
                </div>
                <span style="color: #00f3ff; font-weight: 700; font-size: 9px;">Inspect ➔</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind card clicks
    eventsList.querySelectorAll('.cg-event-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        this._selectedEvent = this._events.find(e => e.id === id) || null;
        this._updateContent();
        this._renderInspector();
      });
    });
  }

  _renderInspector() {
    const insp = this._container.querySelector('#cg-inspector-body');
    if (!insp) return;

    if (!this._selectedEvent) {
      insp.innerHTML = `
        <div style="color: #64748b; font-size: 10px;">
          Click on any Causal Node in the DAG on the left to inspect its complete cryptographic hash, causation lineage, and raw JSON context.
        </div>
      `;
      return;
    }

    const ev = this._selectedEvent;
    const payloadJson = JSON.stringify(ev.payload || {}, null, 2);

    insp.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 10px; max-height: 440px; overflow-y: auto;">
        <div>
          <span style="color: #64748b;">Event Type:</span>
          <span style="color: #00f3ff; font-weight: 700;">${ev.event_type}</span>
        </div>

        <div>
          <span style="color: #64748b;">UUIDv7 ID:</span>
          <div style="color: #f8fafc; font-size: 9px; word-break: break-all; background: rgba(15,23,42,0.8); padding: 4px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
            ${ev.event_id || '--'}
          </div>
        </div>

        <div>
          <span style="color: #64748b;">Crypto Hash (FNV-1a):</span>
          <div style="color: #00ff9d; font-size: 9px; word-break: break-all; background: rgba(15,23,42,0.8); padding: 4px; border-radius: 4px; border: 1px solid rgba(0,255,157,0.2);">
            ${ev.hash || '0'.repeat(64)}
          </div>
        </div>

        <div>
          <span style="color: #64748b;">Parent Hash (Lineage):</span>
          <div style="color: #94a3b8; font-size: 9px; word-break: break-all;">
            ${ev.hash_prev || 'GENESIS_NODE_ROOT'}
          </div>
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;">
          <span style="color: #b026ff; font-weight: 700;">Payload Context:</span>
          <pre style="margin-top: 4px; background: rgba(3, 6, 14, 0.8); color: #cbd5e1; padding: 8px; border-radius: 6px; font-size: 9px; max-height: 180px; overflow-y: auto; border: 1px solid rgba(176,38,255,0.2); white-space: pre-wrap; word-break: break-word;">${payloadJson}</pre>
        </div>
      </div>
    `;
  }

  dispose() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._runtime = null;
  }

  unmount() {
    this.dispose();
  }
}
