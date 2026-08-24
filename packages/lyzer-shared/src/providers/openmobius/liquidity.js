export function find_sweeps(candles, swings, lookback_bars = 15) {
  const out = [];
  const n = candles ? candles.length : 0;
  if (!swings || swings.length === 0 || n < 2) return out;

  for (let i = 1; i < n; i++) {
    const c = candles[i];
    
    // buy-side sweep
    for (let k = 0; k < swings.length; k++) {
      const s = swings[k];
      if (s.kind !== 'high') continue;
      const sh_idx = s.index;
      const sh_price = s.price;
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
    for (let k = 0; k < swings.length; k++) {
      const s = swings[k];
      if (s.kind !== 'low') continue;
      const sl_idx = s.index;
      const sl_price = s.price;
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
