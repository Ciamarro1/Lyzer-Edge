/**
 * MarketStateEngine — Lyzer Edge vNext Market Causality Engine
 * Classifies market dynamics bar by bar into 9 distinct regimes.
 */

export const MARKET_STATES = {
  ACCUMULATION: 'ACCUMULATION',
  EXPANSION:    'EXPANSION',
  DISTRIBUTION: 'DISTRIBUTION',
  REBALANCE:    'REBALANCE',
  TREND:        'TREND',
  RANGE:        'RANGE',
  STOP_HUNT:    'STOP_HUNT',
  NEWS:         'NEWS',
  LOW_LIQUIDITY:'LOW_LIQUIDITY'
};

export class MarketStateEngine {
  constructor() {
    this.history = [];
  }

  evaluateState(candles) {
    if (!candles || candles.length < 14) {
      return { state: MARKET_STATES.RANGE, confidence: 0.5, metrics: {} };
    }

    const recent = candles.slice(-14);
    const last = recent[recent.length - 1];
    
    // Calculate ATR (14)
    let trSum = 0;
    for (let i = 1; i < recent.length; i++) {
      const highLow = recent[i].high - recent[i].low;
      const highClose = Math.abs(recent[i].high - recent[i - 1].close);
      const lowClose = Math.abs(recent[i].low - recent[i - 1].close);
      trSum += Math.max(highLow, highClose, lowClose);
    }
    const atr = trSum / 13;
    const bodySize = Math.abs(last.close - last.open);
    const rangeSize = last.high - last.low;
    const isExpansion = bodySize > atr * 1.5;
    const isStopHunt = (rangeSize > atr * 2.0) && (bodySize < rangeSize * 0.3);

    let currentState = MARKET_STATES.RANGE;
    let confidence = 0.7;

    if (isStopHunt) {
      currentState = MARKET_STATES.STOP_HUNT;
      confidence = 0.85;
    } else if (isExpansion) {
      currentState = MARKET_STATES.EXPANSION;
      confidence = 0.90;
    } else if (rangeSize < atr * 0.5) {
      currentState = MARKET_STATES.ACCUMULATION;
      confidence = 0.75;
    }

    return {
      state: currentState,
      confidence,
      metrics: { atr, bodySize, rangeSize }
    };
  }
}
