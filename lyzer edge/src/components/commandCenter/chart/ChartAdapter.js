/**
 * Lyzer Edge Command Center V2 — ChartAdapter
 * Abstract Visualization Boundary between Lyzer Edge and underlying charting engines.
 * Supports Lightweight Charts and high-performance HTML5 Canvas fallback.
 */

import { ChartDataMapper } from './ChartDataMapper.js';
import { ChartViewport } from './ChartViewport.js';

export class ChartAdapter {
  constructor() {
    this._container = null;
    this._viewport = null;
    this._engine = null; // 'lightweight-charts' | 'canvas'
    this._chartInstance = null;
    this._seriesInstance = null;
    this._canvas = null;
    this._ctx = null;
    this._candles = [];
    this._markers = [];
  }

  /**
   * Initializes chart visualization inside container.
   * @param {HTMLElement} container 
   * @param {Object} options 
   */
  async createChart(container, options = {}) {
    if (!container) throw new Error('[ChartAdapter] Container DOM element required.');
    this._container = container;
    this._container.innerHTML = '';

    this._viewport = new ChartViewport(container, (w, h) => this._handleResize(w, h));

    // Try loading Lightweight Charts dynamically if present in global scope or package
    let lwCharts = options.lwCharts || window.LightweightCharts;

    if (!lwCharts) {
      try {
        lwCharts = await import('lightweight-charts');
      } catch (e) {
        // Module not found or browser context without NPM import - fallback to Canvas
        lwCharts = null;
      }
    }

    if (lwCharts && typeof lwCharts.createChart === 'function') {
      this._initLightweightCharts(lwCharts, options);
    } else {
      this._initCanvasFallback(options);
    }
  }

  _initLightweightCharts(lwCharts, options) {
    try {
      this._engine = 'lightweight-charts';
      this._chartInstance = lwCharts.createChart(this._container, {
        width: this._viewport.width,
        height: this._viewport.height,
        layout: {
          background: { color: options.bgColor || '#131722' },
          textColor: options.textColor || '#d1d4dc'
        },
        grid: {
          vertLines: { color: '#2b2b43' },
          horzLines: { color: '#2b2b43' }
        },
        ...options.chartConfig
      });

      this._seriesInstance = this._chartInstance.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
      });
    } catch (err) {
      // Fallback to Canvas if Lightweight Charts cannot bind to headless container
      this._initCanvasFallback(options);
    }
  }

  _initCanvasFallback(options) {
    this._engine = 'canvas';
    this._canvas = document.createElement('canvas');
    this._canvas.width = this._viewport.width || 800;
    this._canvas.height = this._viewport.height || 400;
    this._canvas.style.width = '100%';
    this._canvas.style.height = '100%';
    this._canvas.style.display = 'block';
    this._container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    this._renderCanvas();
  }

  setCandles(rawCandles) {
    this._candles = ChartDataMapper.mapSeries(rawCandles);

    if (this._engine === 'lightweight-charts' && this._seriesInstance) {
      this._seriesInstance.setData(this._candles);
    } else if (this._engine === 'canvas') {
      this._renderCanvas();
    }
  }

  updateCandle(rawCandle) {
    const candle = ChartDataMapper.mapCandle(rawCandle);
    if (!candle) return;

    if (this._candles.length > 0 && this._candles[this._candles.length - 1].time === candle.time) {
      this._candles[this._candles.length - 1] = candle;
    } else {
      this._candles.push(candle);
    }

    if (this._engine === 'lightweight-charts' && this._seriesInstance) {
      this._seriesInstance.update(candle);
    } else if (this._engine === 'canvas') {
      this._renderCanvas();
    }
  }

  setMarkers(markers) {
    this._markers = markers || [];
    if (this._engine === 'lightweight-charts' && this._seriesInstance && typeof this._seriesInstance.setMarkers === 'function') {
      this._seriesInstance.setMarkers(this._markers);
    } else if (this._engine === 'canvas') {
      this._renderCanvas();
    }
  }

  _handleResize(w, h) {
    if (this._engine === 'lightweight-charts' && this._chartInstance) {
      this._chartInstance.applyOptions({ width: w, height: h });
    } else if (this._engine === 'canvas' && this._canvas) {
      this._canvas.width = w;
      this._canvas.height = h;
      this._renderCanvas();
    }
  }

  _renderCanvas() {
    if (!this._ctx || !this._canvas) return;
    const ctx = this._ctx;
    const width = this._canvas.width;
    const height = this._canvas.height;

    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

    if (this._candles.length === 0) {
      ctx.fillStyle = '#9498ad';
      ctx.font = '14px sans-serif';
      ctx.fillText('Waiting for market data stream...', 20, 30);
      return;
    }

    // Basic canvas bar rendering for fallback
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of this._candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }
    const priceRange = (maxPrice - minPrice) || 1;

    const candleWidth = Math.max(2, Math.floor(drawWidth / this._candles.length) - 2);

    this._candles.forEach((c, idx) => {
      const x = padding + idx * (candleWidth + 2);
      const isUp = c.close >= c.open;

      const openY = padding + drawHeight - ((c.open - minPrice) / priceRange) * drawHeight;
      const closeY = padding + drawHeight - ((c.close - minPrice) / priceRange) * drawHeight;
      const highY = padding + drawHeight - ((c.high - minPrice) / priceRange) * drawHeight;
      const lowY = padding + drawHeight - ((c.low - minPrice) / priceRange) * drawHeight;

      ctx.strokeStyle = isUp ? '#26a69a' : '#ef5350';
      ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';

      // Draw wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body
      const topY = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(x, topY, candleWidth, bodyHeight);
    });
  }

  dispose() {
    if (this._chartInstance && typeof this._chartInstance.remove === 'function') {
      this._chartInstance.remove();
      this._chartInstance = null;
    }
    if (this._viewport) {
      this._viewport.dispose();
      this._viewport = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._candles = [];
    this._markers = [];
  }
}
