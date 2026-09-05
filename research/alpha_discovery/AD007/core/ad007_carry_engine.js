/**
 * ALPHA FACTORY — AD007 REGIME-CONDITIONAL & ROTATIONAL CARRY ENGINE
 * Module: ad007_carry_engine.js
 * 
 * Formal Mechanics:
 * - Exact delta-neutrality: Delta = +1 (Spot) - 1 (Perp) = 0. Price PnL = 0.
 * - Hurdle Gating: Deselects capital to 100% cash (yield=0, risk=0) when projected funding drops below hurdle.
 * - Dynamic Cross-Asset Selection: Allocates across Top-K yielders or Inverse-Volatility weighted baskets.
 * - Realistic Turnover Friction: 24 bps roundtrip per full entry/exit cycle (12 bps per leg).
 * - Tracks equity curve, annualized Sharpe, max drawdown, time in market, and 14-day calendar block returns.
 */

export class AD007CarryEngine {
  /**
   * Simulates a regime-conditional carry cell over the funding panel.
   * 
   * @param {Object} panel - Map of symbol -> array of funding records
   * @param {Array<string>} symbols - List of symbols in universe
   * @param {Object} cell - Cell configuration from spec
   * @param {Object} friction - Friction configuration (totalRoundtripBpsPerCycle: 24)
   */
  static simulate(panel, symbols, cell, friction) {
    const totalPeriods = panel[symbols[0]].length;
    const roundtripCost = friction.totalRoundtripBpsPerCycle / 10000; // 0.0024 (24 bps)
    const halfTurnoverCost = roundtripCost / 2; // 0.0012 per one-way turn

    let currentWeights = {};
    for (const s of symbols) currentWeights[s] = 0;

    const periodNetReturns = new Float64Array(totalPeriods);
    const cumulativeEquity = new Float64Array(totalPeriods);
    let equity = 1.0;
    cumulativeEquity[0] = 1.0;

    // Track 14-day blocks (42 8-hour periods = 14 days)
    const blockReturns = [];
    let currentBlockNet = 0;
    let blockPeriodCount = 0;
    let blockStartTime = panel[symbols[0]][0].fundingTime;

    const rebalancePeriods = cell.rebalanceDays > 0 ? cell.rebalanceDays * 3 : 0;
    const lookbackPeriods = cell.lookbackDays > 0 ? cell.lookbackDays * 3 : 0;
    const hurdle8h = (cell.hurdleAnnualPct / 100) / (3 * 365); // Annualized hurdle converted to 8h

    let activeExposureCount = 0;

    for (let t = 0; t < totalPeriods; t++) {
      let targetWeights = { ...currentWeights };

      if (cell.type === 'STATIC_BENCHMARK') {
        if (t === 0) {
          if (cell.allocation === 'ALL_6_EQUAL_WEIGHT') {
            for (const s of symbols) targetWeights[s] = 1.0 / symbols.length;
          } else if (cell.allocation === 'BTC_ETH_50_50') {
            targetWeights['BTCUSDT'] = 0.5;
            targetWeights['ETHUSDT'] = 0.5;
          }
        }
      } else if (cell.type === 'HURDLE_GATED') {
        if (t >= lookbackPeriods && (rebalancePeriods === 0 || t % rebalancePeriods === 0)) {
          let assetA = 'BTCUSDT';
          let assetB = 'ETHUSDT';
          if (cell.allocation === 'SOL_BTC_50_50') {
            assetA = 'SOLUSDT';
            assetB = 'BTCUSDT';
          }

          let sumFR = 0;
          for (let k = 1; k <= lookbackPeriods; k++) {
            sumFR += (panel[assetA][t - k].fundingRate + panel[assetB][t - k].fundingRate) / 2;
          }
          const meanFR = sumFR / lookbackPeriods;

          for (const s of symbols) targetWeights[s] = 0;

          if (meanFR >= hurdle8h) {
            targetWeights[assetA] = 0.5;
            targetWeights[assetB] = 0.5;
          }
        }
      } else if (cell.type === 'DYNAMIC_ROTATION_HURDLE') {
        if (t >= lookbackPeriods && (t % rebalancePeriods === 0)) {
          // Rank all assets by rolling funding rate
          const yieldRanking = [];
          for (const s of symbols) {
            let sumFR = 0;
            for (let k = 1; k <= lookbackPeriods; k++) {
              sumFR += panel[s][t - k].fundingRate;
            }
            yieldRanking.push({ symbol: s, avgFR: sumFR / lookbackPeriods });
          }
          yieldRanking.sort((a, b) => b.avgFR - a.avgFR);

          for (const s of symbols) targetWeights[s] = 0;

          const topK = cell.allocation === 'TOP_2_YIELDERS' ? 2 : 3;
          const slotWeight = 1.0 / topK;

          for (let i = 0; i < topK; i++) {
            const cand = yieldRanking[i];
            if (cand.avgFR >= hurdle8h) {
              targetWeights[cand.symbol] = slotWeight;
            }
          }
        }
      } else if (cell.type === 'VOL_INVERSE_WEIGHT') {
        if (t >= lookbackPeriods && (t % rebalancePeriods === 0)) {
          const stats = [];
          let rawWeightSum = 0;

          for (const s of symbols) {
            let sumFR = 0;
            for (let k = 1; k <= lookbackPeriods; k++) {
              sumFR += panel[s][t - k].fundingRate;
            }
            const meanFR = sumFR / lookbackPeriods;

            let sumSq = 0;
            for (let k = 1; k <= lookbackPeriods; k++) {
              sumSq += Math.pow(panel[s][t - k].fundingRate - meanFR, 2);
            }
            const stdFR = Math.sqrt(sumSq / lookbackPeriods);

            let rawWeight = 0;
            if (meanFR >= hurdle8h) {
              rawWeight = 1.0 / (stdFR > 0.00001 ? stdFR : 0.00001);
              rawWeightSum += rawWeight;
            }
            stats.push({ symbol: s, rawWeight });
          }

          for (const s of symbols) targetWeights[s] = 0;

          if (rawWeightSum > 0) {
            for (const item of stats) {
              targetWeights[item.symbol] = item.rawWeight / rawWeightSum;
            }
          }
        }
      }

      // Compute turnover cost
      let turnoverCost = 0;
      let currentTotalExposure = 0;
      for (const s of symbols) {
        const deltaW = Math.abs(targetWeights[s] - currentWeights[s]);
        turnoverCost += deltaW * halfTurnoverCost;
        currentWeights[s] = targetWeights[s];
        currentTotalExposure += currentWeights[s];
      }

      if (currentTotalExposure > 0.01) {
        activeExposureCount++;
      }

      // Compute period gross yield from funding received
      let grossYield = 0;
      for (const s of symbols) {
        grossYield += currentWeights[s] * panel[s][t].fundingRate;
      }

      const netYield = grossYield - turnoverCost;
      periodNetReturns[t] = netYield;
      equity *= (1.0 + netYield);
      cumulativeEquity[t] = equity;

      // Accumulate into 14-day blocks
      currentBlockNet += netYield;
      blockPeriodCount++;

      if (blockPeriodCount === 42 || t === totalPeriods - 1) {
        blockReturns.push({
          entryTime: blockStartTime,
          exitTime: panel[symbols[0]][t].fundingTime,
          netPct: currentBlockNet,
          netR: currentBlockNet / 0.01 // 1R = 100 bps net yield
        });
        currentBlockNet = 0;
        blockPeriodCount = 0;
        if (t + 1 < totalPeriods) {
          blockStartTime = panel[symbols[0]][t + 1].fundingTime;
        }
      }
    }

    // Compute Summary Performance Metrics
    const totalNetReturnPct = (equity - 1.0) * 100;
    const annualizedReturnPct = (Math.pow(equity, (365 * 3) / totalPeriods) - 1.0) * 100;
    const timeInMarketPct = (activeExposureCount / totalPeriods) * 100;

    // Maximum Drawdown
    let peak = 1.0;
    let maxDrawdownPct = 0;
    for (let t = 0; t < totalPeriods; t++) {
      if (cumulativeEquity[t] > peak) peak = cumulativeEquity[t];
      const dd = (peak - cumulativeEquity[t]) / peak;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }

    // Sharpe Ratio (assuming 0 risk-free rate, 3 periods per day = 1095 periods/year)
    let sumR = 0;
    for (let t = 0; t < totalPeriods; t++) sumR += periodNetReturns[t];
    const meanR = sumR / totalPeriods;
    let sumSq = 0;
    for (let t = 0; t < totalPeriods; t++) sumSq += Math.pow(periodNetReturns[t] - meanR, 2);
    const stdR = Math.sqrt(sumSq / totalPeriods);
    const annualizedSharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(1095) : 0;

    return {
      totalNetReturnPct,
      annualizedReturnPct,
      maxDrawdownPct: maxDrawdownPct * 100,
      annualizedSharpe,
      timeInMarketPct,
      blockReturns,
      finalEquity: equity
    };
  }
}
