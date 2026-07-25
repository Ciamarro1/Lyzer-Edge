import { describe, test, expect } from 'vitest';
import { AdaptiveRuntimeMonitor } from '../../src/adaptive-evolution/AdaptiveRuntimeMonitor.js';

describe('Fase 7.3.3 — AdaptiveRuntimeMonitor Verification', () => {
  test('emits KEEP verdict when metrics are healthy', () => {
    const monitor = new AdaptiveRuntimeMonitor();

    monitor.startMonitoring('tx_001', { sharpe: 1.2, win_rate: 0.55, veto_rate: 0.1 });

    // Feed 25 winning trades
    let lastVerdict;
    for (let i = 0; i < 25; i++) {
      lastVerdict = monitor.recordTrade('tx_001', { pnl: 0.5, is_win: true, was_vetoed: false });
    }

    expect(lastVerdict.verdict).toBe('KEEP');
    expect(lastVerdict.metrics.pnl).toBeGreaterThan(0);
    expect(lastVerdict.metrics.win_rate).toBe(1.0);
  });

  test('emits ROLLBACK_REQUIRED when drawdown exceeds threshold', () => {
    const monitor = new AdaptiveRuntimeMonitor({ maxDrawdownPct: 5.0 });

    monitor.startMonitoring('tx_002', { sharpe: 1.0, win_rate: 0.5, veto_rate: 0.1 });

    // Build up some profit then crash
    monitor.recordTrade('tx_002', { pnl: 3.0, is_win: true, was_vetoed: false });
    monitor.recordTrade('tx_002', { pnl: 2.0, is_win: true, was_vetoed: false });

    // Now lose heavily
    const verdict = monitor.recordTrade('tx_002', { pnl: -8.0, is_win: false, was_vetoed: false });

    expect(verdict.verdict).toBe('ROLLBACK_REQUIRED');
    expect(verdict.warnings.some(w => w.trigger === 'DRAWDOWN')).toBe(true);
  });

  test('marks observation complete after 200 trades with healthy metrics', () => {
    const monitor = new AdaptiveRuntimeMonitor({ observationPeriod: 50 });

    monitor.startMonitoring('tx_003', { sharpe: 1.0, win_rate: 0.5, veto_rate: 0.1 });

    let lastVerdict;
    for (let i = 0; i < 50; i++) {
      lastVerdict = monitor.recordTrade('tx_003', { pnl: 0.1, is_win: true, was_vetoed: false });
    }

    expect(lastVerdict.observation_complete).toBe(true);
    expect(lastVerdict.verdict).toBe('KEEP');
  });
});
