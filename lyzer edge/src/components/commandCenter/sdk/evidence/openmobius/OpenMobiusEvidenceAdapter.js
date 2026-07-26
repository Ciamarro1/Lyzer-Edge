/**
 * Lyzer Edge — OpenMobiusEvidenceAdapter
 * Unified facade for the OpenMobius Cognitive Coprocessor.
 * Converts raw OHLCV market streams into probabilistic EvidenceContract objects.
 * Strict Zero-Trust Enforcement: ZERO execution or trade capability.
 */

import { OpenMobiusFeatureEngine } from './OpenMobiusFeatureEngine.js';
import { OpenMobiusPatternEngine } from './OpenMobiusPatternEngine.js';
import { OpenMobiusStructureAnalyzer } from './OpenMobiusStructureAnalyzer.js';
import { OpenMobiusRegimeDetector } from './OpenMobiusRegimeDetector.js';
import { OpenMobiusLiquidityEngine } from './OpenMobiusLiquidityEngine.js';
import { OpenMobiusEvidencePublisher } from './OpenMobiusEvidencePublisher.js';

export class OpenMobiusEvidenceAdapter {
  constructor(symbol = 'BTCUSDT') {
    this._symbol = symbol;
    this._featureEngine = new OpenMobiusFeatureEngine(1000);
    this._patternEngine = new OpenMobiusPatternEngine(100);
    this._structureAnalyzer = new OpenMobiusStructureAnalyzer(5);
    this._regimeDetector = new OpenMobiusRegimeDetector();
    this._liquidityEngine = new OpenMobiusLiquidityEngine(0.001);
    this._publisher = new OpenMobiusEvidencePublisher();
    this._disposed = false;

    this._capabilities = Object.freeze(new Set([
      'market_data:read',
      'feature_generation',
      'pattern_detection',
      'structure_analysis',
      'regime_detection',
      'evidence:publish'
    ]));
  }

  get capabilities() {
    return this._capabilities;
  }

  /**
   * Process an incoming OHLCV candle and produce a probabilistic EvidenceContract payload.
   * STRICT AXIOM: NEVER outputs BUY/SELL trade signals.
   */
  processCandle(candle) {
    if (this._disposed) {
      throw new Error('ERR_COPROCESSOR_DISPOSED: Cannot process candle on disposed adapter');
    }

    if (!candle || typeof candle.close !== 'number') {
      throw new Error('ERR_INVALID_CANDLE: Candle close price is required');
    }

    // 1. Feature Extraction
    this._featureEngine.pushCandle(candle.open, candle.high, candle.low, candle.close, candle.volume || 0);
    const range = this._featureEngine.getDealingRange(50);
    const volatility = this._featureEngine.getVolatility(20);

    // 2. Pattern Recognition (FVG / OB)
    this._patternEngine.processCandle(candle);
    const activeFVGs = this._patternEngine.getActiveFVGs();
    const orderBlocks = this._patternEngine.getOrderBlocks();

    // 3. Structure Analysis (BOS / CHoCH)
    const structure = this._structureAnalyzer.processCandle(candle);

    // 4. Regime Detection
    const regime = this._regimeDetector.detectRegime(volatility, structure.trendDirection, activeFVGs.length);

    // 5. Liquidity Engine
    const liquidity = this._liquidityEngine.processCandles([candle]);

    // 6. Non-Directional Evidence Publication
    return this._publisher.publishEvidence({
      symbol: this._symbol,
      timestamp: candle.timestamp || Date.now(),
      regime,
      fvgs: activeFVGs,
      orderBlocks,
      structure,
      liquidity,
      featureRange: range
    });
  }

  /**
   * TC39 Disposable compliance. Cleanly purges all internal buffers.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._featureEngine.clear();
    this._patternEngine.clear();
    this._structureAnalyzer.clear();
    this._liquidityEngine.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
