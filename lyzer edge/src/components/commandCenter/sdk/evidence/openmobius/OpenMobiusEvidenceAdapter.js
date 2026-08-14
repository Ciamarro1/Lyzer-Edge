/**
 * Lyzer Edge — OpenMobiusEvidenceAdapter
 * High-throughput cognitive coprocessor adapter emitting non-directional EvidenceContract payloads.
 */

import { OpenMobiusPatternEngine } from './OpenMobiusPatternEngine.js';
import { OpenMobiusEvidencePublisher } from './OpenMobiusEvidencePublisher.js';

export class OpenMobiusEvidenceAdapter {
  constructor(symbol = 'BTCUSDT') {
    this.symbol = symbol;
    this._patternEngine = new OpenMobiusPatternEngine();
    this._publisher = new OpenMobiusEvidencePublisher();
    this._isDisposed = false;
  }

  processCandle(candle) {
    if (this._isDisposed) {
      throw new Error('ERR_COPROCESSOR_DISPOSED: Cannot process candle on disposed coprocessor adapter');
    }

    this._patternEngine.processCandle(candle);

    const timestamp = candle.timestamp || candle.openTime || Date.now();
    const fvgs = this._patternEngine._fvgs || [];
    const orderBlocks = this._patternEngine._orderBlocks || [];

    const regime = {
      EXPANSION: fvgs.length > 0 ? 0.7 : 0.3,
      CONSOLIDATION: 0.2,
      HIGH_VOLATILITY: orderBlocks.length > 0 ? 0.5 : 0.1
    };

    return this._publisher.publishEvidence({
      symbol: this.symbol,
      timestamp,
      regime,
      fvgs,
      orderBlocks,
      structure: { valid: true },
      liquidity: { fvgCount: fvgs.length },
      featureRange: { high: candle.high, low: candle.low }
    });
  }

  dispose() {
    this._isDisposed = true;
    this._patternEngine = null;
    this._publisher = null;
  }
}
