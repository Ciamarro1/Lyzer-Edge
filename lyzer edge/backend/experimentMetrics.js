import { LLES_TAGS, PhantomPnLGuard } from '../../packages/lyzer-shared/src/governance/epistemicStandard.js';

/**
 * MetricsCalculator module for experiment-level trading performance metrics.
 * Computes PnL, drawdowns, Sharpe ratios, and equity curves from trade histories.
 * Enforces LLES-v1.0 Epistemic Standards and the Absolute Prohibition of Phantom PnL.
 */

export class ExperimentMetrics {
  /**
   * Computes comprehensive experiment-level trading performance metrics from an array of closed trades.
   *
   * @param {Array<Object>} trades - Array of closed trade objects.
   * @returns {Object} Comprehensive metrics object including equity and drawdown curves.
   */
  static computeFromTrades(trades) {
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return {
        epistemic_tag: LLES_TAGS.INFERENCE_EMPIRICAL,
        phantom_pnl_contamination: false,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        totalPnl: 0,
        totalPnlPct: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        sharpeRatio: 0,
        avgTradePnl: 0,
        bestTradePnl: 0,
        worstTradePnl: 0,
        avgHoldingTimeMs: 0,
        equityCurve: [],
        drawdownCurve: [],
        monthlyReturns: {}
      };
    }

    // LLES-v1.0 Guard: Sanitize trades to guarantee zero phantom PnL / avoided loss contamination
    const sanitizedTrades = PhantomPnLGuard.sanitizeRealizedTrades(trades);

    // Ensure trades are sorted by timestamp (entry time)
    const sortedTrades = [...sanitizedTrades].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let winningTrades = 0;
    let losingTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalPnl = 0;
    let bestTradePnl = -Infinity;
    let worstTradePnl = Infinity;
    
    let totalHoldingTime = 0;
    let holdingTimeCount = 0;

    const returns = [];
    const monthlyGroups = {};

    let currentEquity = 1.0;
    let peakEquity = 1.0;
    let maxDrawdown = 0;

    const equityCurve = [];
    const drawdownCurve = [];

    for (const trade of sortedTrades) {
      const pnl = Number(trade.pnl) || 0;
      returns.push(pnl);

      if (pnl > 0) {
        winningTrades++;
        grossProfit += pnl;
      } else {
        losingTrades++;
        grossLoss += Math.abs(pnl);
      }

      totalPnl += pnl;

      if (pnl > bestTradePnl) bestTradePnl = pnl;
      if (pnl < worstTradePnl) worstTradePnl = pnl;

      // Extract entry and exit times (handling variations in field names if any)
      const entryTime = trade.timestamp || trade.entryTime;
      const exitTime = trade.exitTimestamp || trade.exitTime;
      
      if (exitTime && entryTime) {
        totalHoldingTime += (exitTime - entryTime);
        holdingTimeCount++;
      }

      // Equity curve assumes start at 1.0, cumulative multiplication by (1 + pnl)
      currentEquity *= (1 + pnl);
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      
      const currentDrawdown = peakEquity > 0 ? (peakEquity - currentEquity) / peakEquity : 0;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }

      const tradeTs = trade.timestamp || Date.now();
      equityCurve.push({ timestamp: tradeTs, equity: currentEquity });
      drawdownCurve.push({ timestamp: tradeTs, drawdown: currentDrawdown });

      // Aggregate monthly PnL
      if (tradeTs) {
        const date = new Date(tradeTs); // Assumes epoch ms
        const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = 0;
        }
        monthlyGroups[monthKey] += pnl;
      }
    }

    const totalTrades = sortedTrades.length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const profitFactor = grossLoss === 0 
      ? (grossProfit > 0 ? Infinity : 0) 
      : grossProfit / grossLoss;
      
    const totalPnlPct = totalPnl * 100;
    const maxDrawdownPct = maxDrawdown * 100;
    const avgTradePnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgHoldingTimeMs = holdingTimeCount > 0 ? totalHoldingTime / holdingTimeCount : 0;

    // Calculate Sharpe Ratio (annualized, assuming 252 trading days)
    let sharpeRatio = 0;
    if (returns.length >= 2) {
      const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
      const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (returns.length - 1);
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        sharpeRatio = (mean / stdDev) * Math.sqrt(252);
      }
    }

    // Convert monthly returns from fractional to percentage
    const monthlyReturns = {};
    for (const [month, pnlSum] of Object.entries(monthlyGroups)) {
      monthlyReturns[month] = pnlSum * 100;
    }

    if (bestTradePnl === -Infinity) bestTradePnl = 0;
    if (worstTradePnl === Infinity) worstTradePnl = 0;

    const fullMetrics = {
      epistemic_tag: LLES_TAGS.INFERENCE_EMPIRICAL,
      phantom_pnl_contamination: false,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      totalPnl,
      totalPnlPct,
      maxDrawdown,
      maxDrawdownPct,
      sharpeRatio,
      avgTradePnl,
      bestTradePnl,
      worstTradePnl,
      avgHoldingTimeMs,
      equityCurve,
      drawdownCurve,
      monthlyReturns
    };

    const alphaScoreResult = this.computeAlphaScore(fullMetrics);
    fullMetrics.alphaScore = alphaScoreResult.alphaScore;
    fullMetrics.alphaBreakdown = alphaScoreResult.breakdown;

    const antiOverfittingResult = this.computeAntiOverfittingReport(trades, fullMetrics);
    fullMetrics.antiOverfitting = antiOverfittingResult;

    return fullMetrics;
  }

  /**
   * Computes a multi-factor Alpha Score (0-100) incorporating sample size weighting,
   * risk-adjusted return (Sharpe), drawdown, profit factor, and consistency.
   *
   * @param {Object} metrics - Computed performance metrics object.
   * @returns {Object} { alphaScore, breakdown }
   */
  static computeAlphaScore(metrics) {
    if (!metrics || metrics.totalTrades === 0) {
      return {
        alphaScore: 0,
        breakdown: { profitFactorPts: 0, sharpePts: 0, drawdownPts: 0, winRatePts: 0, volumePts: 0, stabilityPts: 0 }
      };
    }

    const { profitFactor, sharpeRatio, maxDrawdownPct, winRate, totalTrades, winningTrades } = metrics;
    const pf = isFinite(profitFactor) ? profitFactor : 5.0;

    // 1. Profit Factor Score (35 points max)
    const pfPts = Math.min(35, Math.max(0, ((pf - 1.0) / 2.0) * 35));

    // 2. Sharpe Ratio Score (25 points max)
    const sharpePts = Math.min(25, Math.max(0, (sharpeRatio / 3.0) * 25));

    // 3. Drawdown Score (20 points max): Max DD <= 5% -> 20, Max DD >= 30% -> 0
    const ddPts = Math.min(20, Math.max(0, ((30.0 - Math.min(30, maxDrawdownPct)) / 25.0) * 20));

    // 4. Win Rate / Consistency Score (10 points max)
    const winRatePts = Math.min(10, Math.max(0, winRate * 10));

    // 5. Volume / Sample Size Score (5 points max): <30 trades heavily penalized
    let volumePts = 0;
    if (totalTrades >= 500) volumePts = 5.0;
    else if (totalTrades >= 100) volumePts = 3.5;
    else if (totalTrades >= 30) volumePts = 2.0;
    else volumePts = Math.max(0.1, (totalTrades / 30.0) * 1.5);

    // 6. Stability Score (5 points max)
    const winRatio = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const stabilityPts = Math.min(5, Math.max(0, winRatio * 5.0));

    const rawScore = pfPts + sharpePts + ddPts + winRatePts + volumePts + stabilityPts;
    const alphaScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

    return {
      alphaScore,
      breakdown: {
        profitFactorPts: Math.round(pfPts * 10) / 10,
        sharpePts: Math.round(sharpePts * 10) / 10,
        drawdownPts: Math.round(ddPts * 10) / 10,
        winRatePts: Math.round(winRatePts * 10) / 10,
        volumePts: Math.round(volumePts * 10) / 10,
        stabilityPts: Math.round(stabilityPts * 10) / 10
      }
    };
  }

  /**
   * Computes Anti-Overfitting and statistical significance report for an experiment.
   *
   * @param {Array<Object>} trades - Raw trade objects.
   * @param {Object} metrics - Performance metrics object.
   * @param {number} configModCount - Number of parameter alterations detected.
   * @returns {Object} Anti-Overfitting report.
   */
  static computeAntiOverfittingReport(trades, metrics, configModCount = 0) {
    const warnings = [];
    let riskLevel = 'LOW';
    let statisticallySignificant = true;

    const totalTrades = metrics.totalTrades || 0;
    const winRate = metrics.winRate || 0;
    const pf = metrics.profitFactor || 0;

    // 1. Sample Size Check
    if (totalTrades < 30) {
      warnings.push(`Low statistical significance: only ${totalTrades} trades recorded (minimum 30 required for Champion promotion).`);
      riskLevel = 'HIGH';
      statisticallySignificant = false;
    } else if (totalTrades < 100) {
      warnings.push(`Moderate sample size (${totalTrades} trades). Additional validation recommended.`);
      if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
    }

    // 2. Config Drift / Parameter Overfitting Check
    if (configModCount > 10) {
      warnings.push(`Config Drift Detected: parameters altered ${configModCount} times. High risk of curve-fitting.`);
      riskLevel = 'CRITICAL';
      statisticallySignificant = false;
    }

    // 3. T-Test p-value calculation (expectancy > 0)
    let pValue = 1.0;
    if (trades && trades.length >= 5) {
      const returns = trades.map(t => Number(t.pnl) || 0);
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
      const stdErr = Math.sqrt(variance / returns.length);
      
      if (stdErr > 0 && mean > 0) {
        const tStat = mean / stdErr;
        // Approximation of one-tailed p-value for Student's t
        pValue = Math.max(0.0001, 1 / (1 + Math.pow(tStat, 2)));
      }
    }

    if (pValue > 0.05 && totalTrades >= 30) {
      warnings.push(`Statistical p-value (${pValue.toFixed(4)}) > 0.05 threshold. PnL mean is not statistically distinct from random noise.`);
      statisticallySignificant = false;
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    // Determine final recommendation
    let recommendation = 'RECOMMENDED FOR CHAMPION';
    if (configModCount > 10) {
      recommendation = 'CONFIG DRIFT DETECTED: START NEW EXPERIMENT';
    } else if (totalTrades < 30) {
      recommendation = 'DO NOT PROMOTE: Insufficient sample size';
    } else if (!statisticallySignificant) {
      recommendation = 'DO NOT PROMOTE: Low statistical significance';
    }

    return {
      riskLevel,
      statisticallySignificant,
      pValue: Math.round(pValue * 10000) / 10000,
      configModifications: configModCount,
      warnings,
      recommendation
    };
  }

  /**
   * Computes a lightweight summary of trading performance metrics (no curves).
   * Useful for high-level experiment leaderboards or quick overviews.
   *
   * @param {Array<Object>} trades - Array of closed trade objects.
   * @returns {Object} Lightweight summary metrics object.
   */
  static computeSummary(trades) {
    const fullMetrics = this.computeFromTrades(trades);
    return {
      totalTrades: fullMetrics.totalTrades,
      winRate: fullMetrics.winRate,
      profitFactor: fullMetrics.profitFactor,
      totalPnlPct: fullMetrics.totalPnlPct,
      maxDrawdownPct: fullMetrics.maxDrawdownPct,
      sharpeRatio: fullMetrics.sharpeRatio,
      alphaScore: fullMetrics.alphaScore,
      riskLevel: fullMetrics.antiOverfitting?.riskLevel || 'LOW'
    };
  }
}
