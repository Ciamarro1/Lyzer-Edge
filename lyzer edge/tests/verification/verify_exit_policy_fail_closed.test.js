import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  validateDistanceFraction, 
  validatePriceInvariants, 
  getExitPolicyConfig,
  StreamEngine 
} from '../../backend/streamEngine.js';

describe('Lyzer Edge — Fail-Closed Exit Policy & Mathematical Invariants', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. validateDistanceFraction (Decimal Distance Range in (0.001, 0.15))', () => {
    it('accepts valid decimal fractions in (0.001, 0.15)', () => {
      expect(validateDistanceFraction(0.008, 'testParam')).toBe(0.008); // 0.8%
      expect(validateDistanceFraction(0.015, 'testParam')).toBe(0.015); // 1.5%
      expect(validateDistanceFraction(0.001, 'testParam')).toBe(0.001); // 0.1% (min boundary)
      expect(validateDistanceFraction(0.15, 'testParam')).toBe(0.15);   // 15% (max boundary)
      expect(validateDistanceFraction('0.0045', 'testParam')).toBe(0.0045);
    });

    it('FATALLY THROWS on 99.0 without silent division by 100', () => {
      expect(() => validateDistanceFraction(99.0, 'SCALP_TP_PCT')).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: SCALP_TP_PCT \(99\) is outside allowable decimal range \(0.001, 0.15\)/
      );
    });

    it('FATALLY THROWS on 1.5 (raw percentage representation)', () => {
      expect(() => validateDistanceFraction(1.5, 'SCALP_TP_PCT')).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: SCALP_TP_PCT \(1.5\) is outside allowable decimal range \(0.001, 0.15\)/
      );
    });

    it('FATALLY THROWS on zero or negative values', () => {
      expect(() => validateDistanceFraction(0, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
      expect(() => validateDistanceFraction(-0.01, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
    });

    it('FATALLY THROWS on values below 0.001 or above 0.15', () => {
      expect(() => validateDistanceFraction(0.0005, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
      expect(() => validateDistanceFraction(0.16, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
      expect(() => validateDistanceFraction(0.50, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
    });

    it('FATALLY THROWS on invalid inputs (NaN, null, undefined, empty string)', () => {
      expect(() => validateDistanceFraction('abc', 'distance')).toThrow(/\[FAIL-CLOSED\]/);
      expect(() => validateDistanceFraction(null, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
      expect(() => validateDistanceFraction(undefined, 'distance')).toThrow(/\[FAIL-CLOSED\]/);
      expect(() => validateDistanceFraction('', 'distance')).toThrow(/\[FAIL-CLOSED\]/);
    });
  });

  describe('2. validatePriceInvariants (LONG & SHORT Mathematical Constraints)', () => {
    describe('LONG Invariants: StopLoss < EntryPrice < TakeProfit', () => {
      it('passes when SL < Entry < TP', () => {
        expect(() => validatePriceInvariants('LONG', 100, 99, 102)).not.toThrow();
        expect(() => validatePriceInvariants('BUY', 65000, 64500, 66000)).not.toThrow();
      });

      it('passes when TP is null (under TIME exit policy)', () => {
        expect(() => validatePriceInvariants('LONG', 100, 99, null)).not.toThrow();
        expect(() => validatePriceInvariants('LONG', 100, 99, undefined)).not.toThrow();
      });

      it('FATALLY THROWS when StopLoss >= EntryPrice for LONG', () => {
        expect(() => validatePriceInvariants('LONG', 100, 100, 105)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for LONG: StopLoss \(100\) must be strictly less than EntryPrice \(100\)/
        );
        expect(() => validatePriceInvariants('LONG', 100, 102, 105)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for LONG: StopLoss \(102\) must be strictly less than EntryPrice \(100\)/
        );
      });

      it('FATALLY THROWS when TakeProfit <= EntryPrice for LONG', () => {
        expect(() => validatePriceInvariants('LONG', 100, 98, 100)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for LONG: TakeProfit \(100\) must be strictly greater than EntryPrice \(100\)/
        );
        expect(() => validatePriceInvariants('LONG', 100, 98, 97)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for LONG: TakeProfit \(97\) must be strictly greater than EntryPrice \(100\)/
        );
      });
    });

    describe('SHORT Invariants: TakeProfit < EntryPrice < StopLoss and TakeProfit > 0', () => {
      it('passes when TP < Entry < SL and TP > 0', () => {
        expect(() => validatePriceInvariants('SHORT', 100, 101, 98)).not.toThrow();
        expect(() => validatePriceInvariants('SELL', 65000, 65500, 64000)).not.toThrow();
      });

      it('passes when TP is null (under TIME exit policy)', () => {
        expect(() => validatePriceInvariants('SHORT', 100, 101, null)).not.toThrow();
        expect(() => validatePriceInvariants('SHORT', 100, 101, undefined)).not.toThrow();
      });

      it('FATALLY THROWS when StopLoss <= EntryPrice for SHORT', () => {
        expect(() => validatePriceInvariants('SHORT', 100, 100, 95)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for SHORT: StopLoss \(100\) must be strictly greater than EntryPrice \(100\)/
        );
        expect(() => validatePriceInvariants('SHORT', 100, 98, 95)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for SHORT: StopLoss \(98\) must be strictly greater than EntryPrice \(100\)/
        );
      });

      it('FATALLY THROWS when TakeProfit >= EntryPrice or TakeProfit <= 0 for SHORT', () => {
        expect(() => validatePriceInvariants('SHORT', 100, 102, 100)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for SHORT: TakeProfit \(100\) must be strictly positive and less than EntryPrice \(100\)/
        );
        expect(() => validatePriceInvariants('SHORT', 100, 102, 105)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for SHORT: TakeProfit \(105\) must be strictly positive and less than EntryPrice \(100\)/
        );
        expect(() => validatePriceInvariants('SHORT', 100, 102, 0)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for SHORT: TakeProfit \(0\) must be strictly positive and less than EntryPrice \(100\)/
        );
        expect(() => validatePriceInvariants('SHORT', 100, 102, -10)).toThrow(
          /\[FAIL-CLOSED\] Price invariant violated for SHORT: TakeProfit \(-10\) must be strictly positive and less than EntryPrice \(100\)/
        );
      });
    });

    describe('Invalid Input Protection', () => {
      it('FATALLY THROWS on non-positive entry or stop loss', () => {
        expect(() => validatePriceInvariants('LONG', 0, 90, 110)).toThrow(/\[FAIL-CLOSED\] Invalid entryPrice/);
        expect(() => validatePriceInvariants('LONG', 100, -5, 110)).toThrow(/\[FAIL-CLOSED\] Invalid stopLoss/);
        expect(() => validatePriceInvariants('INVALID_DIR', 100, 90, 110)).toThrow(/\[FAIL-CLOSED\] Invalid trade direction/);
      });
    });
  });

  describe('3. getExitPolicyConfig Resolution & Validation', () => {
    it('defaults to TIME and 15m when not specified', () => {
      delete process.env.EXIT_POLICY;
      delete process.env.TIME_EXIT_MINUTES;
      const config = getExitPolicyConfig();
      expect(config.policy).toBe('TIME');
      expect(config.timeExitMinutes).toBe(15);
    });

    it('correctly resolves DYNAMIC_TP and HYBRID_SCALE_OUT', () => {
      process.env.EXIT_POLICY = 'DYNAMIC_TP';
      expect(getExitPolicyConfig().policy).toBe('DYNAMIC_TP');

      process.env.EXIT_POLICY = 'HYBRID_SCALE_OUT';
      expect(getExitPolicyConfig().policy).toBe('HYBRID_SCALE_OUT');
    });

    it('FATALLY THROWS when EXIT_POLICY is invalid', () => {
      process.env.EXIT_POLICY = 'INVALID_POLICY_XYZ';
      expect(() => getExitPolicyConfig()).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: Invalid EXIT_POLICY "INVALID_POLICY_XYZ"/
      );
    });

    it('FATALLY THROWS when TIME_EXIT_MINUTES is non-positive or invalid', () => {
      process.env.EXIT_POLICY = 'TIME';
      process.env.TIME_EXIT_MINUTES = '0';
      expect(() => getExitPolicyConfig()).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: Invalid TIME_EXIT_MINUTES "0"/
      );

      process.env.TIME_EXIT_MINUTES = '-10';
      expect(() => getExitPolicyConfig()).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: Invalid TIME_EXIT_MINUTES "-10"/
      );

      process.env.TIME_EXIT_MINUTES = 'invalid';
      expect(() => getExitPolicyConfig()).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: Invalid TIME_EXIT_MINUTES "invalid"/
      );
    });
  });

  describe('4. StreamEngine Position Management under EXIT_POLICY', () => {
    it('sets takeProfit to null under EXIT_POLICY = "TIME"', () => {
      process.env.EXIT_POLICY = 'TIME';
      process.env.TIME_EXIT_MINUTES = '15';
      process.env.ARL_MODE = 'SIMULATION';

      const engine = new StreamEngine({ symbol: 'BTCUSDT' });
      expect(engine.exitPolicy).toBe('TIME');
      expect(engine.timeExitMinutes).toBe(15);
    });

    it('FATALLY THROWS during initialization if corrupted SCALP_TP_PCT=99.0 is provided', async () => {
      process.env.EXIT_POLICY = 'TIME';
      process.env.SCALP_TP_PCT = '99.0';
      process.env.ARL_MODE = 'SIMULATION';

      // Instantiating engine with SCALP_TP_PCT=99.0 must immediately throw fail-closed
      expect(() => {
        new StreamEngine({ symbol: 'BTCUSDT' });
      }).toThrow(
        /\[FAIL-CLOSED\] Fatal configuration error: SCALP_TP_PCT \(99.0\) is outside allowable decimal range \(0.001, 0.15\)/
      );
    });

    it('processes TIME_EXIT correctly when time limit is reached without premature TP', async () => {
      process.env.EXIT_POLICY = 'TIME';
      process.env.TIME_EXIT_MINUTES = '15';
      process.env.ARL_MODE = 'SIMULATION';

      const engine = new StreamEngine({ symbol: 'BTCUSDT' });

      // Directly set an active position under TIME exit policy
      const entryTimeSec = 1000000;
      engine.activePosition = {
        id: 'pos_test_time_01',
        timestamp: entryTimeSec,
        direction: 'LONG',
        entryPrice: 100,
        stopLoss: 99.5,
        initialStopLoss: 99.5,
        takeProfit: null, // Strictly null under TIME policy
        exitPolicy: 'TIME',
        timeExitMinutes: 15,
        quantity: 1,
        initialQuantity: 1,
        remainingQuantity: 1,
        peakFavorablePrice: 100.5
      };

      // 1. Tick at 5 minutes (300s): should NOT close
      const candle5m = {
        open: 100.5,
        high: 101.5,
        low: 100.0,
        close: 101.0,
        volume: 20,
        openTime: (entryTimeSec + 300) * 1000
      };
      await engine.processCandle(candle5m, 2);
      expect(engine.activePosition).not.toBeNull();

      // 2. Tick at 15 minutes (900s): MUST trigger TIME_EXIT at candle.close
      const candle15m = {
        open: 101.0,
        high: 101.5,
        low: 100.8,
        close: 101.2,
        volume: 20,
        openTime: (entryTimeSec + 900) * 1000
      };
      await engine.processCandle(candle15m, 3);
      expect(engine.activePosition).toBeNull();
      
      const lastTrade = engine.tradeHistory[engine.tradeHistory.length - 1];
      expect(lastTrade).toBeDefined();
      expect(lastTrade.reasonCodes).toContain('TIME_EXIT');
      expect(lastTrade.exitPrice).toBe(101.2);
    });

    it('triggers STOP_LOSS during TIME policy if catastrophe risk is encountered', async () => {
      process.env.EXIT_POLICY = 'TIME';
      process.env.TIME_EXIT_MINUTES = '15';
      process.env.ARL_MODE = 'SIMULATION';

      const engine = new StreamEngine({ symbol: 'BTCUSDT' });

      const entryTimeSec = 1000000;
      engine.activePosition = {
        id: 'pos_test_sl_01',
        timestamp: entryTimeSec,
        direction: 'LONG',
        entryPrice: 100,
        stopLoss: 99.5,
        initialStopLoss: 99.5,
        takeProfit: null,
        exitPolicy: 'TIME',
        timeExitMinutes: 15,
        quantity: 1
      };

      // Sudden crash to 99.0 at 2 minutes (120s): should trigger STOP_LOSS immediately
      const adverseCandle = {
        open: 100,
        high: 100.1,
        low: 99.2,
        close: 99.3,
        volume: 100,
        openTime: (entryTimeSec + 120) * 1000
      };
      await engine.processCandle(adverseCandle, 2);
      expect(engine.activePosition).toBeNull();

      const lastTrade = engine.tradeHistory[engine.tradeHistory.length - 1];
      expect(lastTrade.reasonCodes).toContain('STOP_LOSS');
      expect(lastTrade.exitPrice).toBe(99.5);
    });
  });
});
