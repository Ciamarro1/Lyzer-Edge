/**
 * Lyzer Edge Command Center V2 — ChartHostWidget
 * High-performance market visualization widget using ChartAdapter.
 */

import { chartHostManifest } from './manifest.js';
import { ChartAdapter } from '../../chart/ChartAdapter.js';

export class ChartHostWidget {
  constructor() {
    this.manifest = chartHostManifest;
    this._container = null;
    this._runtime = null;
    this._adapter = null;
    this._disposable = null;
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;

    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.position = 'relative';

    this._adapter = new ChartAdapter();
    await this._adapter.createChart(this._container);

    // Initial historical data fetch if available
    try {
      if (typeof this._runtime.getMarketData === 'function') {
        const history = this._runtime.getMarketData({ symbol: 'BTCUSDT', limit: 100 });
        if (Array.isArray(history)) {
          this._adapter.setCandles(history);
        }
      }
    } catch (e) {
      // Ignored if getMarketData not supported in mock provider
    }

    // High frequency stream subscription
    this._subscribe();
  }

  _subscribe() {
    if (this._runtime && typeof this._runtime.subscribeMarketData === 'function') {
      this._disposable = this._runtime.subscribeMarketData(
        { symbol: 'BTCUSDT', timeframe: '1m' },
        (data) => {
          if (Array.isArray(data)) {
            this._adapter.setCandles(data);
          } else if (data && typeof data === 'object') {
            this._adapter.updateCandle(data);
          }
        }
      );
    }
  }

  dispose() {
    if (this._disposable && typeof this._disposable.dispose === 'function') {
      this._disposable.dispose();
      this._disposable = null;
    }
    if (this._adapter) {
      this._adapter.dispose();
      this._adapter = null;
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
