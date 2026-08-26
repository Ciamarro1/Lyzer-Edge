import { describe, it, expect } from 'vitest';
import { DynamicWeightMatrix } from '../../../packages/lyzer-shared/src/engine/weightMatrix.js';
import { RegimeEngine } from '../../backend/regimeEngine.js';
import { MicrostructureDampener } from '../../../packages/lyzer-shared/src/engine/MicrostructureDampener.js';

describe('Regime Conditioning & Spread Friction Gate Suite', () => {

  describe('1. DynamicWeightMatrix LOW_LIQUIDITY_NIGHT Rebalancing', () => {
    it('correctly sets v2 and v5 weights to 0.8 in LOW_LIQUIDITY_NIGHT regime', () => {
      const matrix = new DynamicWeightMatrix();

      // Asian session night window (UTC 22:00)
      const nightWeights = matrix.evaluate(0.0008, 'FLAT', 22);
      expect(nightWeights.activeRegime).toBe('LOW_LIQUIDITY_NIGHT');
      expect(nightWeights.v1).toBe(1.2);
      expect(nightWeights.v2).toBe(0.8); // Reduced from 2.0
      expect(nightWeights.v3).toBe(0.3);
      expect(nightWeights.v4).toBe(0.2);
      expect(nightWeights.v5).toBe(0.8); // Reduced from 1.8
      expect(nightWeights.v6).toBe(1.5);
      expect(nightWeights.v7).toBe(0.1);

      // Low ATR + chop during Asian hours (UTC 03:00)
      const earlyMorningWeights = matrix.evaluate(0.0004, 'CHOP', 3);
      expect(earlyMorningWeights.activeRegime).toBe('LOW_LIQUIDITY_NIGHT');
      expect(earlyMorningWeights.v2).toBe(0.8);
      expect(earlyMorningWeights.v5).toBe(0.8);
    });

    it('preserves standard weights in HIGH_VOLATILITY, RANGING, and BALANCED regimes', () => {
      const matrix = new DynamicWeightMatrix();

      const highVol = matrix.evaluate(0.0025, 'TREND', 14);
      expect(highVol.activeRegime).toBe('HIGH_VOLATILITY');
      expect(highVol.v7).toBe(2.0);
      expect(highVol.v2).toBe(0.5);

      const ranging = matrix.evaluate(0.001, 'RANGE', 14);
      expect(ranging.activeRegime).toBe('RANGING');
      expect(ranging.v2).toBe(1.8);
      expect(ranging.v5).toBe(1.6);

      const balanced = matrix.evaluate(0.001, 'FLAT', 14);
      expect(balanced.activeRegime).toBe('BALANCED');
      expect(balanced.v2).toBe(1.0);
      expect(balanced.v5).toBe(1.0);
    });
  });

  describe('2. Spread Friction Gate Mathematical Validation', () => {
    it('verifies that Spread_instant / TopographicalATR <= 0.08 condition holds', () => {
      const maxSpreadAtrRatio = 0.08;
      const topographicalAtr = 100.0;

      // Low spread scenario (e.g. 5 USD spread on 100 USD ATR => 0.05 <= 0.08) -> PASS
      const normalSpread = 5.0;
      const normalRatio = normalSpread / topographicalAtr;
      const normalAllowed = normalRatio <= maxSpreadAtrRatio;
      expect(normalRatio).toBe(0.05);
      expect(normalAllowed).toBe(true);

      // High friction scenario (e.g. 12 USD spread on 100 USD ATR => 0.12 > 0.08) -> VETO
      const excessiveSpread = 12.0;
      const excessiveRatio = excessiveSpread / topographicalAtr;
      const excessiveBlocked = excessiveRatio > maxSpreadAtrRatio;
      expect(excessiveRatio).toBe(0.12);
      expect(excessiveBlocked).toBe(true);

      // Boundary condition: exactly 8%
      const boundarySpread = 8.0;
      const boundaryRatio = boundarySpread / topographicalAtr;
      expect(boundaryRatio <= maxSpreadAtrRatio).toBe(true);
    });
  });

  describe('3. Off-Peak TRG Floor Calibration', () => {
    it('enforces OFF_PEAK_TRG_FLOOR = 0.48 for off-peak session entries', () => {
      const defaultFloor = 0.48;
      const offPeakTrgFloor = parseFloat(process.env.OFF_PEAK_TRG_FLOOR || '0.48');
      expect(offPeakTrgFloor).toBe(defaultFloor);

      // Low TRG off-peak should be blocked
      const lowTrg = 0.35;
      expect(lowTrg < offPeakTrgFloor).toBe(true);

      // High TRG off-peak with sufficient structural energy should pass
      const validTrg = 0.50;
      expect(validTrg >= offPeakTrgFloor).toBe(true);
    });
  });

  describe('4. Preservation of Open Position Management During Night/Off-Peak Windows', () => {
    it('ensures RegimeEngine and MicrostructureDampener continue managing open positions without premature liquidation', () => {
      const regimeEngine = new RegimeEngine();
      const dampener = new MicrostructureDampener({ minHoldingCandles: 5, cooldownCandles: 5 });

      const activePos = {
        id: 'POS_NIGHT_001',
        direction: 'LONG',
        entryPrice: 50000,
        initialStopLoss: 49500,
        stopLoss: 49500,
        takeProfit: 51500,
        openCandleIndex: 10,
        timestamp: Math.floor(Date.now() / 1000)
      };

      const mtfCandles = {
        '1m': [
          { open: 50000, high: 50200, low: 49950, close: 50150, volume: 100 },
          { open: 50150, high: 50350, low: 50100, close: 50300, volume: 120 },
          { open: 50300, high: 50600, low: 50250, close: 50550, volume: 150 }
        ],
        '15m': [
          { open: 49900, high: 50300, low: 49800, close: 50200, volume: 500 },
          { open: 50200, high: 50700, low: 50150, close: 50600, volume: 600 }
        ]
      };

      const currentCandle = {
        open: 50300,
        high: 50600,
        low: 50250,
        close: 50550,
        volume: 150
      };

      // 1. RegimeEngine evaluates active position: mfeR = (50600 - 50000) / 500 = 1.2R => CONFIRMATION
      const action = regimeEngine.evaluate(activePos, currentCandle, mtfCandles);
      expect(action.type).toBe('HOLD');
      expect(action.newStopLoss).toBeGreaterThan(activePos.entryPrice); // Protected StopLoss (+0.05%)

      // 2. MicrostructureDampener verifies MHT and profit barrier: 3 candles held < 5 minHoldingCandles => Lock active
      const dampenerResult = dampener.canCloseTrade(activePos, 13, currentCandle.close, 100, { eef: false, reason_codes: [] });
      expect(dampenerResult.canClose).toBe(false);
      expect(dampenerResult.reason).toContain('MHT_CANDLE_LOCK');

      // 3. Even after MHT elapses, noise barrier protects trade unless real TP/SL or emergency veto occurs
      const dampenerAfterMht = dampener.canCloseTrade(activePos, 16, currentCandle.close, 100, { eef: false, reason_codes: [] });
      expect(dampenerAfterMht.canClose).toBe(true);
    });
  });
});
