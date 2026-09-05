/**
 * ALPHA FACTORY — AD010 BARBELL SYNERGY PORTFOLIO ENGINE
 * Module: ad010_barbell_synergy_engine.js
 * 
 * Formal Quantitative Mechanics:
 * - Structural Carry Anchor: Delta-neutral cash-and-carry base (Spot + Short Perpetual).
 * - Convex Directional Overlay: Event-driven Wyckoff Spring 1H Long-Only under negative funding.
 * - Dynamic Free Margin Integration: 80% capital anchor + 20% risk-controlled directional sleeve.
 * - Exact Trade Execution Math: 1.0 ATR Stop-Loss, 2.5 ATR Take-Profit, 6h max holding horizon, 24 bps roundtrip friction.
 * - Continuous Compounding & 14-Day Calendar Block Bootstrap Tracking.
 */

import { WyckoffVolumeProfileEngine } from '../../../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

export class AD010BarbellSynergyEngine {
  /**
   * Generates discrete directional trades from hourly candles and PIT funding rates.
   * 
   * @param {Array<Object>} candles - Hourly candles { openTime, open, high, low, close, volume }
   * @param {Array<Object>} fundingRates - PIT funding records { fundingTime, fundingRate }
   * @param {Object} dirParams - Directional parameters from spec
   * @param {Object} portfolioRules - SL/TP/horizon rules
   * @param {Object} friction - Friction rules
   * @returns {Array<Object>} Closed directional trades
   */
  static generateDirectionalTrades(candles, fundingRates, dirParams, portfolioRules, friction) {
    const v5Engine = new WyckoffVolumeProfileEngine({
      lookback: dirParams.lookback || 30,
      volumeZScore: dirParams.volumeZScoreThreshold || 1.50,
      minPierceATR: 0.50,
      pocProximity: 0.003,
      requireVolume: true,
      requirePierce: dirParams.requirePierce !== false,
      requirePOC: false,
      requireReversal: dirParams.requireReversal !== false
    });

    function getPitFunding(openTime) {
      let low = 0, high = fundingRates.length - 1, best = -1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (fundingRates[mid].fundingTime <= openTime) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return best >= 0 ? fundingRates[best].fundingRate : 0.0001;
    }

    const roundtripFriction = (friction.directionalRoundtripBps || 24) / 10000;
    const maxHoldingHours = portfolioRules.directionalMaxHoldingHours || 6;
    const slMult = portfolioRules.directionalStopAtrMultiplier || 1.0;
    const tpMult = portfolioRules.directionalTakeProfitAtrMultiplier || 2.5;

    const trades = [];
    const buffer = [];
    let activeTradeExitIndex = -1;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      buffer.push(c);
      if (buffer.length > 300) buffer.shift();

      if (i < 60) continue;

      // Prevent overlapping concurrent directional trades in the single-asset engine
      if (i <= activeTradeExitIndex) continue;

      const fr = getPitFunding(c.openTime);
      const isNegFunding = fr < 0;
      if (dirParams.requireNegativeFunding && !isNegFunding) continue;

      const v5Res = v5Engine.reconstruct({ slow: buffer });
      if (v5Res.signal === 'LONG') {
        const entryPrice = c.close;
        const entryTime = c.openTime;

        // Calculate ATR from last 30 bars
        const recentCandles = buffer.slice(-30);
        const ranges = recentCandles.map(b => b.high - b.low);
        const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length;

        const stopLoss = entryPrice - slMult * atr;
        const takeProfit = entryPrice + tpMult * atr;

        let exitPrice = null;
        let exitReason = 'TIME_EXIT';
        let exitIdx = Math.min(i + maxHoldingHours, candles.length - 1);

        for (let k = 1; k <= maxHoldingHours && (i + k) < candles.length; k++) {
          const futureCandle = candles[i + k];
          if (futureCandle.low <= stopLoss) {
            exitPrice = stopLoss;
            exitReason = 'STOP_LOSS';
            exitIdx = i + k;
            break;
          }
          if (futureCandle.high >= takeProfit) {
            exitPrice = takeProfit;
            exitReason = 'TAKE_PROFIT';
            exitIdx = i + k;
            break;
          }
        }

        if (exitPrice === null) {
          exitPrice = candles[exitIdx].close;
        }

        const rawReturn = (exitPrice - entryPrice) / entryPrice;
        const netReturn = rawReturn - roundtripFriction;
        const exitTime = candles[exitIdx].openTime;

        trades.push({
          entryTime,
          exitTime,
          entryPrice,
          exitPrice,
          rawReturn,
          netReturn,
          exitReason,
          atr,
          fundingRateAtEntry: fr
        });

        activeTradeExitIndex = exitIdx;
      }
    }

    return trades;
  }

  /**
   * Simulates the 8h carry base returns across all periods.
   * 
   * @param {Object} fundingPanel - Map of symbol -> array of funding records
   * @param {Array<string>} symbols - Target universe symbols
   * @param {Object} cell - Cell config
   * @param {Object} friction - Friction config
   * @returns {Array<Object>} 8h carry yields { fundingTime, netYield }
   */
  static simulateCarryBase(fundingPanel, symbols, cell, friction) {
    const totalPeriods = fundingPanel[symbols[0]].length;
    const L = cell.carryLeverage || 1.0;
    const borrowRateAnnualPct = cell.carryBorrowRateAnnualPct || 0.0;
    const borrowRate8h = (borrowRateAnnualPct / 100) / (3 * 365);
    const borrowDrag = (L > 1.0) ? (L - 1.0) * borrowRate8h : 0.0;

    const roundtripCost = (friction.carryRoundtripBps || 24) / 10000;
    const halfTurnoverCost = roundtripCost / 2;

    let currentWeights = {};
    for (const s of symbols) currentWeights[s] = 0;

    const carryPeriods = [];

    for (let t = 0; t < totalPeriods; t++) {
      let targetWeights = { ...currentWeights };

      if (cell.carryBase === 'STATIC_BTC_ETH_50_50') {
        if (t === 0) {
          targetWeights['BTCUSDT'] = 0.5;
          targetWeights['ETHUSDT'] = 0.5;
        }
      } else if (cell.carryBase === 'ROTATIONAL_TOP_3') {
        const lookbackPeriods = 90; // 30 days
        const rebalancePeriods = 90; // monthly
        if (t >= lookbackPeriods && (t % rebalancePeriods === 0)) {
          const yieldRanking = [];
          for (const s of symbols) {
            let sumFR = 0;
            for (let k = 1; k <= lookbackPeriods; k++) {
              sumFR += fundingPanel[s][t - k].fundingRate;
            }
            yieldRanking.push({ symbol: s, avgFR: sumFR / lookbackPeriods });
          }
          yieldRanking.sort((a, b) => b.avgFR - a.avgFR);
          for (const s of symbols) targetWeights[s] = 0;
          for (let i = 0; i < 3; i++) {
            targetWeights[yieldRanking[i].symbol] = 1.0 / 3.0;
          }
        } else if (t === 0) {
          targetWeights['BTCUSDT'] = 0.5;
          targetWeights['ETHUSDT'] = 0.5;
        }
      }

      // Compute turnover cost
      let turnoverCost = 0;
      let currentTotalExposure = 0;
      for (const s of symbols) {
        const deltaW = Math.abs(targetWeights[s] - currentWeights[s]);
        turnoverCost += deltaW * halfTurnoverCost * L;
        currentWeights[s] = targetWeights[s];
        currentTotalExposure += currentWeights[s];
      }

      // Compute gross funding yield
      let grossYield = 0;
      for (const s of symbols) {
        if (currentWeights[s] > 0) {
          grossYield += currentWeights[s] * fundingPanel[s][t].fundingRate * L;
        }
      }

      const periodBorrowCost = (currentTotalExposure > 0.01) ? borrowDrag : 0.0;
      const netYield = grossYield - periodBorrowCost - turnoverCost;

      carryPeriods.push({
        fundingTime: fundingPanel[symbols[0]][t].fundingTime,
        netYield
      });
    }

    return carryPeriods;
  }

  /**
   * Simulates the combined Barbell Portfolio.
   */
  static simulate(candles, fundingRates, fundingPanel, symbols, cell, friction, portfolioRules) {
    const directionalTrades = this.generateDirectionalTrades(candles, fundingRates, cell.directionalParams || {}, portfolioRules, friction);
    const carryPeriods = this.simulateCarryBase(fundingPanel, symbols, cell, friction);

    const wCarry = cell.carryWeight;
    const wDir = cell.directionalWeight;

    // Index directional trades by their exit timestamp mapped to 8h periods
    const tradeMap = new Map();
    for (const tr of directionalTrades) {
      // Find nearest 8h period boundary at or immediately after exitTime
      let targetPeriodIdx = -1;
      for (let t = 0; t < carryPeriods.length; t++) {
        if (carryPeriods[t].fundingTime >= tr.exitTime) {
          targetPeriodIdx = t;
          break;
        }
      }
      if (targetPeriodIdx === -1) targetPeriodIdx = carryPeriods.length - 1;

      if (!tradeMap.has(targetPeriodIdx)) {
        tradeMap.set(targetPeriodIdx, []);
      }
      tradeMap.get(targetPeriodIdx).push(tr);
    }

    const totalPeriods = carryPeriods.length;
    const periodPortfolioReturns = new Float64Array(totalPeriods);
    const cumulativeEquity = new Float64Array(totalPeriods);
    let equity = 1.0;
    cumulativeEquity[0] = 1.0;

    // 14-day calendar block tracking (42 periods of 8 hours)
    const blockReturns = [];
    let currentBlockNet = 0;
    let blockPeriodCount = 0;
    let blockStartTime = carryPeriods[0].fundingTime;

    let dirWins = 0;
    let dirLosses = 0;

    for (let t = 0; t < totalPeriods; t++) {
      const carryReturn = carryPeriods[t].netYield;

      let dirNetReturn = 0;
      if (tradeMap.has(t)) {
        const closedTrades = tradeMap.get(t);
        for (const tr of closedTrades) {
          dirNetReturn += tr.netReturn;
          if (tr.netReturn > 0) dirWins++;
          else dirLosses++;
        }
      }

      // Barbell Weighted Return for 8h period
      const portReturn = (wCarry * carryReturn) + (wDir * dirNetReturn);

      periodPortfolioReturns[t] = portReturn;
      equity *= (1.0 + portReturn);
      cumulativeEquity[t] = equity;

      currentBlockNet += portReturn;
      blockPeriodCount++;

      if (blockPeriodCount === 42 || t === totalPeriods - 1) {
        blockReturns.push({
          entryTime: blockStartTime,
          exitTime: carryPeriods[t].fundingTime,
          netPct: currentBlockNet,
          netR: currentBlockNet / 0.01 // 1R = 100 bps (1%) net portfolio return
        });
        currentBlockNet = 0;
        blockPeriodCount = 0;
        if (t + 1 < totalPeriods) {
          blockStartTime = carryPeriods[t + 1].fundingTime;
        }
      }
    }

    // Performance Metrics
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

    // Sharpe Ratio
    let sumR = 0;
    for (let t = 0; t < totalPeriods; t++) sumR += periodPortfolioReturns[t];
    const meanR = sumR / totalPeriods;
    let sumSq = 0;
    for (let t = 0; t < totalPeriods; t++) sumSq += Math.pow(periodPortfolioReturns[t] - meanR, 2);
    const stdR = Math.sqrt(sumSq / totalPeriods);
    const annualizedSharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(1095) : 0;

    const winRate = (dirWins + dirLosses) > 0 ? (dirWins / (dirWins + dirLosses)) * 100 : 0;

    return {
      totalNetReturnPct,
      annualizedReturnPct,
      maxDrawdownPct: maxDrawdownPct * 100,
      annualizedSharpe,
      directionalTradeCount: directionalTrades.length,
      directionalWinRate: winRate,
      blockReturns,
      finalEquity: equity,
      directionalTrades
    };
  }
}
