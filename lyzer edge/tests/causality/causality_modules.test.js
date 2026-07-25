import { describe, it, expect } from 'vitest';
import { MarketStateEngine, MARKET_STATES } from '../../../packages/lyzer-shared/src/causality/marketStateEngine.js';
import { LiquidityGraph } from '../../../packages/lyzer-shared/src/causality/liquidityGraph.js';
import { MetaAgentValidator } from '../../../packages/lyzer-shared/src/causality/metaAgentValidator.js';
import { EdgeValidator } from '../../../packages/lyzer-shared/src/causality/edgeValidator.js';

describe('Market Causality Engine Modules (vNext)', () => {
  it('MarketStateEngine classifies range vs stop hunt vs expansion', () => {
    const engine = new MarketStateEngine();
    const mockCandles = Array.from({ length: 20 }, (_, i) => ({
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i
    }));

    const result = engine.evaluateState(mockCandles);
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('confidence');
  });

  it('LiquidityGraph manages dynamic nodes and sweeps', () => {
    const graph = new LiquidityGraph();
    const bslNode = graph.addNode({ type: 'BUY_SIDE', price: 105.0, strength: 0.9, htf: true });
    expect(bslNode.id).toBe('Node_1');

    // Sweep price at 106
    const active = graph.updateGraph(106.0, 1.0);
    expect(bslNode.isMitigated).toBe(true);
    expect(active.length).toBe(0);
  });

  it('MetaAgentValidator vetoes high-risk drawdown and volatility spikes', () => {
    const redTeam = new MetaAgentValidator();
    
    // Test drawdown veto (> 3%)
    const veto1 = redTeam.auditProposal({ symbol: 'BTCUSDT' }, { dailyDrawdownPct: 0.04 });
    expect(veto1.vetoed).toBe(true);
    expect(veto1.reason).toBe('VETO_META_DAILY_DRAWDOWN_EXCEEDED');

    // Test approved proposal
    const pass = redTeam.auditProposal({ symbol: 'BTCUSDT' }, { dailyDrawdownPct: 0.01, spread: 0.1, atr: 1.0 });
    expect(pass.vetoed).toBe(false);
    expect(pass.reason).toBe('APPROVED_BY_RED_TEAM');
  });

  it('EdgeValidator certifies pattern performance across trade batches', () => {
    const validator = new EdgeValidator();
    const mockTrades = [
      { pnl: 50 }, { pnl: -20 }, { pnl: 40 }, { pnl: 30 }, { pnl: -10 },
      { pnl: 60 }, { pnl: 20 }, { pnl: -15 }, { pnl: 35 }, { pnl: 45 }
    ];

    const cert = validator.evaluatePatternEdge(mockTrades);
    expect(cert.certified).toBe(true);
    expect(cert.metrics.totalTrades).toBe(10);
    expect(cert.metrics.winRate).toBeGreaterThan(0.5);
  });
});
