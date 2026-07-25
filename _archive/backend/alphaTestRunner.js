/**
 * ARL v2 Alpha Test Runner
 * Simulates entry/exit execution and injects execution friction.
 */

export function simulateExit(candles, startIndex, direction) {
  // Exit after a fixed holding window of 5 candles, or at the end of the series
  const exitIndex = Math.min(startIndex + 5, candles.length - 1);
  const exitPrice = candles[exitIndex].close;
  return { price: exitPrice, index: exitIndex };
}

export function executionCost(entry, exit, candle) {
  // Spread: 0.01% of the closing price
  const spread = candle.close * 0.0001;

  // Slippage: 20% of the price difference between exit and entry
  const slippage = Math.abs(exit.price - entry.price) * 0.2;

  // Volatility penalty: high-low difference scaled by 0.05
  const volatilityPenalty = candle.high - candle.low;

  return spread + slippage + volatilityPenalty * 0.05;
}

export function runAlphaTests(signal, candles, regimes) {
  const trades = [];
  
  // Start from index 30 to allow warm up of signal calculations
  for (let i = 30; i < candles.length; i++) {
    const regime = regimes[i];
    const entry = signal.trigger(candles, i, regime);

    if (!entry) continue;

    const exit = simulateExit(candles, i, entry.direction);
    
    // Relative returns calculations
    const priceDiff = entry.direction === "LONG" 
      ? (exit.price - entry.price) 
      : (entry.price - exit.price);
    
    const rawPnl = priceDiff / entry.price;
    const frictionRaw = executionCost(entry, exit, candles[i]);
    const friction = frictionRaw / entry.price;
    const netPnl = rawPnl - friction;

    trades.push({
      i,
      regime,
      rawPnl,
      friction,
      netPnl
    });
  }

  return trades;
}
