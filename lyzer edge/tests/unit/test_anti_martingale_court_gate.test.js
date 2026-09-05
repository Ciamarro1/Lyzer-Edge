import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintEngine } from '../../../packages/lyzer-constitution/src/eca/constraintEngine.js';
import { DynamicSizing, calculateHalfKellyRisk, validateAntiMartingaleConstraint } from '../../src/engine/sizing.js';

describe('Constitutional Anti-Martingale & Half-Kelly Sizing Gate', () => {
  let engine;
  let mockLedger;

  beforeEach(() => {
    engine = new ConstraintEngine();
    mockLedger = {
      getNearMissCount: () => 0,
      appendRecord: () => {}
    };
  });

  describe('1. Half-Kelly Mathematical Invariants', () => {
    it('calculates analytical Half-Kelly fraction correctly for 1:5 RR', () => {
      // p = 0.1841 (18.41%), b = 5.0
      // f* = (0.1841 * 6 - 1) / 5 = (1.1046 - 1) / 5 = 0.1046 / 5 = 0.02092 (2.09%)
      // Half-Kelly = f* / 2 = 1.046%
      const riskPct = calculateHalfKellyRisk(0.1841, 5.0, 0.0);
      expect(riskPct).toBeGreaterThan(0.9);
      expect(riskPct).toBeLessThan(1.2);
    });

    it('returns 0 risk when expected value is non-positive', () => {
      // p = 0.15 on 1:5 RR -> EV = (0.15 * 6 - 1) / 5 = -0.10 / 5 = -0.02 < 0
      const risk = calculateHalfKellyRisk(0.15, 5.0, 0.0);
      expect(risk).toBe(0);
    });

    it('attenuates risk when portfolio enters drawdown via cubic dampener', () => {
      const riskNormal = calculateHalfKellyRisk(0.19, 5.0, 0.0);
      const riskDd20 = calculateHalfKellyRisk(0.19, 5.0, 0.20);
      const riskDd40 = calculateHalfKellyRisk(0.19, 5.0, 0.40);

      expect(riskNormal).toBeGreaterThan(riskDd20);
      expect(riskDd20).toBeGreaterThan(riskDd40);
      expect(riskDd40).toBeGreaterThanOrEqual(0.001); // bounded above zero
    });
  });

  describe('2. Anti-Martingale Constraint Validation', () => {
    it('permits constant sizing after a loss', () => {
      const check = validateAntiMartingaleConstraint(0.01, 'LOSS', 0.01);
      expect(check.allowed).toBe(true);
      expect(check.reason).toBeNull();
    });

    it('permits decreased sizing after a loss', () => {
      const check = validateAntiMartingaleConstraint(0.008, 'LOSS', 0.01);
      expect(check.allowed).toBe(true);
    });

    it('vetoes post-loss risk escalation > 5%', () => {
      // Escalating from 1.0% to 1.2% (a 20% increase, like in martingale)
      const check = validateAntiMartingaleConstraint(0.012, 'LOSS', 0.01);
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('VETO_MARTINGALE_ESCALATION_PROHIBITED');
    });

    it('permits sizing expansion after a win', () => {
      const check = validateAntiMartingaleConstraint(0.015, 'WIN', 0.01);
      expect(check.allowed).toBe(true);
    });
  });

  describe('3. Constitutional Court ConstraintEngine (RULE_008_ANTI_MARTINGALE)', () => {
    it('passes state with normal sizing and no post-loss escalation', () => {
      const state = {
        symbol: 'BTCUSDT',
        currentDrawdown: 0.01,
        requestedPositionSize: 0.10,
        previousPositionSize: 0.10,
        lastTradeOutcome: 'WIN',
        isPostLossEscalation: false
      };

      const result = engine.evaluate(state, mockLedger);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('vetoes state with explicit isPostLossEscalation flag', () => {
      const state = {
        symbol: 'BTCUSDT',
        currentDrawdown: 0.01,
        requestedPositionSize: 0.12,
        previousPositionSize: 0.10,
        lastTradeOutcome: 'LOSS',
        isPostLossEscalation: true
      };

      const result = engine.evaluate(state, mockLedger);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('VETO_MARTINGALE_ESCALATION');
    });

    it('vetoes state where lastTrade was LOSS and requestedPositionSize > 1.05 * previousPositionSize', () => {
      const state = {
        symbol: 'BTCUSDT',
        currentDrawdown: 0.01,
        requestedPositionSize: 0.15,
        previousPositionSize: 0.10,
        lastTradeOutcome: 'LOSS',
        isPostLossEscalation: false // even if flag was falsely omitted
      };

      const result = engine.evaluate(state, mockLedger);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('VETO_MARTINGALE_ESCALATION');
    });
  });
});
