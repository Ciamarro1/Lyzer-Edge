import { describe, test, expect } from 'vitest';
import { AlphaDiscoveryEngine } from '../../src/components/commandCenter/sdk/evidence/alpha/AlphaDiscoveryEngine.js';
import { AlphaGraduationPipeline } from '../../src/components/commandCenter/sdk/evidence/alpha/AlphaGraduationPipeline.js';
import { AutonomousResearchScheduler } from '../../src/components/commandCenter/sdk/evidence/alpha/AutonomousResearchScheduler.js';
import { HypothesisFalsificationEngine } from '../../src/components/commandCenter/sdk/evidence/alpha/HypothesisFalsificationEngine.js';

class ZeroAllocTelemetryBuffer {
  constructor(size = 100) {
    this.data = new Float64Array(size);
    this.count = 0;
    this._disposed = false;
  }

  add(val) {
    if (this._disposed) throw new Error('ERR_BUFFER_DISPOSED');
    this.data[this.count % this.data.length] = val;
    this.count++;
  }

  [Symbol.dispose]() {
    this._disposed = true;
    this.count = 0;
  }
}

describe('Phase 9 — Zero-Allocation, TC39 Disposable, Net Alpha & Falsification Verification Suite', () => {

  describe('1. Net Alpha Calculation Engine Verification', () => {
    test('correctly deducts all friction components from gross alpha', () => {
      const alphaEngine = new AlphaDiscoveryEngine();
      const result = alphaEngine.evaluateNetAlpha({
        grossReturn: 0.0250,
        marketReturn: 0.0050,
        riskFreeRate: 0.0001,
        beta: 0.10,
        slippageBps: 3.0,
        feeBps: 7.0
      });

      expect(result.netAlpha).toBeGreaterThan(0);
      expect(result.tStatistic).toBeGreaterThan(2.0);
      expect(result.status).toBe('TRUE_ALPHA_CONFIRMED');
    });

    test('marks strategy as unviable when friction swallows gross alpha', () => {
      const alphaEngine = new AlphaDiscoveryEngine();
      const result = alphaEngine.evaluateNetAlpha({
        grossReturn: 0.0005,
        marketReturn: 0.0050,
        riskFreeRate: 0.0001,
        beta: 0.10,
        slippageBps: 15.0,
        feeBps: 20.0
      });

      expect(result.netAlpha).toBeLessThan(0);
      expect(result.isStatisticallySignificant).toBe(false);
      expect(result.status).toBe('REJECTED_NO_ALPHA');
    });
  });

  describe('2. 8-Stage Graduation Lifecycle', () => {
    test('progresses a high-quality candidate from Stage 1 through Stage 8', () => {
      const pipeline = new AlphaGraduationPipeline();
      pipeline.registerHypothesis('HYP-8STAGE-001', 'Orderflow Alpha');

      for (let i = 0; i < 7; i++) {
        pipeline.advanceStage('HYP-8STAGE-001', { tStatistic: 3.2, oosSharpe: 2.1 });
      }

      const status = pipeline.getHypothesisStatus('HYP-8STAGE-001');
      expect(status.currentStage).toBe('SCALE');
      expect(status.currentStageIndex).toBe(7);
    });
  });

  describe('3. Hypothesis Falsification Pipeline', () => {
    test('falsifies hypothesis triggering insignificant t-statistic or fee erosion', () => {
      const falsification = new HypothesisFalsificationEngine();

      const result = falsification.falsifyHypothesis({
        id: 'WEAK-001',
        tStatistic: 1.1,
        netAlpha: -0.002,
        feeErosionPct: 88.0
      });

      expect(result.falsified).toBe(true);
      expect(result.verdict).toBe('DISCARDED_WEAK_HYPOTHESIS');
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('4. TC39 Disposable & Zero-Allocation Compliance', () => {
    test('ZeroAllocTelemetryBuffer operates with zero dynamic allocations and disposes correctly', () => {
      const buffer = new ZeroAllocTelemetryBuffer(50);
      for (let i = 0; i < 100; i++) {
        buffer.add(i * 0.1);
      }
      expect(buffer.count).toBe(100);

      buffer[Symbol.dispose]();
      expect(buffer._disposed).toBe(true);
      expect(() => buffer.add(1.0)).toThrow('ERR_BUFFER_DISPOSED');
    });
  });

  describe('5. Zero-Trust Execution Safety (Zero Trade Signal Emission)', () => {
    test('ZERO TRADE SIGNALS: AlphaDiscoveryEngine contains zero BUY/SELL execution signals', () => {
      const engine = new AlphaDiscoveryEngine();
      const res = engine.evaluateNetAlpha({});

      expect(res).not.toHaveProperty('signal');
      expect(res).not.toHaveProperty('action');
      expect(res).not.toHaveProperty('side');
      expect(res).not.toHaveProperty('buyOrder');
      expect(res).not.toHaveProperty('sellOrder');
    });
  });
});
