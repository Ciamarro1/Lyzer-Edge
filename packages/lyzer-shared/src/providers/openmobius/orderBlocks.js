export function calcAtr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const prev_close = candles[i - 1].close;
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prev_close),
      Math.abs(candles[i].low - prev_close)
    );
    trs.push(tr);
  }
  if (trs.length < period) return null;
  const last_period_trs = trs.slice(-period);
  const sum = last_period_trs.reduce((a, b) => a + b, 0);
  return sum / period;
}

export function find_order_blocks(candles, displacement_atr_mult = 1.5) {
  const out = [];
  const n = candles.length;
  if (n < 4) return out;
  
  const atr = calcAtr(candles);
  if (atr === null) return out;
  
  const threshold = displacement_atr_mult * atr;
  
  for (let i = 0; i < n - 3; i++) {
    const c = candles[i];
    const is_bullish = c.close >= c.open;
    
    const next3 = candles.slice(i + 1, i + 4);
    if (next3.length < 3) continue;
    
    // bullish OB
    if (!is_bullish) {
      const move = next3[next3.length - 1].close - c.open;
      const cum_up = next3.reduce((sum, x) => sum + Math.max(0, x.close - x.open), 0);
      if (move > threshold && cum_up > threshold) {
        out.push({
          type: "bullish_ob",
          top: Number(c.open.toFixed(4)),
          bottom: Number(c.low.toFixed(4)),
          formed_at_index: i,
          age_bars: n - 1 - i,
          displacement_atr: Number((move / atr).toFixed(2))
        });
      }
    } 
    // bearish OB
    else if (is_bullish) {
      const move = c.open - next3[next3.length - 1].close;
      const cum_dn = next3.reduce((sum, x) => sum + Math.max(0, x.open - x.close), 0);
      if (move > threshold && cum_dn > threshold) {
        out.push({
          type: "bearish_ob",
          top: Number(c.high.toFixed(4)),
          bottom: Number(c.open.toFixed(4)),
          formed_at_index: i,
          age_bars: n - 1 - i,
          displacement_atr: Number((move / atr).toFixed(2))
        });
      }
    }
  }
  
  return out;
}
