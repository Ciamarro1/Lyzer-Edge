/**
 * 🏛️ ALPHA FACTORY — AD009: BASIS TERM STRUCTURE & CALENDAR FUTURES ARBITRAGE ENGINE
 * File: research/alpha_discovery/AD009/core/ad009_basis_arbitrage_engine.js
 * 
 * Implements:
 * 1. Coin-Margined (Inverse) Delivery Futures Basis Arbitrage (Delta=0).
 * 2. Zero fiat borrow drag modeling (r_borrow = 0.0% a.a. in COIN-M).
 * 3. Exact contractual convergence (F_T -> S_T) across quarterly expiries.
 * 4. Realistic friction modeling (24 bps roundtrip + 10 bps quarterly rollover).
 * 5. Partitioning into 14-day calendar blocks for block bootstrap validation.
 */

export class AD009BasisArbitrageEngine {
  constructor(spec) {
    this.spec = spec;
    this.friction = spec.friction || {
      spotFeeBps: 5,
      futureFeeBps: 5,
      slippageBps: 2,
      rollOverFeeBps: 10,
      totalRoundtripBpsPerCycle: 24
    };
  }

  /**
   * Identifies rollover jump points where the quarterly contract changes.
   * A rollover is identified when the basisRate jumps upward significantly 
   * (the expiring contract had converged near zero, and the new contract starts with full premium).
   */
  static identifyRollDates(series) {
    const rollIndices = new Set();
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      // In quarterly futures, delivery happens at quarter-end and basisRate jumps up by > 0.4% (40 bps)
      const basisJump = curr.basisRate - prev.basisRate;
      if (basisJump > 0.004 && prev.basisRate < 0.003) {
        rollIndices.add(i);
      }
    }
    return rollIndices;
  }

  /**
   * Simulates a single cell from the campaign spec.
   * @param {Object} cellSpec 
   * @param {Object} dataPanel { BTCUSD_CURRENT_QUARTER, BTCUSD_NEXT_QUARTER, ETHUSD_CURRENT_QUARTER, ETHUSD_NEXT_QUARTER }
   */
  simulateCell(cellSpec, dataPanel) {
    const leverage = cellSpec.leverage || 1.0;
    const borrowRateAnnual = (cellSpec.borrowRateAnnualPct || 0.0) / 100.0;
    const dailyBorrowDrag = (leverage > 1.0 ? (leverage - 1.0) * borrowRateAnnual / 365.0 : 0.0);

    const entryFee = (this.friction.spotFeeBps + this.friction.futureFeeBps + 2 * this.friction.slippageBps) / 10000.0; // 14 bps
    const exitFee = (this.friction.spotFeeBps + this.friction.futureFeeBps) / 10000.0; // 10 bps
    const rollFee = (this.friction.rollOverFeeBps || 10) / 10000.0; // 10 bps per quarterly roll

    // Determine target series
    let seriesList = [];
    let weights = [];

    if (cellSpec.pair === 'BTCUSD') {
      const key = `BTCUSD_${cellSpec.contractType}`;
      seriesList = [dataPanel[key]];
      weights = [1.0];
    } else if (cellSpec.pair === 'ETHUSD') {
      const key = `ETHUSD_${cellSpec.contractType}`;
      seriesList = [dataPanel[key]];
      weights = [1.0];
    } else if (cellSpec.pair === 'DUAL_BTC_ETH') {
      const btcKey = `BTCUSD_${cellSpec.contractType}`;
      const ethKey = `ETHUSD_${cellSpec.contractType}`;
      seriesList = [dataPanel[btcKey], dataPanel[ethKey]];
      weights = [0.5, 0.5];
    } else if (cellSpec.pair === 'DYNAMIC') {
      // Dynamic allocation across available series
      seriesList = [
        dataPanel['BTCUSD_CURRENT_QUARTER'],
        dataPanel['BTCUSD_NEXT_QUARTER'],
        dataPanel['ETHUSD_CURRENT_QUARTER'],
        dataPanel['ETHUSD_NEXT_QUARTER']
      ];
      weights = [0.25, 0.25, 0.25, 0.25];
    }

    const nDays = seriesList[0].length;
    const timestamps = seriesList[0].map(x => x.timestamp);

    // Precompute roll indices for each series
    const rollSets = seriesList.map(s => AD009BasisArbitrageEngine.identifyRollDates(s));

    let equity = 1.0;
    equity -= entryFee * leverage; // Deduct initial entry friction

    const dailyReturns = [];
    const equityCurve = [equity];

    for (let t = 1; t < nDays; t++) {
      let dailyGrossYield = 0.0;
      let dailyRollCost = 0.0;

      if (cellSpec.pair === 'DYNAMIC') {
        // Pick the single series with highest annualizedBasisRate at t-1
        let bestIdx = 0;
        let maxAnnRate = -Infinity;
        for (let k = 0; k < seriesList.length; k++) {
          const rate = seriesList[k][t - 1].annualizedBasisRate;
          if (rate > maxAnnRate) {
            maxAnnRate = rate;
            bestIdx = k;
          }
        }
        const s = seriesList[bestIdx];
        const isRoll = rollSets[bestIdx].has(t);
        if (isRoll) {
          dailyRollCost = rollFee;
          // On roll day, the final basis of the expiring contract decayed to zero
          dailyGrossYield = Math.max(0.0, s[t - 1].basisRate);
        } else {
          // Normal day: basis decay from t-1 to t
          const prevBasisRate = s[t - 1].basisRate;
          const currBasisRate = s[t].basisRate;
          // Decay is prevBasis - currBasis. In addition, when basis expands, PnL oscillates, but converges at maturity
          const decay = prevBasisRate - currBasisRate;
          dailyGrossYield = decay;
        }
      } else {
        // Static or Dual Weighted portfolio
        for (let k = 0; k < seriesList.length; k++) {
          const s = seriesList[k];
          const w = weights[k];
          const isRoll = rollSets[k].has(t);

          let componentYield = 0.0;
          if (isRoll) {
            dailyRollCost += w * rollFee;
            componentYield = Math.max(0.0, s[t - 1].basisRate);
          } else {
            const prevBasis = s[t - 1].basis;
            const currBasis = s[t].basis;
            const spotPrice = s[t - 1].indexPrice;
            // Exact dollar decay per unit of spot held
            const decay = (prevBasis - currBasis) / spotPrice;
            componentYield = decay;
          }
          dailyGrossYield += w * componentYield;
        }
      }

      // Net daily return with leverage and borrow cost
      const netDailyReturn = (leverage * dailyGrossYield) - dailyBorrowDrag - (leverage * dailyRollCost);
      equity *= (1.0 + netDailyReturn);
      dailyReturns.push(netDailyReturn);
      equityCurve.push(equity);
    }

    // Deduct terminal exit fee
    equity -= exitFee * leverage;
    equityCurve[equityCurve.length - 1] = equity;

    // Metrics computation
    const totalNetReturnPct = (equity - 1.0) * 100.0;
    const years = (nDays - 1) / 365.25;
    const annualizedNetReturnPct = (Math.pow(equity, 1.0 / years) - 1.0) * 100.0;

    // Daily return statistics
    const meanDaily = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const varDaily = dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanDaily, 2), 0) / (dailyReturns.length - 1);
    const stdDaily = Math.sqrt(Math.max(1e-12, varDaily));
    const sharpe = (meanDaily / stdDaily) * Math.sqrt(365);

    // Max Drawdown
    let peak = equityCurve[0];
    let maxDd = 0.0;
    for (const eq of equityCurve) {
      if (eq > peak) peak = eq;
      const dd = (peak - eq) / peak;
      if (dd > maxDd) maxDd = dd;
    }
    const maxDrawdownPct = maxDd * 100.0;

    // 14-Day Calendar Block Partitioning
    const blockSize = 14;
    const blockReturns = [];
    for (let i = 0; i < dailyReturns.length; i += blockSize) {
      const slice = dailyReturns.slice(i, i + blockSize);
      if (slice.length >= 7) { // Require at least half a block
        const blockComp = slice.reduce((acc, r) => acc * (1.0 + r), 1.0) - 1.0;
        blockReturns.push({
          entryTime: timestamps[i],
          exitTime: timestamps[Math.min(i + blockSize - 1, timestamps.length - 1)],
          netPct: blockComp,
          netR: blockComp / 0.01
        });
      }
    }

    // Residual correlation with BTC spot
    const btcSpotReturns = [];
    const btcData = dataPanel['BTCUSD_CURRENT_QUARTER'];
    for (let t = 1; t < btcData.length; t++) {
      btcSpotReturns.push((btcData[t].indexPrice - btcData[t - 1].indexPrice) / btcData[t - 1].indexPrice);
    }

    const nCorr = Math.min(dailyReturns.length, btcSpotReturns.length);
    let meanBtc = 0.0;
    for (let i = 0; i < nCorr; i++) meanBtc += btcSpotReturns[i];
    meanBtc /= nCorr;

    let num = 0.0, denomA = 0.0, denomB = 0.0;
    for (let i = 0; i < nCorr; i++) {
      const diffS = dailyReturns[i] - meanDaily;
      const diffB = btcSpotReturns[i] - meanBtc;
      num += diffS * diffB;
      denomA += diffS * diffS;
      denomB += diffB * diffB;
    }
    const rho = denomA > 0 && denomB > 0 ? num / Math.sqrt(denomA * denomB) : 0.0;

    return {
      cellId: cellSpec.id,
      description: cellSpec.description,
      leverage,
      borrowRateAnnualPct: cellSpec.borrowRateAnnualPct || 0.0,
      nDays,
      totalNetReturnPct,
      annualizedNetReturnPct,
      sharpe,
      maxDrawdownPct,
      deltaResidualCorrelation: rho,
      blockReturns,
      nBlocks: blockReturns.length,
      finalEquity: equity
    };
  }
}
