/**
 * LiveTradingView — Real-time candlestick dashboard for all trading pairs.
 * Renders live OHLCV charts using Canvas API with ARL signal overlays.
 */

import { wsClient } from '../services/wsClient.js';

// ── Color Palette ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0e1a',
  panel:     '#0f1629',
  border:    '#1e2d50',
  accent:    '#3b82f6',
  green:     '#10b981',
  red:       '#ef4444',
  yellow:    '#f59e0b',
  purple:    '#8b5cf6',
  text:      '#e2e8f0',
  textMuted: '#64748b',
  grid:      'rgba(255,255,255,0.04)',
  longBg:    'rgba(16,185,129,0.12)',
  shortBg:   'rgba(239,68,68,0.12)',
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];

const SYMBOL_META = {
  BTCUSDT: { label: 'BTC/USDT', base: 'BTC', color: '#f59e0b' },
  ETHUSDT: { label: 'ETH/USDT', base: 'ETH', color: '#8b5cf6' },
  SOLUSDT: { label: 'SOL/USDT', base: 'SOL', color: '#10b981' },
  BNBUSDT: { label: 'BNB/USDT', base: 'BNB', color: '#3b82f6' },
  EURUSDT: { label: 'EUR/USDT', base: 'EUR', color: '#10b981' },
  GBPUSDT: { label: 'GBP/USDT', base: 'GBP', color: '#8b5cf6' },
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  candles:   Object.fromEntries(SYMBOLS.map(s => [s, []])),
  latest:    Object.fromEntries(SYMBOLS.map(s => [s, null])),
  signals:   Object.fromEntries(SYMBOLS.map(s => [s, null])),
  trades:    Object.fromEntries(SYMBOLS.map(s => [s, []])),
  pnl:       Object.fromEntries(SYMBOLS.map(s => [s, 0])),
  overlays:  Object.fromEntries(SYMBOLS.map(s => [s, null])),
  active:    'BTCUSDT',
  connState: 'CONNECTING',
  visibleCount: 80,
};

// ── Canvas Candlestick Renderer ───────────────────────────────────────────────
function renderChart(canvas, symbol) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, H);

  const candles = state.candles[symbol];
  if (candles.length < 2) {
    ctx.fillStyle = C.textMuted;
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Aguardando dados ao vivo...', W / 2, H / 2);
    return;
  }

  const PADDING_LEFT = 8;
  const PADDING_RIGHT = 62; // space for price axis
  const PADDING_TOP = 16;
  const PADDING_BOT = 28;

  const visibleCount = Math.min(state.visibleCount || 80, candles.length);
  const visible = candles.slice(-visibleCount);

  const allHigh = visible.map(c => c.high);
  const allLow  = visible.map(c => c.low);

  // Auto-scale to fit Entry, TP, and SL lines if they exist
  const activeOpenTrade = state.trades[symbol].find(t => t.status === 'open');
  if (activeOpenTrade) {
    if (activeOpenTrade.entryPrice) {
      allHigh.push(activeOpenTrade.entryPrice);
      allLow.push(activeOpenTrade.entryPrice);
    }
    if (activeOpenTrade.takeProfit) {
      allHigh.push(activeOpenTrade.takeProfit);
      allLow.push(activeOpenTrade.takeProfit);
    }
    if (activeOpenTrade.stopLoss) {
      allHigh.push(activeOpenTrade.stopLoss);
      allLow.push(activeOpenTrade.stopLoss);
    }
  }

  const priceMax = Math.max(...allHigh) * 1.002;
  const priceMin = Math.min(...allLow)  * 0.998;
  const priceRange = priceMax - priceMin || 1;

  const chartW = W - PADDING_LEFT - PADDING_RIGHT;
  const chartH = H - PADDING_TOP - PADDING_BOT;
  const candleW = Math.max(2, Math.floor(chartW / visibleCount) - 1);

  const toY = (p) => PADDING_TOP + (1 - (p - priceMin) / priceRange) * chartH;
  const toX = (i) => PADDING_LEFT + (i + 0.5) * (chartW / visibleCount);

  // Grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = PADDING_TOP + (i / gridLines) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.moveTo(PADDING_LEFT, y);
    ctx.lineTo(W - PADDING_RIGHT, y);
    ctx.stroke();

    const price = priceMax - (i / gridLines) * priceRange;
    ctx.fillStyle = C.textMuted;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(price, symbol), W - PADDING_RIGHT + 4, y + 4);
  }

  // Trade markers overlay
  const tradeList = state.trades[symbol].slice(-50);
  const tradeMap = new Map();
  tradeList.forEach(t => {
    const key = Math.round(t.openTime / 60000); // minute bucket
    tradeMap.set(key, t);
  });

  // ── Provider overlays (zones, markers, S/R) ─────────────────────────
  const overlayData = state.overlays[symbol];
  if (overlayData) {
    const { zones, markers, srLevels } = overlayData;

    // Find candle index by timestamp
    const findCandleX = (ts) => {
      const idx = visible.findIndex(c => {
        const ct = c.openTime || c.timestamp || 0;
        return ct >= ts;
      });
      return idx >= 0 ? toX(idx) : null;
    };

    // Support/Resistance levels
    if (srLevels) {
      srLevels.forEach(sr => {
        const y = toY(sr.price);
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = sr.type === 'RESISTANCE' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)';
        ctx.lineWidth = 1;
        ctx.moveTo(PADDING_LEFT, y);
        ctx.lineTo(W - PADDING_RIGHT, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = sr.type === 'RESISTANCE' ? 'rgba(239,68,68,0.6)' : 'rgba(16,185,129,0.6)';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(sr.type === 'RESISTANCE' ? 'R' : 'S', PADDING_LEFT + 4, y - 2);
      });
    }

    // Zones: FVG, OB, EQH, EQL, SWEEP
    if (zones) {
      zones.forEach(zone => {
        const x = findCandleX(zone.created_at);
        if (x === null) return;
        ctx.globalAlpha = zone.mitigated === true ? 0.2 : 1.0;

        if (zone.type === 'FVG') {
          const y0 = toY(zone.upper_bound);
          const y1 = toY(zone.lower_bound);
          const h = Math.abs(y1 - y0);
          const fill = zone.direction === 'BULLISH'
            ? 'rgba(16,185,129,0.15)'
            : 'rgba(239,68,68,0.15)';
          const border = zone.direction === 'BULLISH'
            ? 'rgba(16,185,129,0.5)'
            : 'rgba(239,68,68,0.5)';
          ctx.fillStyle = fill;
          ctx.fillRect(PADDING_LEFT, Math.min(y0, y1), chartW, h);
          ctx.strokeStyle = border;
          ctx.lineWidth = 0.5;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(PADDING_LEFT, Math.min(y0, y1), chartW, h);
          ctx.setLineDash([]);
          ctx.fillStyle = zone.direction === 'BULLISH' ? C.green : C.red;
          ctx.font = '8px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`FVG · ${zone.timeframe}`, PADDING_LEFT + 4, Math.min(y0, y1) - 2);
        } else if (zone.type === 'OB') {
          const y0 = toY(zone.upper_bound);
          const y1 = toY(zone.lower_bound);
          const fill = zone.direction === 'BULLISH'
            ? 'rgba(16,185,129,0.2)'
            : 'rgba(239,68,68,0.2)';
          ctx.fillStyle = fill;
          ctx.fillRect(x - candleW, Math.min(y0, y1), candleW * 2, Math.abs(y1 - y0));
          ctx.strokeStyle = zone.direction === 'BULLISH' ? C.green : C.red;
          ctx.lineWidth = 1;
          ctx.strokeRect(x - candleW, Math.min(y0, y1), candleW * 2, Math.abs(y1 - y0));
          ctx.fillStyle = zone.direction === 'BULLISH' ? C.green : C.red;
          ctx.font = '7px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`OB · ${zone.timeframe}`, x, Math.min(y0, y1) - 2);
        } else if (zone.type === 'EQH' || zone.type === 'EQL') {
          const y = toY(zone.price);
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = zone.type === 'EQH' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)';
          ctx.lineWidth = 1;
          ctx.moveTo(PADDING_LEFT, y);
          ctx.lineTo(W - PADDING_RIGHT, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = zone.type === 'EQH' ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)';
          ctx.font = '8px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${zone.type} · ${zone.timeframe}`, PADDING_LEFT + 4, y - 2);
        } else if (zone.type === 'SWEEP') {
          const y = toY(zone.price);
          ctx.beginPath();
          ctx.fillStyle = zone.direction === 'BULLISH' ? C.green : C.red;
          const arrowDir = zone.direction === 'BULLISH' ? -1 : 1;
          ctx.moveTo(x, y + arrowDir * 8);
          ctx.lineTo(x - 4, y + arrowDir * 2);
          ctx.lineTo(x + 4, y + arrowDir * 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = zone.direction === 'BULLISH' ? C.green : C.red;
          ctx.font = '7px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`SWEEP · ${zone.timeframe}`, x, y + arrowDir * 14);
        }
        ctx.globalAlpha = 1.0;
      });
    }

    // Structure markers: SWING_HIGH, SWING_LOW, BOS, CHOCH
    if (markers) {
      markers.forEach(m => {
        const x = findCandleX(m.timestamp);
        if (x === null) return;
        const y = toY(m.price);

        if (m.type === 'SWING_HIGH' || m.type === 'SWING_LOW') {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (m.type === 'BOS') {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(59,130,246,0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 2]);
          ctx.moveTo(x, y - 12);
          ctx.lineTo(x, y + 12);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(59,130,246,0.7)';
          ctx.font = 'bold 8px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BOS', x, y + (m.direction === 'BULLISH' ? -16 : 20));
        } else if (m.type === 'CHOCH') {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(245,158,11,0.7)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 2]);
          ctx.moveTo(x, y - 12);
          ctx.lineTo(x, y + 12);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(245,158,11,0.8)';
          ctx.font = 'bold 8px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('CHOCH', x, y + (m.direction === 'BULLISH' ? -16 : 20));
        }
      });
    }
  }

  // Candles
  visible.forEach((c, i) => {
    const x = toX(i);
    const openY  = toY(c.open);
    const closeY = toY(c.close);
    const highY  = toY(c.high);
    const lowY   = toY(c.low);
    const isBull = c.close >= c.open;
    const color  = isBull ? C.green : C.red;

    // Wick
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // Body
    const bodyTop = Math.min(openY, closeY);
    const bodyH   = Math.max(1, Math.abs(closeY - openY));
    ctx.fillStyle = color;
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);

    // Trade marker
    const bucket = Math.round((c.openTime || Date.now()) / 60000);
    const trade = tradeMap.get(bucket);
    if (trade) {
      const isLong = trade.direction === 'LONG';
      ctx.beginPath();
      ctx.fillStyle = isLong ? C.green : C.red;
      if (isLong) {
        // Up arrow
        ctx.moveTo(x, lowY - 8);
        ctx.lineTo(x - 5, lowY - 2);
        ctx.lineTo(x + 5, lowY - 2);
      } else {
        // Down arrow
        ctx.moveTo(x, highY + 8);
        ctx.lineTo(x - 5, highY + 2);
        ctx.lineTo(x + 5, highY + 2);
      }
      ctx.closePath();
      ctx.fill();
    }
  });

  // Open trade lines overlay (SL and TP visual feedback)
  if (activeOpenTrade && activeOpenTrade.stopLoss && activeOpenTrade.takeProfit) {
    const entryY = toY(activeOpenTrade.entryPrice);
    const slY = toY(activeOpenTrade.stopLoss);
    const tpY = toY(activeOpenTrade.takeProfit);

    // Entry price line (Orange)
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.moveTo(PADDING_LEFT, entryY);
    ctx.lineTo(W - PADDING_RIGHT, entryY);
    ctx.stroke();

    // Entry price label
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fillRect(PADDING_LEFT + 4, entryY - 14, 85, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ENTRY: ${formatPrice(activeOpenTrade.entryPrice, symbol)}`, PADDING_LEFT + 8, entryY - 4);

    // Stop Loss line (Red)
    ctx.beginPath();
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 3]);
    ctx.moveTo(PADDING_LEFT, slY);
    ctx.lineTo(W - PADDING_RIGHT, slY);
    ctx.stroke();

    // Stop Loss label
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(PADDING_LEFT + 4, slY - 14, 75, 14);
    ctx.fillStyle = C.red;
    ctx.fillText(`SL: ${formatPrice(activeOpenTrade.stopLoss, symbol)}`, PADDING_LEFT + 8, slY - 4);

    // Take Profit line (Green)
    ctx.beginPath();
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 3]);
    ctx.moveTo(PADDING_LEFT, tpY);
    ctx.lineTo(W - PADDING_RIGHT, tpY);
    ctx.stroke();

    // Take Profit label
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(PADDING_LEFT + 4, tpY - 14, 75, 14);
    ctx.fillStyle = C.green;
    ctx.fillText(`TP: ${formatPrice(activeOpenTrade.takeProfit, symbol)}`, PADDING_LEFT + 8, tpY - 4);

    ctx.setLineDash([]); // Reset dash pattern
  }

  // Live price line
  const last = visible[visible.length - 1];
  if (last) {
    const liveY = toY(last.close);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = SYMBOL_META[symbol].color;
    ctx.lineWidth = 1;
    ctx.moveTo(PADDING_LEFT, liveY);
    ctx.lineTo(W - PADDING_RIGHT, liveY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live price badge
    ctx.fillStyle = SYMBOL_META[symbol].color;
    const badgeW = 58;
    ctx.fillRect(W - PADDING_RIGHT, liveY - 9, badgeW, 18);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatPrice(last.close, symbol), W - PADDING_RIGHT + badgeW / 2, liveY + 4);
  }

  // Volume bars (bottom strip)
  const volMax = Math.max(...visible.map(c => c.volume || 1));
  const volH = PADDING_BOT - 4;
  visible.forEach((c, i) => {
    const x = toX(i);
    const vol = ((c.volume || 0) / volMax) * volH;
    ctx.fillStyle = c.close >= c.open ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
    ctx.fillRect(x - candleW / 2, H - PADDING_BOT + 4, candleW, vol);
  });
}

function formatPrice(p, symbol) {
  if (!p) return '-';
  if (symbol === 'BTCUSDT') return p.toFixed(0);
  if (symbol === 'BNBUSDT') return p.toFixed(1);
  if (symbol === 'EURUSDT' || symbol === 'GBPUSDT') return p.toFixed(4);
  return p.toFixed(2);
}

function formatPct(v) {
  const sign = v >= 0 ? '+' : '';
  return sign + (v * 100).toFixed(2) + '%';
}

// ── Mini Sparkline for sidebar ─────────────────────────────────────────────────
function renderSparkline(canvas, symbol) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const candles = state.candles[symbol];
  if (candles.length < 2) return;
  const closes = candles.slice(-24).map(c => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const step = W / (closes.length - 1);
  const color = closes[closes.length - 1] >= closes[0] ? C.green : C.red;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  closes.forEach((v, i) => {
    const x = i * step;
    const y = H - 2 - ((v - min) / range) * (H - 4);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// ── HTML Builder ──────────────────────────────────────────────────────────────
export class LiveTradingView {
  constructor() {
    this._el = null;
    this._canvases = {};
    this._sparklines = {};
    this._raf = null;
    this._unsub = null;
    this._ticker = null;
  }

  render(root) {
    root.innerHTML = '';
    this._el = root;
    root.innerHTML = this._buildHTML();
    this._attachEvents();
    this._connectWS();
    this._startRenderLoop();

    // Load initial history for all symbols to populate charts and sparklines immediately
    SYMBOLS.forEach(s => this._loadHistory(s));
  }

  _buildHTML() {
    const tabs = SYMBOLS.map(s => {
      const meta = SYMBOL_META[s];
      const isActive = s === state.active;
      return `
        <button class="ltv-tab ${isActive ? 'ltv-tab--active' : ''}" data-symbol="${s}" id="tab-${s}">
          <span class="ltv-tab-dot" style="background:${meta.color}"></span>
          <span class="ltv-tab-label">${meta.label}</span>
          <span class="ltv-tab-price" id="tabprice-${s}">—</span>
        </button>`;
    }).join('');

    const cards = SYMBOLS.map(s => {
      const meta = SYMBOL_META[s];
      return `
        <div class="ltv-minicard" data-symbol="${s}" id="card-${s}">
          <div class="ltv-minicard-header">
            <span class="ltv-minicard-dot" style="background:${meta.color}"></span>
            <span class="ltv-minicard-label">${meta.label}</span>
            <span class="ltv-minicard-state" id="state-${s}">●</span>
          </div>
          <div class="ltv-minicard-price" id="mprice-${s}">—</div>
          <canvas class="ltv-spark" id="spark-${s}" width="100" height="32"></canvas>
          <div class="ltv-minicard-signal" id="msignal-${s}">—</div>
          <div class="ltv-minicard-pnl" id="mpnl-${s}">P&L: —</div>
        </div>`;
    }).join('');

    return `
<style>
/* ── LiveTradingView Styles ─────────────────────────────────────── */
#ltv-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${C.bg};
  font-family: 'Inter', system-ui, sans-serif;
  color: ${C.text};
  gap: 0;
  overflow: hidden;
}

/* Header */
.ltv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 10px;
  border-bottom: 1px solid ${C.border};
  background: ${C.panel};
  flex-shrink: 0;
}
.ltv-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: ${C.text};
  letter-spacing: 0.02em;
}
.ltv-header-live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16,185,129,0.15);
  border: 1px solid rgba(16,185,129,0.3);
  color: ${C.green};
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.05em;
}
.ltv-live-dot {
  width: 7px; height: 7px;
  background: ${C.green};
  border-radius: 50%;
  animation: ltv-pulse 1.4s ease-in-out infinite;
}
@keyframes ltv-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}
.ltv-conn-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid;
}
.ltv-conn-badge.connected { color: ${C.green}; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.1); }
.ltv-conn-badge.connecting { color: ${C.yellow}; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.1); }
.ltv-conn-badge.polling { color: ${C.accent}; border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); }

/* Tab Bar */
.ltv-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 12px;
  background: ${C.bg};
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
  overflow-x: auto;
}
.ltv-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${C.textMuted};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}
.ltv-tab:hover { background: rgba(255,255,255,0.05); color: ${C.text}; }
.ltv-tab--active {
  background: ${C.panel};
  border-color: ${C.border};
  color: ${C.text};
}
.ltv-tab-dot { width: 8px; height: 8px; border-radius: 50%; }
.ltv-tab-price { font-size: 12px; color: ${C.textMuted}; margin-left: 4px; }

/* Main layout */
.ltv-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* Sidebar */
.ltv-sidebar {
  width: 200px;
  min-width: 200px;
  background: ${C.panel};
  border-right: 1px solid ${C.border};
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  overflow-y: auto;
}

.ltv-minicard {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid ${C.border};
  background: transparent;
  cursor: pointer;
  transition: all 0.18s;
}
.ltv-minicard:hover { background: rgba(255,255,255,0.03); }
.ltv-minicard.active { border-color: ${C.accent}; background: rgba(59,130,246,0.08); }
.ltv-minicard-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.ltv-minicard-dot { width: 7px; height: 7px; border-radius: 50%; }
.ltv-minicard-label { font-size: 11px; font-weight: 600; color: ${C.textMuted}; flex: 1; }
.ltv-minicard-state { font-size: 10px; color: ${C.textMuted}; }
.ltv-minicard-price { font-size: 16px; font-weight: 700; color: ${C.text}; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
.ltv-spark { display: block; width: 100%; margin-bottom: 6px; }
.ltv-minicard-signal { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; display: inline-block; margin-bottom: 3px; }
.ltv-minicard-signal.long { color: ${C.green}; background: rgba(16,185,129,0.15); }
.ltv-minicard-signal.short { color: ${C.red}; background: rgba(239,68,68,0.15); }
.ltv-minicard-signal.flat { color: ${C.textMuted}; background: rgba(255,255,255,0.05); }
.ltv-minicard-pnl { font-size: 10px; color: ${C.textMuted}; }

/* Chart area */
.ltv-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Chart info bar */
.ltv-infobar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 16px;
  background: ${C.panel};
  border-bottom: 1px solid ${C.border};
  flex-shrink: 0;
  overflow-x: auto;
}
.ltv-infobar-item { display: flex; flex-direction: column; gap: 1px; }
.ltv-infobar-lbl { font-size: 10px; color: ${C.textMuted}; text-transform: uppercase; letter-spacing: 0.06em; }
.ltv-infobar-val { font-size: 13px; font-weight: 600; color: ${C.text}; font-variant-numeric: tabular-nums; }
.ltv-infobar-val.green { color: ${C.green}; }
.ltv-infobar-val.red { color: ${C.red}; }
.ltv-infobar-val.yellow { color: ${C.yellow}; }

/* Canvas wrapper */
.ltv-chart-wrap {
  flex: 1;
  padding: 8px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
canvas.ltv-chart {
  width: 100%;
  flex: 1;
  border-radius: 8px;
  display: block;
}

/* Trade log */
.ltv-tradelog {
  height: 140px;
  background: ${C.panel};
  border-top: 1px solid ${C.border};
  overflow-y: auto;
  padding: 0;
  flex-shrink: 0;
}
.ltv-tradelog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  border-bottom: 1px solid ${C.border};
  position: sticky;
  top: 0;
  background: ${C.panel};
  z-index: 1;
}
.ltv-tradelog-title { font-size: 11px; font-weight: 600; color: ${C.textMuted}; text-transform: uppercase; letter-spacing: 0.06em; }
.ltv-tradelog-body { }
.ltv-trade-row {
  display: grid;
  grid-template-columns: 80px 60px 90px 90px 80px 80px;
  gap: 4px;
  padding: 5px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  transition: background 0.15s;
}
.ltv-trade-row:hover { background: rgba(255,255,255,0.03); }
.ltv-trade-col { color: ${C.textMuted}; }
.ltv-trade-dir-long { color: ${C.green}; font-weight: 700; }
.ltv-trade-dir-short { color: ${C.red}; font-weight: 700; }
.ltv-trade-pnl-pos { color: ${C.green}; font-weight: 600; }
.ltv-trade-pnl-neg { color: ${C.red}; font-weight: 600; }
.ltv-trade-gov-allow { color: ${C.green}; }
.ltv-trade-gov-reject { color: ${C.red}; }
.ltv-trade-header-row {
  display: grid;
  grid-template-columns: 80px 60px 90px 90px 80px 80px;
  gap: 4px;
  padding: 4px 14px;
  font-size: 10px;
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${C.border};
  background: ${C.bg};
  position: sticky;
  top: 34px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
</style>

<div id="ltv-root">
  <div class="ltv-header">
    <div class="ltv-header-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${C.accent}" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      Lyzer Live Trading
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <div class="ltv-header-live-badge"><div class="ltv-live-dot"></div>LIVE TESTNET</div>
      <div class="ltv-conn-badge connecting" id="ltv-conn-badge">CONNECTING</div>
    </div>
  </div>

  <div class="ltv-tabs">${tabs}</div>

  <div class="ltv-body">
    <div class="ltv-sidebar">${cards}</div>

    <div class="ltv-main">
      <div class="ltv-infobar" id="ltv-infobar">
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Par</div><div class="ltv-infobar-val" id="info-symbol">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Preço</div><div class="ltv-infobar-val" id="info-price">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Abertura</div><div class="ltv-infobar-val" id="info-open">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Máx</div><div class="ltv-infobar-val green" id="info-high">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Mín</div><div class="ltv-infobar-val red" id="info-low">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Volume</div><div class="ltv-infobar-val" id="info-vol">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Sinal ARL</div><div class="ltv-infobar-val" id="info-signal">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Confiança</div><div class="ltv-infobar-val" id="info-conf">—</div></div>
        <div class="ltv-infobar-item"><div class="ltv-infobar-lbl">Candles</div><div class="ltv-infobar-val" id="info-count">—</div></div>
      </div>

      <div class="ltv-chart-wrap" style="position: relative;">
        <canvas class="ltv-chart" id="ltv-main-chart"></canvas>
        <div style="position: absolute; right: 75px; top: 15px; display: flex; gap: 6px; z-index: 10;">
          <button id="ltv-zoom-in" style="background:${C.panel}; border:1px solid ${C.border}; color:${C.text}; border-radius:4px; width:26px; height:26px; cursor:pointer; font-weight:bold; font-size:14px; display:flex; align-items:center; justify-content:center;" title="Zoom In">+</button>
          <button id="ltv-zoom-out" style="background:${C.panel}; border:1px solid ${C.border}; color:${C.text}; border-radius:4px; width:26px; height:26px; cursor:pointer; font-weight:bold; font-size:14px; display:flex; align-items:center; justify-content:center;" title="Zoom Out">-</button>
        </div>
      </div>

      <div class="ltv-tradelog">
        <div class="ltv-tradelog-header">
          <span class="ltv-tradelog-title">📋 Operações Recentes — <span id="log-symbol">${state.active}</span></span>
          <span style="font-size:11px;color:${C.textMuted}" id="log-count">0 operações</span>
        </div>
        <div class="ltv-tradelog-body">
          <div class="ltv-trade-header-row">
            <span>Hora</span><span>Dir.</span><span>Entrada</span><span>Saída</span><span>P&L</span><span>Gov.</span>
          </div>
          <div id="ltv-trade-rows"></div>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }

  _attachEvents() {
    // Tab clicks
    SYMBOLS.forEach(s => {
      const tab = document.getElementById(`tab-${s}`);
      if (tab) tab.addEventListener('click', () => this._setActive(s));
      const card = document.getElementById(`card-${s}`);
      if (card) card.addEventListener('click', () => this._setActive(s));
    });
    // Store canvas refs
    this._mainCanvas = document.getElementById('ltv-main-chart');
    SYMBOLS.forEach(s => {
      this._sparklines[s] = document.getElementById(`spark-${s}`);
    });

    // Zoom buttons and mouse wheel zoom events
    const zoomInBtn = document.getElementById('ltv-zoom-in');
    const zoomOutBtn = document.getElementById('ltv-zoom-out');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        state.visibleCount = Math.max(10, Math.min(300, state.visibleCount - 10));
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        state.visibleCount = Math.max(10, Math.min(300, state.visibleCount + 10));
      });
    }
    if (this._mainCanvas) {
      this._mainCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 10 : -10;
        state.visibleCount = Math.max(10, Math.min(300, state.visibleCount + delta));
      }, { passive: false });
    }
  }


  async _loadHistory(symbol) {
    try {
      const res = await fetch(`/api/candles/${symbol}`);
      if (!res.ok) return;
      const data = await res.json();
      
      if (data && Array.isArray(data.candles)) {
        state.candles[symbol] = data.candles.map(c => ({
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
          openTime: c.timestamp || c.openTime
        }));
        if (data.candles.length > 0) {
          state.latest[symbol] = data.candles[data.candles.length - 1].close;
        }
      }
      
      if (data && Array.isArray(data.trades)) {
        state.trades[symbol] = data.trades.map(t => {
          // If the timestamp is a number, format it, otherwise default to locale time string
          const date = typeof t.timestamp === 'number' ? new Date(t.timestamp * 1000) : new Date();
          return {
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            direction: t.direction,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            pnl: parseFloat(t.pnl) || 0,
            governance: t.governanceDecision,
            openTime: t.timestamp,
            status: t.status || 'closed',
            stopLoss: t.stopLoss || null,
            takeProfit: t.takeProfit || null
          };
        });
      }
      
      if (symbol === state.active) {
        if (data.connectionState) {
          state.connState = data.connectionState;
          this._updateConnBadge();
        }
        this._updateTradeLog();
      }
    } catch (e) {
      console.error(`[LTV] Failed to load history for ${symbol}:`, e);
    }
  }

  _setActive(symbol) {
    state.active = symbol;
    SYMBOLS.forEach(s => {
      const tab = document.getElementById(`tab-${s}`);
      if (tab) tab.classList.toggle('ltv-tab--active', s === symbol);
      const card = document.getElementById(`card-${s}`);
      if (card) card.classList.toggle('active', s === symbol);
    });
    document.getElementById('log-symbol').textContent = symbol;
    this._loadHistory(symbol);
  }

  _connectWS() {
    wsClient.connect();
    const handler = (data) => {
      const sym = data.symbol;
      if (!sym || !SYMBOLS.includes(sym)) return;

      if (data.type === 'tick' && data.market) {
        const c = data.market;
        const lastCandle = state.candles[sym][state.candles[sym].length - 1];
        if (!lastCandle || lastCandle.openTime !== c.openTime) {
          state.candles[sym].push({
            open: c.open, high: c.high, low: c.low,
            close: c.close, volume: c.volume || 0,
            openTime: c.openTime || Date.now()
          });
          if (state.candles[sym].length > 300) state.candles[sym].shift();
        } else {
          // Update live candle in-place
          lastCandle.high  = Math.max(lastCandle.high, c.high);
          lastCandle.low   = Math.min(lastCandle.low, c.low);
          lastCandle.close = c.close;
          lastCandle.volume = c.volume || lastCandle.volume;
        }
        state.latest[sym] = c.close;

      } else if (data.type === 'arl' && data.market) {
        const c = data.market;
        // ARL candle close — ensure it's recorded
        const lastCandle = state.candles[sym][state.candles[sym].length - 1];
        if (!lastCandle || lastCandle.openTime !== c.openTime) {
          state.candles[sym].push({
            open: c.open || lastCandle?.close || 0,
            high: c.high || c.close, low: c.low || c.close,
            close: c.close, volume: c.volume || 0,
            openTime: c.openTime || Date.now()
          });
          if (state.candles[sym].length > 300) state.candles[sym].shift();
        }
        state.latest[sym] = c.close;

        if (data.signal) {
          state.signals[sym] = data.signal;
        }

        if (data.overlays) {
          state.overlays[sym] = data.overlays;
        }

        if (data.trade) {
          const tradeTime = typeof data.trade.index === 'number' && data.trade.index > 100000
            ? new Date(data.trade.index * 1000)
            : new Date();
          const tEntry = {
            time: tradeTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            direction: data.trade.direction,
            entryPrice: data.trade.price,
            exitPrice: data.trade.status === 'open' ? null : data.trade.price * (1 + (parseFloat(data.trade.pnl) / 100 || 0)),
            pnl: parseFloat(data.trade.pnl) / 100 || 0,
            governance: data.trade.governance,
            openTime: typeof data.trade.index === 'number' && data.trade.index > 100000 ? data.trade.index : Math.floor(tradeTime.getTime() / 1000),
            status: data.trade.status || 'closed',
            stopLoss: data.trade.stopLoss || null,
            takeProfit: data.trade.takeProfit || null
          };

          if (tEntry.status === 'closed') {
            const openIdx = state.trades[sym].findIndex(t => t.status === 'open');
            if (openIdx !== -1) {
              state.trades[sym][openIdx] = tEntry;
            } else {
              state.trades[sym].push(tEntry);
            }
          } else {
            const openIdx = state.trades[sym].findIndex(t => t.status === 'open');
            if (openIdx !== -1) {
              state.trades[sym][openIdx] = tEntry;
            } else {
              state.trades[sym].push(tEntry);
            }
          }

          if (state.trades[sym].length > 100) state.trades[sym].shift();
          if (sym === state.active) this._updateTradeLog();
        }

        // Update connection badge
        if (data.connectionState) {
          state.connState = data.connectionState;
          this._updateConnBadge();
        }
      }
    };

    wsClient.onData(handler);
    this._unsub = () => wsClient.offData(handler);
  }

  _updateConnBadge() {
    const badge = document.getElementById('ltv-conn-badge');
    if (!badge) return;
    const s = state.connState;
    badge.className = 'ltv-conn-badge';
    if (s === 'CONNECTED') { badge.classList.add('connected'); badge.textContent = 'CONECTADO'; }
    else if (s === 'POLLING' || s === 'polling') { badge.classList.add('polling'); badge.textContent = 'REST POLL'; }
    else { badge.classList.add('connecting'); badge.textContent = s; }
  }

  _updateInfoBar() {
    const sym = state.active;
    const candles = state.candles[sym];
    const last = candles[candles.length - 1];
    const sig = state.signals[sym];
    if (!last) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('info-symbol', SYMBOL_META[sym].label);
    set('info-price', formatPrice(last.close, sym));
    set('info-open', formatPrice(last.open, sym));
    set('info-high', formatPrice(last.high, sym));
    set('info-low', formatPrice(last.low, sym));
    set('info-vol', last.volume ? last.volume.toFixed(2) : '—');
    if (sig) {
      const sigEl = document.getElementById('info-signal');
      if (sigEl) {
        const dir = sig.signal === 'go' || sig.signal === 'long' ? 'LONG' :
                    sig.signal === 'stop' || sig.signal === 'short' ? 'SHORT' : 'FLAT';
        sigEl.textContent = dir;
        sigEl.style.color = dir === 'LONG' ? C.green : dir === 'SHORT' ? C.red : C.textMuted;
      }
      set('info-conf', sig.confidence ? (sig.confidence * 100).toFixed(1) + '%' : '—');
    }
    set('info-count', candles.length + ' candles');
  }

  _updateSidebar() {
    SYMBOLS.forEach(sym => {
      const price = state.latest[sym];
      const sig = state.signals[sym];

      // Tab price
      const tabPrice = document.getElementById(`tabprice-${sym}`);
      if (tabPrice && price) tabPrice.textContent = formatPrice(price, sym);

      // Minicard price
      const mPrice = document.getElementById(`mprice-${sym}`);
      if (mPrice && price) mPrice.textContent = formatPrice(price, sym);

      // State indicator
      const stateEl = document.getElementById(`state-${sym}`);
      if (stateEl) {
        const hasData = state.candles[sym].length > 0;
        stateEl.style.color = hasData ? C.green : C.textMuted;
        stateEl.title = hasData ? 'Recebendo dados' : 'Aguardando...';
      }

      // Signal badge
      const mSig = document.getElementById(`msignal-${sym}`);
      if (mSig && sig) {
        const dir = sig.signal === 'go' || sig.signal === 'long' ? 'long' :
                    sig.signal === 'stop' || sig.signal === 'short' ? 'short' : 'flat';
        mSig.className = `ltv-minicard-signal ${dir}`;
        mSig.textContent = dir.toUpperCase();
      }

      // PnL
      const trades = state.trades[sym];
      const activeOpenTrade = trades.find(t => t.status === 'open');
      const pnlEl = document.getElementById(`mpnl-${sym}`);
      if (pnlEl) {
        if (activeOpenTrade && price) {
          let livePnl = 0;
          if (activeOpenTrade.direction === 'LONG') {
            livePnl = (price - activeOpenTrade.entryPrice) / activeOpenTrade.entryPrice;
          } else {
            livePnl = (activeOpenTrade.entryPrice - price) / activeOpenTrade.entryPrice;
          }
          pnlEl.textContent = `P&L: ${formatPct(livePnl)}`;
          pnlEl.style.color = livePnl >= 0 ? C.green : C.red;
        } else if (trades.length > 0) {
          const totalPnl = trades.reduce((a, t) => a + (t.pnl || 0), 0);
          pnlEl.textContent = `P&L: ${formatPct(totalPnl)}`;
          pnlEl.style.color = totalPnl >= 0 ? C.green : C.red;
        } else {
          pnlEl.textContent = `P&L: --`;
          pnlEl.style.color = '';
        }
      }

      // Sparkline
      const spark = this._sparklines[sym];
      if (spark) renderSparkline(spark, sym);
    });
  }

  _updateTradeLog() {
    const sym = state.active;
    const trades = state.trades[sym].slice().reverse().slice(0, 30);
    const el = document.getElementById('ltv-trade-rows');
    const countEl = document.getElementById('log-count');
    if (!el) return;
    if (countEl) countEl.textContent = `${state.trades[sym].length} operações`;
    el.innerHTML = trades.map(t => {
      const isLong = t.direction === 'LONG';
      const pnlPos = t.pnl >= 0;
      return `<div class="ltv-trade-row">
        <span class="ltv-trade-col">${t.time}</span>
        <span class="${isLong ? 'ltv-trade-dir-long' : 'ltv-trade-dir-short'}">${t.direction}</span>
        <span class="ltv-trade-col">${formatPrice(t.entryPrice, sym)}</span>
        <span class="ltv-trade-col">${formatPrice(t.exitPrice, sym)}</span>
        <span class="${pnlPos ? 'ltv-trade-pnl-pos' : 'ltv-trade-pnl-neg'}">${formatPct(t.pnl)}</span>
        <span class="${t.governance === 'ALLOW' ? 'ltv-trade-gov-allow' : 'ltv-trade-gov-reject'}">${t.governance || '—'}</span>
      </div>`;
    }).join('');
  }

  _startRenderLoop() {
    const tick = () => {
      if (!document.getElementById('ltv-root')) {
        cancelAnimationFrame(this._raf);
        return;
      }
      const canvas = this._mainCanvas;
      if (canvas) {
        // Size canvas to its CSS size
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width  = Math.floor(rect.width);
          canvas.height = Math.floor(rect.height);
        }
        if (canvas.width > 0 && canvas.height > 0) {
          renderChart(canvas, state.active);
        }
      }
      this._updateInfoBar();
      this._updateSidebar();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._unsub) this._unsub();
  }
}
