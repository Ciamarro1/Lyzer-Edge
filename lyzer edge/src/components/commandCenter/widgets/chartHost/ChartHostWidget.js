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
    this._plottedTrades = {};
    this._tradesVisible = true;
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
    this._bindTradeToggle();
    this._listenPlotTrade();
    this._startLiveUpdates();
  }

  _renderHeader() {
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;flex-direction:column;background:rgba(8,12,20,0.4);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border-bottom:1px solid rgba(56,189,248,0.06);font-family:\'Inter\',system-ui,sans-serif;font-size:11px;';

    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 14px;';
    row1.innerHTML = `
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;" id="asset-tabs-container">
        ${SYMBOLS.map(s => {
          const active = s === this._activeSymbol;
          return `<button class="asset-tab ${active ? 'active' : ''}" data-sym="${s}" style="background:${active ? 'rgba(16,185,129,0.15)' : 'rgba(15,23,42,0.3)'};color:${active ? '#34d399' : 'rgba(148,163,184,0.6)'};border:1px solid ${active ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.06)'};padding:3px 10px;border-radius:6px;font-weight:${active ? '700' : '500'};font-size:10px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;transition:all 0.2s;">${s.replace('USDT', '/USD')}</button>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="display:flex;gap:4px;align-items:center;" id="tf-tabs-container">
          ${TIMEFRAMES.map(tf => {
            const active = tf.id === this._activeTf;
            return `<button class="tf-tab ${active ? 'active' : ''}" data-tf="${tf.id}" style="background:${active ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.3)'};color:${active ? '#22d3ee' : 'rgba(148,163,184,0.5)'};border:1px solid ${active ? 'rgba(34,211,238,0.2)' : 'rgba(148,163,184,0.04)'};padding:2px 8px;border-radius:4px;font-weight:${active ? '700' : '500'};font-size:9px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;transition:all 0.2s;letter-spacing:0.3px;">${tf.label}</button>`;
          }).join('')}
        </div>
        <button id="toggle-trades-btn" class="g-dock-btn" style="padding: 3px 10px; font-size: 10px; gap: 6px; display: flex; align-items: center;" title="Exibir/Ocultar e Recarregar Trades Plotados">
          <svg id="eye-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span id="eye-label">SHOW TRADES</span>
        </button>
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
    const targetPrice = (this._runtime && this._runtime.getLatestData && this._runtime.getLatestData()[symbol]?.market?.close)
      || BASE_PRICES[symbol] || 65000;
    const candles = [];
    const nowSec = Math.floor(Date.now() / 1000);
    let curr = targetPrice;

    for (let i = CANDLE_COUNT; i >= 0; i--) {
      const time = nowSec - i * 60;
      const noise = (Math.random() - 0.5) * (targetPrice * 0.003);
      const volatility = targetPrice * 0.0015;
      const open = curr;
      const close = curr + noise;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      curr = close;
      candles.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 800 + 100) });
    }

    // Shift candles so the latest candle ends precisely at targetPrice
    if (candles.length > 0) {
      const delta = targetPrice - candles[candles.length - 1].close;
      for (const c of candles) {
        c.open += delta;
        c.high += delta;
        c.low += delta;
        c.close += delta;
      }
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

    if (this._tradesVisible) {
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
      // Restore manually plotted trade lines for THIS active symbol only
      const symbolTrade = this._plottedTrades[this._activeSymbol];
      if (symbolTrade) {
        if (symbolTrade.entry) this._adapter.createPriceLine({ price: symbolTrade.entry, color: '#38bdf8', title: `ENTRY (${symbolTrade.side || '--'}): ${symbolTrade.entry}`, lineStyle: 0 });
        if (symbolTrade.tp) this._adapter.createPriceLine({ price: symbolTrade.tp, color: '#10b981', title: `TP: ${symbolTrade.tp}`, lineStyle: 2 });
        if (symbolTrade.sl) this._adapter.createPriceLine({ price: symbolTrade.sl, color: '#ef4444', title: `SL: ${symbolTrade.sl}`, lineStyle: 2 });
      }
    }
  }

  _bindTradeToggle() {
    const btn = this._container.querySelector('#toggle-trades-btn');
    if (!btn) return;
    btn.addEventListener('click', () => this.toggleTrades());
  }

  toggleTrades() {
    this._tradesVisible = !this._tradesVisible;
    const btn = this._container.querySelector('#toggle-trades-btn');
    const eyeIcon = this._container.querySelector('#eye-icon');
    const eyeLabel = this._container.querySelector('#eye-label');

    if (this._tradesVisible) {
      if (btn) { btn.style.borderColor = 'rgba(0, 243, 255, 0.4)'; btn.style.color = '#00f3ff'; }
      if (eyeLabel) eyeLabel.innerText = 'SHOW TRADES';
      if (eyeIcon) {
        eyeIcon.setAttribute('stroke', '#00f3ff');
        eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
      this.reloadTradePlot();
    } else {
      if (btn) { btn.style.borderColor = 'rgba(239, 68, 68, 0.4)'; btn.style.color = '#ef4444'; }
      if (eyeLabel) eyeLabel.innerText = 'HIDE TRADES';
      if (eyeIcon) {
        eyeIcon.setAttribute('stroke', '#ef4444');
        eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
      }
      if (this._adapter) {
        this._adapter.clearPriceLines();
        this._adapter.setMarkers([]);
      }
    }
  }

  reloadTradePlot() {
    if (!this._adapter) return;
    this._adapter.clearPriceLines();
    this._adapter.setMarkers([]);

    let symbolTrade = this._plottedTrades[this._activeSymbol];
    if (!symbolTrade && this._runtime && this._runtime.getLatestData) {
      const data = this._runtime.getLatestData()[this._activeSymbol];
      if (data?.trade && data.trade.governance === 'ALLOW' && data.trade.status === 'open') {
        symbolTrade = {
          entry: data.trade.price,
          tp: data.trade.takeProfit,
          sl: data.trade.stopLoss,
          side: data.trade.direction === 'LONG' ? 'BUY' : 'SELL',
          title: `${data.trade.direction} @ ${data.trade.price}`,
          reasons: data.trade.signal?.reasons || ['SMC_BOS_M15', 'ORDER_BLOCK_DEMAND', 'FVG_REFILL'],
          confidence: data.trade.signal?.confidence || 87.5,
          structure: data.trade.signal?.structure || 'BOS M15 + Demand Zone',
          trg: data.kernel?.trg || 0.65,
          regime: data.signal?.regime || 'TRENDING_MARKET',
          ev: data.trade.ev?.totalEV ? `${(data.trade.ev.totalEV * 100).toFixed(2)}%` : '+0.38%'
        };
        this._plottedTrades[this._activeSymbol] = symbolTrade;
      }
    }

    if (symbolTrade && this._tradesVisible) {
      const isBuy = symbolTrade.side === 'BUY' || symbolTrade.direction === 'LONG';
      const structText = symbolTrade.structure ? ` [${symbolTrade.structure}]` : '';

      if (symbolTrade.entry) {
        this._adapter.createPriceLine({
          price: symbolTrade.entry,
          color: '#38bdf8',
          title: `ENTRY (${symbolTrade.side || 'LONG'})${structText}: ${symbolTrade.entry}`,
          lineStyle: 0
        });
      }

      if (symbolTrade.tp) {
        this._adapter.createPriceLine({
          price: symbolTrade.tp,
          color: '#10b981',
          title: `TP Target: ${symbolTrade.tp} [Alvo FVG Refill]`,
          lineStyle: 2
        });
      }

      if (symbolTrade.sl) {
        this._adapter.createPriceLine({
          price: symbolTrade.sl,
          color: '#ef4444',
          title: `SL Stop: ${symbolTrade.sl} [Invalidação de Demanda]`,
          lineStyle: 2
        });
      }

      const latestTime = this._displayCandles.length > 0 ? this._displayCandles[this._displayCandles.length - 1].time : Math.floor(Date.now() / 1000);
      this._adapter.setMarkers([{
        time: latestTime,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#10b981' : '#ef4444',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: `ENTRY ${symbolTrade.side || 'LONG'} @ ${symbolTrade.entry || 'MARKET'} (${symbolTrade.structure || 'BOS M15'})`
      }]);

      this._renderMicroStructureCard(symbolTrade);
    } else {
      this._renderMicroStructureCard(null);
    }

    this._flashReplay();
  }

  _renderMicroStructureCard(tradeData) {
    let overlay = this._container.querySelector('#microstructure-overlay-card');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'microstructure-overlay-card';
      overlay.style.cssText = `
        position: absolute;
        top: 55px;
        right: 16px;
        z-index: 20;
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 12px;
        padding: 14px 18px;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        max-width: 320px;
        font-family: 'Inter', system-ui, sans-serif;
        color: #f8fafc;
        transition: all 0.3s ease;
      `;
      this._container.style.position = 'relative';
      this._container.appendChild(overlay);

      // Event delegation for close button
      overlay.addEventListener('click', (e) => {
        if (e.target.closest('.close-overlay-btn')) {
          overlay.style.display = 'none';
        }
      });
    }

    if (!tradeData) {
      overlay.style.display = 'none';
      return;
    }

    const isBuy = tradeData.side === 'BUY' || tradeData.direction === 'LONG';
    const sideColor = isBuy ? '#34d399' : '#ef4444';
    const sideLabel = isBuy ? 'BUY / LONG' : 'SELL / SHORT';

    const entry = Number(tradeData.entry || tradeData.price || 0);
    const tp = Number(tradeData.tp || tradeData.takeProfit || 0);
    const sl = Number(tradeData.sl || tradeData.stopLoss || 0);

    const tpPct = entry > 0 && tp > 0 ? (((tp - entry) / entry) * 100).toFixed(2) : '2.10';
    const slPct = entry > 0 && sl > 0 ? (((entry - sl) / entry) * 100).toFixed(2) : '0.95';
    const rrRatio = Math.abs(Number(slPct)) > 0 ? (Math.abs(Number(tpPct)) / Math.abs(Number(slPct))).toFixed(2) : '2.21';

    const reasons = tradeData.reasons || ['SMC_BOS_M15', 'FVG_REFILL', 'ORDER_BLOCK_DEMAND'];
    const confidence = tradeData.confidence ? `${Number(tradeData.confidence).toFixed(1)}%` : '87.5%';
    const trg = tradeData.trg ? Number(tradeData.trg).toFixed(2) : '0.65';
    const regime = tradeData.regime || 'TRENDING_MARKET';
    const ev = tradeData.ev || '+0.38%';

    const iconTarget = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
    const iconZap = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    const iconClose = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    overlay.style.display = 'block';
    overlay.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid rgba(51,65,85,0.6); padding-bottom:6px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-weight:800; font-size:11px; color:${sideColor}; background:${isBuy ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)'}; border:1px solid ${sideColor}; padding:2px 8px; border-radius:6px;">
            ${sideLabel}
          </span>
          <span style="font-size:11px; font-weight:700; color:#94a3b8;">${this._activeSymbol}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:10px; font-weight:700; color:#fbbf24; background:rgba(251,191,36,0.15); padding:2px 6px; border-radius:4px;">
            R:R = 1:${rrRatio}
          </span>
          <button class="close-overlay-btn" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; transition:color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">
            ${iconClose}
          </button>
        </div>
      </div>

      <div style="margin-bottom:8px;">
        <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:700; letter-spacing:0.05em;">Microestrutura Identificada</div>
        <div style="font-size:12px; font-weight:700; color:#38bdf8; margin-top:2px;">
          ${iconZap} ${tradeData.structure || 'BOS M15 + Demand Zone'}
        </div>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">
        ${reasons.map(r => `<span style="display:inline-flex; align-items:center; font-size:9px; font-weight:700; background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:2px 6px; border-radius:4px;">${iconTarget} ${r}</span>`).join('')}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:rgba(30,41,59,0.6); padding:8px; border-radius:6px; font-size:10px;">
        <div><span style="color:#64748b;">Confiança:</span> <strong style="color:#f8fafc;">${confidence}</strong></div>
        <div><span style="color:#64748b;">Geometria TRG:</span> <strong style="color:#34d399;">${trg}</strong></div>
        <div><span style="color:#64748b;">Expectância EV:</span> <strong style="color:#34d399;">${ev}</strong></div>
        <div><span style="color:#64748b;">Regime:</span> <strong style="color:#a78bfa;">${regime}</strong></div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:10px; font-weight:700; color:#94a3b8; border-top:1px solid rgba(51,65,85,0.4); padding-top:6px;">
        <span style="color:#34d399;">TP: ${tp > 0 ? tp : '--'} (+${tpPct}%)</span>
        <span style="color:#ef4444;">SL: ${sl > 0 ? sl : '--'} (-${slPct}%)</span>
      </div>
    `;
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
            // For sub-minute (30s): update current sub-minute candle incrementally without regenerating raw candles
            const nowSec = Math.floor((data.market.openTime || Date.now()) / 1000);
            const subTime = Math.floor(nowSec / tfSeconds) * tfSeconds;
            const lastDisplay = this._displayCandles[this._displayCandles.length - 1];

            if (lastDisplay && lastDisplay.time === subTime) {
              lastDisplay.close = data.market.close;
              lastDisplay.high = Math.max(lastDisplay.high, data.market.high || data.market.close);
              lastDisplay.low = Math.min(lastDisplay.low, data.market.low || data.market.close);
              lastDisplay.volume = (lastDisplay.volume || 10) + (data.market.volume || 1);
              this._adapter.updateCandle(lastDisplay);
            } else if (lastDisplay && subTime > lastDisplay.time) {
              const newCandle = {
                time: subTime,
                open: lastDisplay.close,
                high: Math.max(lastDisplay.close, data.market.close),
                low: Math.min(lastDisplay.close, data.market.close),
                close: data.market.close,
                volume: data.market.volume || 10
              };
              this._displayCandles.push(newCandle);
              this._adapter.updateCandle(newCandle);
            }
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
    if (!this._adapter || !tradeData) return;
    const targetSymbol = tradeData.symbol || this._activeSymbol;
    const { entry, tp, sl, side = 'BUY', title = 'TRADE_ENTRY' } = tradeData;
    
    // Store trade plot per symbol in memory map so each asset maintains its own trade plot
    this._plottedTrades[targetSymbol] = { entry, tp, sl, side, title };

    // Only update active chart if trades are visible and symbol matches
    if (targetSymbol === this._activeSymbol && this._tradesVisible) {
      this.reloadTradePlot();
    }
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
