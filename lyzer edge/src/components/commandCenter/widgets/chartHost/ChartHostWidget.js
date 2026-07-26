import { chartHostManifest } from './manifest.js';
import { ChartAdapter } from '../../chart/ChartAdapter.js';

const CANDLE_COUNT = 1500;
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];
const BASE_PRICES = { BTCUSDT: 65000, ETHUSDT: 3450, SOLUSDT: 185, BNBUSDT: 580, EURUSDT: 1.08, GBPUSDT: 1.27 };

const TIMEFRAMES = [
  { id: '30s', label: '30S', seconds: 30 },
  { id: '1m', label: '1M', seconds: 60 },
  { id: '5m', label: '5M', seconds: 300 },
  { id: '15m', label: '15M', seconds: 900 },
  { id: '1h', label: '1H', seconds: 3600 },
];

export class ChartHostWidget {
  constructor() {
    this.manifest = chartHostManifest;
    this._container = null;
    this._runtime = null;
    this._adapter = null;
    this._activeSymbol = 'BTCUSDT';
    this._activeTf = '1m';
    this._rawCandles = [];
    this._displayCandles = [];
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

    this._loadRawCandles(this._activeSymbol);
    this._bindAssetTabs();
    this._bindTimeframeTabs();
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
      <div style="display:flex;gap:4px;align-items:center;" id="tf-tabs-container">
        ${TIMEFRAMES.map(tf => {
          const active = tf.id === this._activeTf;
          return `<button class="tf-tab ${active ? 'active' : ''}" data-tf="${tf.id}" style="background:${active ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.3)'};color:${active ? '#22d3ee' : 'rgba(148,163,184,0.5)'};border:1px solid ${active ? 'rgba(34,211,238,0.2)' : 'rgba(148,163,184,0.04)'};padding:2px 8px;border-radius:4px;font-weight:${active ? '700' : '500'};font-size:9px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;transition:all 0.2s;letter-spacing:0.3px;">${tf.label}</button>`;
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
        b.style.background = 'rgba(15,23,42,0.3)'; b.style.color = 'rgba(148,163,184,0.6)'; b.style.borderColor = 'rgba(148,163,184,0.06)';
      });
      btn.style.background = 'rgba(16,185,129,0.15)'; btn.style.color = '#34d399'; btn.style.borderColor = 'rgba(52,211,153,0.2)';
      this._activeSymbol = sym;
      this._loadRawCandles(sym);
      this._updateDecisionPanel();
    });
  }

  _bindTimeframeTabs() {
    const container = this._container.querySelector('#tf-tabs-container');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.tf-tab');
      if (!btn) return;
      const tf = btn.dataset.tf;
      if (tf === this._activeTf) return;
      container.querySelectorAll('.tf-tab').forEach(b => {
        b.style.background = 'rgba(15,23,42,0.3)'; b.style.color = 'rgba(148,163,184,0.5)'; b.style.borderColor = 'rgba(148,163,184,0.04)'; b.style.fontWeight = '500';
      });
      btn.style.background = 'rgba(6,182,212,0.15)'; btn.style.color = '#22d3ee'; btn.style.borderColor = 'rgba(34,211,238,0.2)'; btn.style.fontWeight = '700';
      this._activeTf = tf;
      this._applyTimeframe();
    });
  }

  _loadRawCandles(symbol) {
    const basePrice = BASE_PRICES[symbol] || 65000;
    const candles = [];
    const nowSec = Math.floor(Date.now() / 1000);
    let curr = basePrice;

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
    this._rawCandles = candles;
    this._applyTimeframe();
  }

  _applyTimeframe() {
    const tfConfig = TIMEFRAMES.find(t => t.id === this._activeTf);
    if (!tfConfig) return;
    const seconds = tfConfig.seconds;

    if (seconds === 60) {
      this._displayCandles = this._rawCandles;
    } else if (seconds < 60) {
      this._displayCandles = this._interpolateToSubMinutes(this._rawCandles, seconds);
    } else {
      this._displayCandles = this._aggregateCandles(this._rawCandles, seconds);
    }

    this._adapter.setCandles(this._displayCandles);
    this._adapter.clearPriceLines();
    this._updateDecisionPanel();
  }

  _interpolateToSubMinutes(raw, targetSeconds) {
    const subCandlesPerMin = 60 / targetSeconds;
    const result = [];
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      const prevClose = i > 0 ? raw[i - 1].close : c.open;
      for (let s = 0; s < subCandlesPerMin; s++) {
        const t0 = s / subCandlesPerMin;
        const t1 = (s + 1) / subCandlesPerMin;
        const open = t0 === 0 ? c.open : prevClose + (c.close - prevClose) * t0;
        const close = prevClose + (c.close - prevClose) * t1;
        const midRange = (c.high - c.low) * 0.15;
        const high = Math.max(open, close) + Math.random() * midRange;
        const low = Math.min(open, close) - Math.random() * midRange;
        result.push({
          time: c.time - 60 + (s + 1) * targetSeconds,
          open, high, low, close,
          volume: Math.ceil(c.volume / subCandlesPerMin)
        });
      }
    }
    return result;
  }

  _aggregateCandles(raw, targetSeconds) {
    const groupSize = targetSeconds / 60;
    const result = [];
    for (let i = 0; i < raw.length; i += groupSize) {
      const chunk = raw.slice(i, i + groupSize);
      if (chunk.length === 0) continue;
      const open = chunk[0].open;
      const close = chunk[chunk.length - 1].close;
      let high = -Infinity, low = Infinity, volume = 0;
      for (const c of chunk) {
        if (c.high > high) high = c.high;
        if (c.low < low) low = c.low;
        volume += c.volume;
      }
      result.push({ time: chunk[chunk.length - 1].time, open, high, low, close, volume });
    }
    return result;
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

    if (data.trade) {
      const latestTime = this._displayCandles.length > 0 ? this._displayCandles[this._displayCandles.length - 1].time : Math.floor(Date.now() / 1000);
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

      // Aggregate new raw candle into current timeframe
      const tfConfig = TIMEFRAMES.find(t => t.id === this._activeTf);
      const tfSeconds = tfConfig?.seconds || 60;
      const data = this._runtime.getLatestData()[this._activeSymbol];
      if (data?.market) {
        if (tfSeconds <= 60) {
          if (tfSeconds === 60) {
            this._adapter.updateCandle(data.market);
          } else {
            // For sub-minute: regenerate full display from raw
            this._loadRawCandles(this._activeSymbol);
          }
        } else {
          // For higher timeframes: append raw candle, re-aggregate the last chunk
          this._rawCandles.push(data.market);
          if (this._rawCandles.length > CANDLE_COUNT * 2) {
            this._rawCandles = this._rawCandles.slice(-CANDLE_COUNT);
          }
          // Rebuild display candles from raw
          this._displayCandles = this._aggregateCandles(this._rawCandles, tfSeconds);
          this._adapter.setCandles(this._displayCandles);
        }
      }
    }, 2000);
  }

  plotTrade(tradeData) {
    if (!this._adapter) return;
    if (tradeData.symbol && tradeData.symbol !== this._activeSymbol) {
      this._activeSymbol = tradeData.symbol;
      this._loadRawCandles(tradeData.symbol);
      const container = this._container.querySelector('#asset-tabs-container');
      if (container) {
        container.querySelectorAll('.asset-tab').forEach(b => {
          b.style.background = b.dataset.sym === tradeData.symbol ? 'rgba(16,185,129,0.15)' : 'rgba(15,23,42,0.3)';
          b.style.color = b.dataset.sym === tradeData.symbol ? '#34d399' : 'rgba(148,163,184,0.6)';
          b.style.borderColor = b.dataset.sym === tradeData.symbol ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.06)';
        });
      }
    }
    const { entry, tp, sl, side = 'BUY', title = 'TRADE_ENTRY' } = tradeData;
    this._adapter.clearPriceLines();
    if (entry) this._adapter.createPriceLine({ price: entry, color: '#38bdf8', title: `ENTRY (${side}): ${entry}`, lineStyle: 0 });
    if (tp) this._adapter.createPriceLine({ price: tp, color: '#10b981', title: `TP: ${tp}`, lineStyle: 2 });
    if (sl) this._adapter.createPriceLine({ price: sl, color: '#ef4444', title: `SL: ${sl}`, lineStyle: 2 });
    const latestTime = this._displayCandles.length > 0 ? this._displayCandles[this._displayCandles.length - 1].time : Math.floor(Date.now() / 1000);
    this._adapter.setMarkers([{ time: latestTime, position: side === 'BUY' ? 'belowBar' : 'aboveBar', color: side === 'BUY' ? '#10b981' : '#ef4444', shape: side === 'BUY' ? 'arrowUp' : 'arrowDown', text: `${title} @ ${entry || 'MARKET'}` }]);
    this._flashReplay();
  }

  _flashReplay() {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;border:2px solid rgba(56,189,248,0.3);border-radius:4px;box-shadow:inset 0 0 60px rgba(56,189,248,0.08);opacity:1;transition:opacity 1s ease;';
    this._container.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0'; });
    setTimeout(() => { if (flash.parentNode) flash.remove(); }, 1200);
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
