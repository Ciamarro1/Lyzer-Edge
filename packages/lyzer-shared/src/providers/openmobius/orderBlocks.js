export function calcAtr(candles, period = 14) {
  const len = candles ? candles.length : 0;
  if (len < period + 1) return null;
  let sum = 0;
  const start = len - period;
  for (let i = start; i < len; i++) {
    const prev_close = candles[i - 1].close;
    const current = candles[i];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev_close),
      Math.abs(current.low - prev_close)
    );
    sum += tr;
  }
  return sum / period;
}

export function find_order_blocks(candles, displacement_atr_mult = 1.5) {
  const out = [];
  const n = candles ? candles.length : 0;
  if (n < 4) return out;
  
  const atr = calcAtr(candles);
  if (atr === null) return out;
  
  const threshold = displacement_atr_mult * atr;
  
  for (let i = 0; i < n - 3; i++) {
    const c = candles[i];
    const is_bullish = c.is_bullish !== undefined ? c.is_bullish : (c.close >= c.open);
    
    const c1 = candles[i + 1];
    const c2 = candles[i + 2];
    const c3 = candles[i + 3];
    
    // bullish OB
    if (!is_bullish) {
      const move = c3.close - c.open;
      const cum_up = Math.max(0, c1.close - c1.open) + Math.max(0, c2.close - c2.open) + Math.max(0, c3.close - c3.open);
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
      const move = c.open - c3.close;
      const cum_dn = Math.max(0, c1.open - c1.close) + Math.max(0, c2.open - c2.close) + Math.max(0, c3.open - c3.close);
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
