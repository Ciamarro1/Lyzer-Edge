/**
 * ALPHA FACTORY — STANDARDIZED FAST EXECUTION SIMULATOR
 * Module: fast_simulator.js
 * 
 * Frozen Constitutional Execution Rules:
 * 1. Signal strictly evaluated on bar t close (C_t).
 * 2. Entry at bar t close (P_entry = C_t).
 * 3. Exit monitoring starts strictly at bar t+1.
 * 4. Worst-case intrabar collision: Stop Loss executes first (-1.0R).
 * 5. Gap open: slippage on price, exchange fee on notional. Zero double-counting.
 * 6. Feasibility floor: R_raw < 80 bps -> SKIP trade before entry.
 * 7. Single concurrent position per asset.
 * 8. All-in friction: 12 bps (10 bps fee + 2 bps slippage).
 */

export class FastSimulator {
  /**
   * Precomputes technical indicator arrays (Float64Array) for high-speed simulation.
   */
  static precomputeIndicators(candles) {
    const n = candles.length;
    const tr = new Float64Array(n);
    const atr12 = new Float64Array(n);
    const atr24 = new Float64Array(n);
    const atr72 = new Float64Array(n);
    const vol24SMA = new Float64Array(n);

    if (n === 0) return { tr, atr12, atr24, atr72, vol24SMA };

    tr[0] = candles[0].high - candles[0].low;
    for (let i = 1; i < n; i++) {
      const h = candles[i].high;
      const l = candles[i].low;
      const cPrev = candles[i - 1].close;
      tr[i] = Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev));
    }

    function computeWilderATR(period, targetArr) {
      if (n < period) return;
      let sum = 0;
      for (let i = 0; i < period; i++) sum += tr[i];
      targetArr[period - 1] = sum / period;
      for (let i = period; i < n; i++) {
        targetArr[i] = ((period - 1) * targetArr[i - 1] + tr[i]) / period;
      }
    }

    computeWilderATR(12, atr12);
    computeWilderATR(24, atr24);
    computeWilderATR(72, atr72);

    // 24-period Volume SMA: strictly over [t-24, t-1], NEVER including bar t
    if (n >= 25) {
      let volSum = 0;
      for (let i = 0; i < 24; i++) volSum += candles[i].volume;
      vol24SMA[24] = volSum / 24;
      for (let i = 25; i < n; i++) {
        volSum += candles[i - 1].volume - candles[i - 25].volume;
        vol24SMA[i] = volSum / 24;
      }
    }

    return { tr, atr12, atr24, atr72, vol24SMA };
  }

  /**
   * Precomputes rolling high/low extremes over past K bars, strictly excluding bar t.
   */
  static computeRollingExtremes(candles, K) {
    const n = candles.length;
    const highs = new Float64Array(n);
    const lows = new Float64Array(n);

    for (let i = K; i < n; i++) {
      let mx = -Infinity;
      let mn = Infinity;
      for (let k = 1; k <= K; k++) {
        const h = candles[i - k].high;
        const l = candles[i - k].low;
        if (h > mx) mx = h;
        if (l < mn) mn = l;
      }
      highs[i] = mx;
      lows[i] = mn;
    }
    return { highs, lows };
  }

  /**
   * Simulates trade execution for an asset under standardized contract rules.
   */
  static simulateAsset(candles, ind, extremes, signalFn, config, symbol) {
    const n = candles.length;
    const timeoutLimit = config.timeoutBars || 72;
    const exchangeFeeRate = config.feeRate !== undefined ? config.feeRate : 0.0010; // 10 bps
    const slippageBaseRate = config.slippageRate !== undefined ? config.slippageRate : 0.0002; // 2 bps
    const totalCostNormalRate = exchangeFeeRate + slippageBaseRate; // 12 bps all-in
    const floorRate = config.floorRate !== undefined ? config.floorRate : 0.0080; // 80 bps

    const trades = [];
    let infeasibleCount = 0;
    let inPosition = false;
    let activeTrade = null;

    const warmup = Math.max(72, (config.lookbackK || 40) + 1);

    for (let t = warmup; t < n; t++) {
      if (inPosition) {
        const cBar = candles[t];
        const O = cBar.open;
        const H = cBar.high;
        const L = cBar.low;
        const C = cBar.close;

        activeTrade.holdingBars++;
        let exited = false;
        let netR = 0;
        let exitType = '';
        let exitPrice = 0;

        if (activeTrade.side === 1) { // LONG
          const SL = activeTrade.sl;
          const TP = activeTrade.tp;

          if (O <= SL) {
            exitPrice = O - slippageBaseRate * O;
            const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
            const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
            netR = grossR - feeR;
            exitType = 'GAP_SL';
            exited = true;
          } else if (O >= TP) {
            exitPrice = O - slippageBaseRate * O;
            const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
            const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
            netR = grossR - feeR;
            exitType = 'GAP_TP';
            exited = true;
          } else {
            const touchesSL = L <= SL;
            const touchesTP = H >= TP;

            if (touchesSL && touchesTP) {
              netR = -1.0 - activeTrade.costRNormal;
              exitPrice = SL;
              exitType = 'SL_COLLISION';
              exited = true;
            } else if (touchesSL) {
              netR = -1.0 - activeTrade.costRNormal;
              exitPrice = SL;
              exitType = 'SL';
              exited = true;
            } else if (touchesTP) {
              netR = (config.rrMultiplier || 5.0) - activeTrade.costRNormal;
              exitPrice = TP;
              exitType = 'TP';
              exited = true;
            }
          }

          if (!exited && activeTrade.holdingBars >= timeoutLimit) {
            exitPrice = C - slippageBaseRate * C;
            const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
            const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
            netR = grossR - feeR;
            exitType = 'TIMEOUT';
            exited = true;
          }

        } else { // SHORT
          const SL = activeTrade.sl;
          const TP = activeTrade.tp;

          if (O >= SL) {
            exitPrice = O + slippageBaseRate * O;
            const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
            const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
            netR = grossR - feeR;
            exitType = 'GAP_SL';
            exited = true;
          } else if (O <= TP) {
            exitPrice = O + slippageBaseRate * O;
            const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
            const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
            netR = grossR - feeR;
            exitType = 'GAP_TP';
            exited = true;
          } else {
            const touchesSL = H >= SL;
            const touchesTP = L <= TP;

            if (touchesSL && touchesTP) {
              netR = -1.0 - activeTrade.costRNormal;
              exitPrice = SL;
              exitType = 'SL_COLLISION';
              exited = true;
            } else if (touchesSL) {
              netR = -1.0 - activeTrade.costRNormal;
              exitPrice = SL;
              exitType = 'SL';
              exited = true;
            } else if (touchesTP) {
              netR = (config.rrMultiplier || 5.0) - activeTrade.costRNormal;
              exitPrice = TP;
              exitType = 'TP';
              exited = true;
            }
          }

          if (!exited && activeTrade.holdingBars >= timeoutLimit) {
            exitPrice = C + slippageBaseRate * C;
            const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
            const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
            netR = grossR - feeR;
            exitType = 'TIMEOUT';
            exited = true;
          }
        }

        if (exited) {
          trades.push({
            symbol,
            entryTime: activeTrade.entryTime,
            exitTime: candles[t].timestamp,
            side: activeTrade.side,
            holdingBars: activeTrade.holdingBars,
            exitType,
            entryPrice: activeTrade.entryPrice,
            exitPrice,
            riskR: activeTrade.riskR,
            netR
          });
          inPosition = false;
          activeTrade = null;
        }
      }

      // Signal Evaluation strictly at bar t Close (monitoring starts at t+1)
      if (!inPosition && t + 1 < n) {
        const signalResult = signalFn(candles, ind, extremes, t, config);
        if (signalResult && signalResult.side !== 0) {
          const cNow = candles[t].close;
          const rRaw = signalResult.rRaw || (1.5 * ind.atr24[t]);
          const floor = floorRate * cNow;

          // Feasibility Floor Filter
          if (rRaw < floor) {
            infeasibleCount++;
          } else {
            const riskR = rRaw;
            const costRNormal = (totalCostNormalRate * cNow) / riskR;
            const rr = config.rrMultiplier || 5.0;

            let sl = 0, tp = 0;
            if (signalResult.side === 1) {
              sl = cNow - riskR;
              tp = cNow + rr * riskR;
            } else {
              sl = cNow + riskR;
              tp = cNow - rr * riskR;
            }

            inPosition = true;
            activeTrade = {
              side: signalResult.side,
              entryPrice: cNow,
              entryTime: candles[t].timestamp,
              riskR,
              costRNormal,
              sl,
              tp,
              holdingBars: 0
            };
          }
        }
      }
    }

    return { trades, infeasibleCount };
  }
}
