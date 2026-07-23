/**
 * @fileoverview AdaptiveRuntimeMonitor — Phase 7.3.3 (ADR-021 / ADR-023)
 *
 * Post-promotion watchdog. Monitors live performance metrics and emits
 * verdicts: KEEP, WARNING, or ROLLBACK_REQUIRED.
 *
 * Tracks:
 *   - Sharpe ratio delta vs baseline
 *   - Drawdown accumulation
 *   - Win rate degradation
 *   - Constitutional veto rate increase
 *
 * Observation period: 200 trades before COMPLETED status.
 */
export class AdaptiveRuntimeMonitor {
  constructor(config = {}) {
    this.observationPeriod = config.observationPeriod || 200;
    this.thresholds = {
      maxDrawdownPct: config.maxDrawdownPct || 5.0,
      minPnlPct: config.minPnlPct || -2.0,
      minSharpeDelta: config.minSharpeDelta || -0.3,
      maxVetoRateIncreasePct: config.maxVetoRateIncreasePct || 40.0,
      maxWinRateDegradationPct: config.maxWinRateDegradationPct || 15.0
    };
    this.activeSessions = new Map();
  }

  /**
   * Starts monitoring a promoted adaptation.
   *
   * @param {string} txId - Evolution transaction ID
   * @param {Object} baseline - Pre-promotion baseline metrics
   * @returns {Object} Monitoring session
   */
  startMonitoring(txId, baseline = {}) {
    const session = {
      tx_id: txId,
      baseline: {
        sharpe: baseline.sharpe || 0,
        win_rate: baseline.win_rate || 0.5,
        veto_rate: baseline.veto_rate || 0.1,
        drawdown: 0,
        pnl: 0
      },
      current: {
        trades: 0,
        pnl: 0,
        wins: 0,
        losses: 0,
        drawdown: 0,
        peak_pnl: 0,
        sharpe_values: [],
        veto_count: 0,
        total_decisions: 0
      },
      verdict: 'MONITORING',
      warnings: [],
      started_at: Date.now()
    };

    this.activeSessions.set(txId, session);
    return session;
  }

  /**
   * Feeds a trade result into the monitor.
   *
   * @param {string} txId - Transaction ID
   * @param {Object} tradeResult - { pnl, is_win, was_vetoed }
   * @returns {Object} Updated verdict
   */
  recordTrade(txId, tradeResult) {
    const session = this.activeSessions.get(txId);
    if (!session) throw new Error(`No active monitoring session for ${txId}`);

    const cur = session.current;
    cur.trades++;
    cur.pnl += tradeResult.pnl || 0;
    cur.sharpe_values.push(tradeResult.pnl || 0);
    cur.total_decisions++;

    if (tradeResult.is_win) cur.wins++;
    else cur.losses++;

    if (tradeResult.was_vetoed) cur.veto_count++;

    // Track drawdown
    if (cur.pnl > cur.peak_pnl) cur.peak_pnl = cur.pnl;
    cur.drawdown = cur.peak_pnl - cur.pnl;

    // Evaluate verdict
    return this._evaluate(session);
  }

  /**
   * Evaluates current metrics against thresholds.
   */
  _evaluate(session) {
    const cur = session.current;
    const base = session.baseline;
    const warnings = [];
    let verdict = 'KEEP';

    // 1. Drawdown check
    if (cur.drawdown > this.thresholds.maxDrawdownPct) {
      verdict = 'ROLLBACK_REQUIRED';
      warnings.push({ trigger: 'DRAWDOWN', value: cur.drawdown, threshold: this.thresholds.maxDrawdownPct, severity: 'CRITICAL' });
    }

    // 2. PnL check
    if (cur.pnl < this.thresholds.minPnlPct) {
      verdict = 'ROLLBACK_REQUIRED';
      warnings.push({ trigger: 'PNL_DEGRADATION', value: cur.pnl, threshold: this.thresholds.minPnlPct, severity: 'CRITICAL' });
    }

    // 3. Sharpe delta (after minimum trades)
    if (cur.trades >= 20) {
      const currentSharpe = this._computeSharpe(cur.sharpe_values);
      const sharpeDelta = currentSharpe - base.sharpe;
      if (sharpeDelta < this.thresholds.minSharpeDelta) {
        if (cur.trades >= 100) {
          verdict = 'ROLLBACK_REQUIRED';
          warnings.push({ trigger: 'SHARPE_DEGRADATION', value: sharpeDelta, threshold: this.thresholds.minSharpeDelta, severity: 'CRITICAL' });
        } else {
          warnings.push({ trigger: 'SHARPE_DEGRADATION', value: sharpeDelta, threshold: this.thresholds.minSharpeDelta, severity: 'WARNING' });
        }
      }
    }

    // 4. Win rate degradation
    if (cur.trades >= 20) {
      const currentWinRate = cur.wins / cur.trades;
      const winRateDelta = (currentWinRate - base.win_rate) / (base.win_rate || 0.01) * 100;
      if (winRateDelta < -this.thresholds.maxWinRateDegradationPct) {
        verdict = 'ROLLBACK_REQUIRED';
        warnings.push({ trigger: 'WIN_RATE_DEGRADATION', value: winRateDelta, threshold: -this.thresholds.maxWinRateDegradationPct, severity: 'CRITICAL' });
      }
    }

    // 5. Veto rate increase
    if (cur.total_decisions >= 20) {
      const currentVetoRate = cur.veto_count / cur.total_decisions;
      const vetoRateDelta = (currentVetoRate - base.veto_rate) / (base.veto_rate || 0.01) * 100;
      if (vetoRateDelta > this.thresholds.maxVetoRateIncreasePct) {
        verdict = 'ROLLBACK_REQUIRED';
        warnings.push({ trigger: 'VETO_RATE_INCREASE', value: vetoRateDelta, threshold: this.thresholds.maxVetoRateIncreasePct, severity: 'CRITICAL' });
      }
    }

    // 6. Observation complete?
    const observationComplete = cur.trades >= this.observationPeriod && verdict === 'KEEP';

    session.verdict = verdict;
    session.warnings = warnings;

    return {
      tx_id: session.tx_id,
      verdict,
      trades_observed: cur.trades,
      observation_complete: observationComplete,
      metrics: {
        pnl: Number(cur.pnl.toFixed(4)),
        drawdown: Number(cur.drawdown.toFixed(4)),
        win_rate: cur.trades > 0 ? Number((cur.wins / cur.trades).toFixed(4)) : 0,
        veto_rate: cur.total_decisions > 0 ? Number((cur.veto_count / cur.total_decisions).toFixed(4)) : 0
      },
      warnings,
      evaluated_at: Date.now()
    };
  }

  _computeSharpe(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : Number((mean / stdDev).toFixed(4));
  }

  getSession(txId) {
    return this.activeSessions.get(txId) || null;
  }

  stopMonitoring(txId) {
    this.activeSessions.delete(txId);
  }
}
