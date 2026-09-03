/**
 * ALPHA FACTORY — AD006 DELTA-NEUTRAL CARRY ENGINE
 * Module: ad006_carry_engine.js
 * 
 * Formal Mechanics:
 * - Exact delta-neutrality: Delta = +1 (Spot) - 1 (Perp) = 0. Price PnL = 0.
 * - Cash flow harvest: Short perp earns +FR_t when FR > 0, pays when FR < 0.
 * - Realistic turnover friction: 24 bps roundtrip per full entry/exit cycle (12 bps per leg).
 * - Tracks equity curve, annualized Sharpe, max drawdown, and 14-day calendar block returns.
 */

export class AD006CarryEngine {
  /**
   * Simulates a delta-neutral carry cell over the funding panel.
   * 
   * @param {Object} panel - Map of symbol -> array of funding records
   * @param {Array<string>} symbols - List of symbols in universe
   * @param {Object} cell - Cell configuration from spec
   * @param {Object} friction - Friction configuration (totalRoundtripBpsPerCycle: 24)
   */
  static simulate(panel, symbols, cell, friction) {
    const totalPeriods = panel[symbols[0]].length;
    const roundtripCost = friction.totalRoundtripBpsPerCycle / 10000; // 0.0024
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

    for (let t = 0; t < totalPeriods; t++) {
      // Check if rebalance is required at period t
      let targetWeights = { ...currentWeights };

      if (cell.type === 'STATIC_BENCHMARK') {
        if (t === 0) {
          if (cell.allocation === 'BTC_ETH_50_50') {
            targetWeights['BTCUSDT'] = 0.5;
            targetWeights['ETHUSDT'] = 0.5;
          } else if (cell.allocation === 'ALL_6_EQUAL_WEIGHT') {
            for (const s of symbols) targetWeights[s] = 1.0 / symbols.length;
          }
        }
      } else if (cell.type === 'HURDLE_GATED') {
        if (t >= lookbackPeriods && (rebalancePeriods === 0 || t % rebalancePeriods === 0)) {
          // Compute rolling funding for BTC and ETH
          let sumFR = 0;
          for (let k = 1; k <= lookbackPeriods; k++) {
            sumFR += (panel['BTCUSDT'][t - k].fundingRate + panel['ETHUSDT'][t - k].fundingRate) / 2;
          }
          const meanFR = sumFR / lookbackPeriods;
          const hurdle8h = (cell.hurdleBps / 10000) / (3 * 365); // annual bps to 8h

          if (meanFR > hurdle8h) {
            targetWeights['BTCUSDT'] = 0.5;
            targetWeights['ETHUSDT'] = 0.5;
          } else {
            targetWeights['BTCUSDT'] = 0.0;
            targetWeights['ETHUSDT'] = 0.0;
          }
        }
      } else if (cell.type === 'DYNAMIC_ROTATION') {
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

          if (cell.allocation === 'TOP_2_YIELDERS') {
            targetWeights[yieldRanking[0].symbol] = 0.5;
            targetWeights[yieldRanking[1].symbol] = 0.5;
          } else if (cell.allocation === 'TOP_1_YIELDER') {
            targetWeights[yieldRanking[0].symbol] = 1.0;
          }
        }
      }

      // Compute turnover cost
      let turnoverCost = 0;
      for (const s of symbols) {
        const deltaW = Math.abs(targetWeights[s] - currentWeights[s]);
        turnoverCost += deltaW * halfTurnoverCost;
        currentWeights[s] = targetWeights[s];
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
      blockReturns,
      finalEquity: equity
    };
  }
}
