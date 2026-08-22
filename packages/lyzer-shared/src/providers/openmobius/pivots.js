export function findSwings(candles, left = 2, right = 2) {
  const out = [];
  const n = candles.length;
  
  for (let i = left; i < n - right; i++) {
    const c = candles[i];
    
    // high pivot
    let isHigh = true;
    for (let k = 1; k <= left; k++) {
      if (c.high < candles[i - k].high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      for (let k = 1; k <= right; k++) {
        if (c.high < candles[i + k].high) {
          isHigh = false;
          break;
        }
      }
    }
    
    if (isHigh) {
      out.push({ index: i, price: c.high, kind: "high" });
    }
    
    // low pivot
    let isLow = true;
    for (let k = 1; k <= left; k++) {
      if (c.low > candles[i - k].low) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      for (let k = 1; k <= right; k++) {
        if (c.low > candles[i + k].low) {
          isLow = false;
          break;
        }
      }
    }
    
    if (isLow) {
      out.push({ index: i, price: c.low, kind: "low" });
    }
  }
  
  return out;
}
