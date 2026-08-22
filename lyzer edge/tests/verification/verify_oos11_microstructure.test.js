import { describe, it, expect } from 'vitest';

describe('OOS-11 Microstructure Discovery & Opportunity Scoring Suite', () => {
  const ATR_P80 = 0.00055;
  const VOLZ_P80 = 0.315;
  const VWAP_P80 = 0.00963;

  function calculateOppScore(candle, historicalCandles) {
    const i = historicalCandles.length - 1;
    let atr14 = 0;
    let count = 0;
    for (let j = Math.max(0, i - 13); j <= i; j++) {
      atr14 += (historicalCandles[j].high - historicalCandles[j].low);
      count++;
    }
    const atr14_pct = count > 0 ? (atr14 / count) / candle.close : 0;

    const vol_arr = historicalCandles.slice(Math.max(0, i - 59)).map(c => c.volume);
    const mean = vol_arr.reduce((a, b) => a + b, 0) / (vol_arr.length || 1);
    const variance = vol_arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vol_arr.length || 1);
    const std = Math.sqrt(variance) || 1;
    const vol_zscore = (candle.volume - mean) / std;

    let sumPv = 0, sumV = 0;
    for (const c of historicalCandles.slice(Math.max(0, i - 1439))) {
      sumPv += ((c.high + c.low + c.close) / 3) * c.volume;
      sumV += c.volume;
    }
    const vwap = sumV > 0 ? sumPv / sumV : candle.close;
    const distance_vwap = (candle.close - vwap) / vwap;

    let score = 0;
    if (atr14_pct >= ATR_P80) score++;
    if (vol_zscore >= VOLZ_P80) score++;
    if (Math.abs(distance_vwap) >= VWAP_P80) score++;

    return { score, atr14_pct, vol_zscore, distance_vwap };
  }

  function extractMicrostructureFeatures(tickBuffer, depthBuffer, t0) {
    const tMinus10 = t0 - 10000;
    const trades = tickBuffer.filter(t => t.time >= tMinus10 && t.time <= t0);
    const depths = depthBuffer.filter(d => d.time >= tMinus10 && d.time <= t0);

    let buyVol = 0, sellVol = 0;
    trades.forEach(t => {
      if (t.isBuyerMaker) sellVol += t.qty;
      else buyVol += t.qty;
    });

    const lastDepth = depths.length > 0 ? depths[depths.length - 1] : null;
    const spread = lastDepth && lastDepth.bidPrice > 0 ? (lastDepth.askPrice - lastDepth.bidPrice) / lastDepth.bidPrice : 0;
    const imbalance = (buyVol + sellVol) > 0 ? (buyVol - sellVol) / (buyVol + sellVol) : 0;

    return {
      t0,
      tradesCount: trades.length,
      buyVol,
      sellVol,
      imbalance,
      spread
    };
  }

  it('deve calcular Opportunity Score combinando ATR P80, Vol Z-Score e VWAP distance', () => {
    const candles = Array.from({ length: 100 }, (_, i) => ({
      high: 60100 + i * 10,
      low: 59900 + i * 10,
      close: 60000 + i * 10,
      volume: 100 + (i === 99 ? 500 : 10) // High volume on last candle
    }));

    const result = calculateOppScore(candles[99], candles);
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.vol_zscore).toBeGreaterThan(VOLZ_P80);
  });

  it('deve extrair características de microestrutura (spread, imbalance, volume) na janela de 10s', () => {
    const now = Date.now();
    const ticks = [
      { time: now - 5000, price: 60000, qty: 1.5, isBuyerMaker: false }, // aggressive buy
      { time: now - 3000, price: 60010, qty: 2.0, isBuyerMaker: false }, // aggressive buy
      { time: now - 1000, price: 60005, qty: 0.5, isBuyerMaker: true }   // aggressive sell
    ];
    const depths = [
      { time: now - 500, bidPrice: 60000, askPrice: 60005, bidQty: 10, askQty: 5 }
    ];

    const micro = extractMicrostructureFeatures(ticks, depths, now);
    expect(micro.tradesCount).toBe(3);
    expect(micro.buyVol).toBe(3.5);
    expect(micro.sellVol).toBe(0.5);
    expect(micro.imbalance).toBeGreaterThan(0.7); // Strong buy imbalance
    expect(micro.spread).toBeCloseTo(5 / 60000, 5);
  });
});
