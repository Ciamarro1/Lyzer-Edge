/**
 * ALPHA FACTORY — AD008 LEVERAGED PORTFOLIO MARGIN CARRY ENGINE
 * Module: ad008_leveraged_carry_engine.js
 * 
 * Formal Institutional Mechanics:
 * - Exact Delta-Neutral Cash-and-Carry: Long Spot + Short Perpetual.
 * - Portfolio Margin Gearing: L in [1.0x, 1.5x, 2.0x, 2.5x].
 * - Margin Borrowing Drag: (L - 1) * r_borrow(8h) deducted continuously when exposed.
 * - Exact Turnover Friction: Scaled by L * 24 bps roundtrip amortized.
 * - Tracks 14-Day Calendar Blocks, Annualized Sharpe, Margin Health Ratio, and Max Drawdown.
 */

export class AD008LeveragedCarryEngine {
  /**
   * Simulates a leveraged portfolio margin carry cell.
   * 
   * @param {Object} panel - Map of symbol -> array of funding records { fundingTime, fundingRate }
   * @param {Array<string>} symbols - List of symbols in universe
   * @param {Object} cell - Cell configuration
   * @param {Object} friction - Friction configuration
   * @param {Object} pmRules - Portfolio margin rules
   */
  static simulate(panel, symbols, cell, friction, pmRules = {}) {
    const totalPeriods = panel[symbols[0]].length;
    const roundtripCost = friction.totalRoundtripBpsPerCycle / 10000; // 0.0024 (24 bps)
    const halfTurnoverCost = roundtripCost / 2; // 0.0012 per one-way turn

    const L = cell.leverage || 1.0;
    const borrowRateAnnualPct = cell.borrowRateAnnualPct || 0.0;
    const borrowRate8h = (borrowRateAnnualPct / 100) / (3 * 365); // 8-hour borrow drag
    const borrowDrag = (L > 1.0) ? (L - 1.0) * borrowRate8h : 0.0;

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
    const hurdle8h = ((cell.hurdleAnnualPct || 0.0) / 100) / (3 * 365);

    let activeExposureCount = 0;
    const mmrRate = pmRules.maintenanceMarginRequirement || 0.05; // 5% MMR
    const marginHealthRatio = Number((1.0 / (mmrRate * L)).toFixed(2));

    for (let t = 0; t < totalPeriods; t++) {
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

          const topK = 3;
          const slotWeight = 1.0 / topK;

          for (let i = 0; i < topK; i++) {
            const cand = yieldRanking[i];
            if (cand.avgFR >= hurdle8h) {
              targetWeights[cand.symbol] = slotWeight;
            }
          }
        }
      }

      // Compute turnover cost
      let turnoverCost = 0;
      let currentTotalExposure = 0;
      for (const s of symbols) {
        const deltaW = Math.abs(targetWeights[s] - currentWeights[s]);
        turnoverCost += deltaW * halfTurnoverCost * L; // Scaled by leverage
        currentWeights[s] = targetWeights[s];
        currentTotalExposure += currentWeights[s];
      }

      if (currentTotalExposure > 0.01) {
        activeExposureCount++;
      }

      // Compute gross yield from funding received
      let grossYield = 0;
      for (const s of symbols) {
        if (currentWeights[s] > 0) {
          grossYield += currentWeights[s] * panel[s][t].fundingRate * L;
        }
      }

      // Net period return after borrow drag and turnover
      const periodBorrowCost = (currentTotalExposure > 0.01) ? borrowDrag : 0.0;
      const netYield = grossYield - periodBorrowCost - turnoverCost;

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

    // Performance Metrics
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

    // Sharpe Ratio
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
      minMarginHealthRatio: marginHealthRatio,
      blockReturns,
      finalEquity: equity
    };
  }
}
