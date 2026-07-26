import { chartHostManifest } from './manifest.js';
import { ChartAdapter } from '../../chart/ChartAdapter.js';

const CANDLE_COUNT = 1500;
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];
const BASE_PRICES = { BTCUSDT: 65000, ETHUSDT: 3450, SOLUSDT: 185, BNBUSDT: 580, EURUSDT: 1.08, GBPUSDT: 1.27 };

export class ChartHostWidget {
  constructor() {
    this.manifest = chartHostManifest;
    this._container = null;
    this._runtime = null;
    this._adapter = null;
    this._activeSymbol = 'BTCUSDT';
    this._candles = [];
    this._plotListener = null;
    this._priceLevels = {};
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.position = 'relative';
    this._container.style.display = 'flex';
    this._container.style.flexDirection = 'column';
    this._container.style.background = 'rgba(4, 6, 14, 0.95)';

    this._renderHeader();

    const chartHost = document.createElement('div');
    chartHost.style.flex = '1';
    chartHost.style.width = '100%';
    chartHost.style.position = 'relative';
    this._container.appendChild(chartHost);

    this._adapter = new ChartAdapter();
    await this._adapter.createChart(chartHost, { bgColor: 'transparent', textColor: 'rgba(148,163,184,0.5)' });

    this._loadHistoricalCandles(this._activeSymbol);
    this._bindAssetTabs();
    this._listenPlotTrade();
    this._startLiveUpdates();
  }

  _renderHeader() {
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;flex-direction:column;background:rgba(10,12,22,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid rgba(6,182,212,0.06);font-family:\'Inter\',system-ui,sans-serif;font-size:11px;';

    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 14px;';
    row1.innerHTML = `
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;" id="asset-tabs-container">
        ${SYMBOLS.map(s => {
          const active = s === this._activeSymbol;
          return `<button class="asset-tab ${active ? 'active' : ''}" data-sym="${s}" style="background:${active ? 'rgba(16,185,129,0.15)' : 'rgba(15,23,42,0.3)'};color:${active ? '#34d399' : 'rgba(148,163,184,0.6)'};border:1px solid ${active ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.06)'};padding:3px 10px;border-radius:6px;font-weight:${active ? '700' : '500'};font-size:10px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;transition:all 0.2s;">${s.replace('USDT', '/USD')}</button>`;
        }).join('')}
      </div>
      <div id="decision-panel" style="display:flex;gap:12px;font-size:10px;align-items:center;font-family:'JetBrains Mono',monospace;">
        <span style="color:rgba(251,191,36,0.6);">TRG <strong id="dp-trg" style="color:#fbbf24;">--</strong></span>
        <span style="color:rgba(56,189,248,0.6);">DVF <strong id="dp-dvf" style="color:#38bdf8;">--</strong></span>
        <span style="color:rgba(168,85,247,0.6);">LHDS <strong id="dp-lhds" style="color:#a855f7;">--</strong></span>
        <span style="color:rgba(74,222,128,0.6);">EEF <strong id="dp-eef" style="color:#4ade80;">--</strong></span>
        <span style="color:rgba(148,163,184,0.4);">COURT <strong id="dp-court" style="color:rgba(148,163,184,0.7);">--</strong></span>
      </div>
    `;
    header.appendChild(row1);

    const row2 = document.createElement('div');
    row2.style.cssText = 'display:flex;gap:16px;padding:3px 14px 6px;font-size:9px;color:rgba(100,116,139,0.5);font-family:\'JetBrains Mono\',monospace;';
    row2.innerHTML = `
      <span>Signal <strong id="dp-signal" style="color:rgba(148,163,184,0.6);">--</strong></span>
      <span>Regime <strong id="dp-regime" style="color:rgba(148,163,184,0.6);">--</strong></span>
      <span>SDS <strong id="dp-sds" style="color:rgba(148,163,184,0.6);">--</strong></span>
      <span>α-Confidence <strong id="dp-conf" style="color:rgba(148,163,184,0.6);">--</strong></span>
    `;
    header.appendChild(row2);

    this._container.appendChild(header);
  }

  _bindAssetTabs() {
    const container = this._container.querySelector('#asset-tabs-container');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.asset-tab');
      if (!btn) return;
      const sym = btn.dataset.sym;
      if (sym === this._activeSymbol) return;
      container.querySelectorAll('.asset-tab').forEach(b => {
        b.style.background = '#1e293b'; b.style.color = '#94a3b8';
      });
      btn.style.background = '#10b981'; btn.style.color = '#020617';
      this._activeSymbol = sym;
      this._loadHistoricalCandles(sym);
      this._updateDecisionPanel();
    });
  }

  _loadHistoricalCandles(symbol) {
    const basePrice = BASE_PRICES[symbol] || 65000;
    const candles = [];
    const nowSec = Math.floor(Date.now() / 1000);
    let curr = basePrice;

    // Use a seeded-style random walk to get more realistic OHLC
    for (let i = CANDLE_COUNT; i >= 0; i--) {
      const time = nowSec - i * 60;
      const noise = (Math.random() - 0.495) * (basePrice * 0.004);
      const volatility = basePrice * 0.002;
      const open = curr;
      const close = curr + noise;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      curr = close;
      candles.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 800 + 100) });
    }
    this._candles = candles;
    this._adapter.setCandles(candles);
    this._adapter.clearPriceLines();
    this._updateDecisionPanel();
  }

  _updateDecisionPanel() {
    this._adapter.clearPriceLines();
    const runtime = this._runtime;
    if (!runtime || !runtime.getLatestData) return;
    const data = runtime.getLatestData()[this._activeSymbol];
    if (!data) return;

    const k = data.kernel || {};
    const setText = (id, val) => { const el = this._container.querySelector(id); if (el) el.innerHTML = val; };
    setText('#dp-trg', (k.trg || 0).toFixed(4));
    setText('#dp-dvf', (k.dvf || 0).toFixed(4));
    setText('#dp-lhds', (k.lhds_df || 0).toFixed(4));
    setText('#dp-eef', `EEF: <strong style="color:${k.eef === true ? '#10b981' : '#ef4444'};">${k.eef === true ? 'ALLOW' : (k.eef === false ? 'VETO' : '--')}</strong>`);
    setText('#dp-court', `COURT: <strong style="color:${k.eef === true ? '#10b981' : '#ef4444'};">${k.eef === true ? 'ALLOW_TRANSITION' : 'VETOED'}</strong>`);
    setText('#dp-signal', data.signal?.signal || '--');
    setText('#dp-regime', data.signal?.regime || '--');
    setText('#dp-sds', (k.scale_divergence_score || 0).toFixed(3));
    setText('#dp-conf', data.signal?.confidence != null ? `${data.signal.confidence.toFixed(1)}%` : '--');

    // Draw decision markers on chart if trade exists
    if (data.trade) {
      const latestTime = this._candles.length > 0 ? this._candles[this._candles.length - 1].time : Math.floor(Date.now() / 1000);
      const markers = [];
      if (data.trade.status === 'open' || data.trade.governance === 'ALLOW') {
        markers.push({
          time: latestTime, position: 'belowBar', color: '#10b981',
          shape: 'arrowUp', text: `${data.trade.direction} ALLOW @ ${data.trade.price}`
        });
      }
      if (data.trade.governance === 'REJECT' || data.trade.status === 'rejected') {
        markers.push({
          time: latestTime, position: 'aboveBar', color: '#ef4444',
          shape: 'arrowDown', text: 'VETOED'
        });
      }
      if (markers.length > 0) this._adapter.setMarkers(markers);
    }

    // Plot TP/SL lines if available
    if (data.trade?.takeProfit) {
      this._adapter.createPriceLine({ price: data.trade.takeProfit, color: '#10b981', title: `TP: ${data.trade.takeProfit}`, lineStyle: 2 });
    }
    if (data.trade?.stopLoss) {
      this._adapter.createPriceLine({ price: data.trade.stopLoss, color: '#ef4444', title: `SL: ${data.trade.stopLoss}`, lineStyle: 2 });
    }
  }

  _listenPlotTrade() {
    this._plotListener = (evt) => {
      if (evt.detail) this.plotTrade(evt.detail);
    };
    window.addEventListener('lyzer:plot-trade', this._plotListener);
  }

  _startLiveUpdates() {
    if (!this._runtime || !this._runtime.getLatestData) return;
    this._liveInterval = setInterval(() => {
      if (!this._container || !this._container.isConnected) { clearInterval(this._liveInterval); return; }
      this._updateDecisionPanel();

      // Update latest candle with real data if available
      const data = this._runtime.getLatestData()[this._activeSymbol];
      if (data?.market) {
        this._adapter.updateCandle(data.market);
      }
    }, 2000);
  }

  plotTrade(tradeData) {
    if (!this._adapter) return;
    if (tradeData.symbol && tradeData.symbol !== this._activeSymbol) {
      this._activeSymbol = tradeData.symbol;
      this._loadHistoricalCandles(tradeData.symbol);
      // Update active tab visual
      const container = this._container.querySelector('#asset-tabs-container');
      if (container) {
        container.querySelectorAll('.asset-tab').forEach(b => {
          b.style.background = b.dataset.sym === tradeData.symbol ? '#10b981' : '#1e293b';
          b.style.color = b.dataset.sym === tradeData.symbol ? '#020617' : '#94a3b8';
        });
      }
    }
    const { entry, tp, sl, side = 'BUY', title = 'TRADE_ENTRY' } = tradeData;
    this._adapter.clearPriceLines();
    if (entry) this._adapter.createPriceLine({ price: entry, color: '#38bdf8', title: `ENTRY (${side}): ${entry}`, lineStyle: 0 });
    if (tp) this._adapter.createPriceLine({ price: tp, color: '#10b981', title: `TP: ${tp}`, lineStyle: 2 });
    if (sl) this._adapter.createPriceLine({ price: sl, color: '#ef4444', title: `SL: ${sl}`, lineStyle: 2 });
    const latestTime = this._candles.length > 0 ? this._candles[this._candles.length - 1].time : Math.floor(Date.now() / 1000);
    this._adapter.setMarkers([{ time: latestTime, position: side === 'BUY' ? 'belowBar' : 'aboveBar', color: side === 'BUY' ? '#10b981' : '#ef4444', shape: side === 'BUY' ? 'arrowUp' : 'arrowDown', text: `${title} @ ${entry || 'MARKET'}` }]);
  }

  dispose() {
    if (this._liveInterval) { clearInterval(this._liveInterval); this._liveInterval = null; }
    if (this._plotListener) { window.removeEventListener('lyzer:plot-trade', this._plotListener); this._plotListener = null; }
    if (this._adapter) { this._adapter.dispose(); this._adapter = null; }
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
    this._runtime = null;
  }

  unmount() { this.dispose(); }
}
