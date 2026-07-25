/**
 * MetaAgentValidator — Devil's Advocate / Red Team Filter
 * Actively audits Trade Proposals for macro, spread, volatility, timing, or correlation reasons to VETO.
 */

export class MetaAgentValidator {
  constructor(config = {}) {
    this.maxSpreadAtrRatio = config.maxSpreadAtrRatio || 0.25;
    this.maxAtrSpikeRatio = config.maxAtrSpikeRatio || 3.0;
  }

  auditProposal(proposal, marketContext = {}) {
    const { spread = 0, atr = 1, currentAtr = 1, hourUtc = 12, dailyDrawdownPct = 0 } = marketContext;

    // Veto 1: Daily system drawdown safety limit (> 3%)
    if (dailyDrawdownPct > 0.03) {
      return { vetoed: true, reason: 'VETO_META_DAILY_DRAWDOWN_EXCEEDED' };
    }

    // Veto 2: Excessive spread ratio
    if (atr > 0 && (spread / atr) > this.maxSpreadAtrRatio) {
      return { vetoed: true, reason: 'VETO_META_EXCESSIVE_SPREAD' };
    }

    // Veto 3: Volatility spike / News shock
    if (atr > 0 && (currentAtr / atr) > this.maxAtrSpikeRatio) {
      return { vetoed: true, reason: 'VETO_META_VOLATILITY_SPIKE_NEWS' };
    }

    // Veto 4: Low liquidity rollover windows (21:00 - 22:00 UTC)
    if (hourUtc === 21 || hourUtc === 22) {
      return { vetoed: true, reason: 'VETO_META_SESSION_ROLLOVER_CHOPS' };
    }

    return { vetoed: false, reason: 'APPROVED_BY_RED_TEAM' };
  }
}
