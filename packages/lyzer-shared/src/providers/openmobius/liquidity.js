export function find_sweeps(candles, swings, lookback_bars = 15) {
  const out = [];
  const n = candles.length;
  
  const swing_highs = swings
    .filter(s => s.kind === 'high')
    .map(s => [s.index, s.price]);
    
  const swing_lows = swings
    .filter(s => s.kind === 'low')
    .map(s => [s.index, s.price]);

  for (let i = 1; i < n; i++) {
    const c = candles[i];
    
    // buy-side sweep
    for (const [sh_idx, sh_price] of swing_highs) {
      if (sh_idx >= i) continue;
      if (i - sh_idx > lookback_bars) continue;
      if (c.high > sh_price && c.close < sh_price) {
        out.push({
          type: "buy_side_sweep",
          swept_level: Number(sh_price.toFixed(4)),
          swept_level_index: sh_idx,
          sweep_candle_index: i,
          age_bars: n - 1 - i,
          wick_size: Number((c.high - Math.max(c.open, c.close)).toFixed(4))
        });
        break;
      }
    }
    
    // sell-side sweep
    for (const [sl_idx, sl_price] of swing_lows) {
      if (sl_idx >= i) continue;
      if (i - sl_idx > lookback_bars) continue;
      if (c.low < sl_price && c.close > sl_price) {
        out.push({
          type: "sell_side_sweep",
          swept_level: Number(sl_price.toFixed(4)),
          swept_level_index: sl_idx,
          sweep_candle_index: i,
          age_bars: n - 1 - i,
          wick_size: Number((Math.min(c.open, c.close) - c.low).toFixed(4))
        });
        break;
      }
    }
  }
  
  return out;
}
