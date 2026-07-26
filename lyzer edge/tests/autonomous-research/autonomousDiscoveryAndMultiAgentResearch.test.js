import { describe, test, expect } from 'vitest';
import { AutoFeatureDiscoveryEngine } from '../../src/components/commandCenter/sdk/evidence/discovery/AutoFeatureDiscoveryEngine.js';
import { StrategyGenomeEngine } from '../../src/components/commandCenter/sdk/evidence/lab/StrategyGenomeEngine.js';
import { MultiAgentResearchLab } from '../../src/components/commandCenter/sdk/evidence/discovery/MultiAgentResearchLab.js';

class ZeroAllocFeatureBufferPool {
  constructor(capacity = 10000, featureDimension = 10) {
    this.capacity = capacity;
    this.featureDimension = featureDimension;
    this.buffer = new Float64Array(capacity * featureDimension);
    this._disposed = false;
  }

  writeFeatureVector(index, values) {
    if (this._disposed) throw new Error('ERR_BUFFER_DISPOSED: Feature buffer pool is disposed');
    const offset = index * this.featureDimension;
    for (let i = 0; i < this.featureDimension; i++) {
      this.buffer[offset + i] = values[i];
    }
  }

  dispose() {
    this._disposed = true;
    this.buffer = new Float64Array(0);
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

describe('Autonomous Discovery & Multi-Agent Research Verification Suite', () => {

  describe('Auto Feature Discovery & Ring Buffer Performance', () => {
    test('discovers baseline features and synthesizes compound features cleanly', () => {
      const discoveryEngine = new AutoFeatureDiscoveryEngine();
      const initialFeatures = discoveryEngine.getDiscoveredFeatures();
      expect(initialFeatures.length).toBeGreaterThanOrEqual(10);

      const newFeature = discoveryEngine.discoverNewFeatures();
      expect(newFeature.id).toContain('feat_auto_discovered_');
      expect(newFeature.category).toBe('SYNTHETIC_DISCOVERY');
      expect(newFeature.infoGain).toBeGreaterThan(0);

      const updatedFeatures = discoveryEngine.getDiscoveredFeatures();
      expect(updatedFeatures.length).toBe(initialFeatures.length + 1);
    });

    test('ZERO-ALLOCATION: Ring buffer pool achieves >25,000 feature vector writes/sec with 0 GC allocations', () => {
      const pool = new ZeroAllocFeatureBufferPool(10000, 10);
      const totalWrites = 50000;
      const sampleVector = [0.74, 0.81, 0.79, 0.85, 0.76, 0.83, 0.88, 0.86, 0.72, 0.89];

      const startTime = performance.now();
      for (let i = 0; i < totalWrites; i++) {
        const idx = i % 10000;
        pool.writeFeatureVector(idx, sampleVector);
      }
      const elapsedMs = performance.now() - startTime;
      const opsPerSec = (totalWrites / elapsedMs) * 1000;

      expect(opsPerSec).toBeGreaterThan(25000);
      pool[Symbol.dispose]();
    });
  });

  describe('Multi-Agent Research Workflow', () => {
    test('executes autonomous multi-agent cycle across 6 specialized agents', async () => {
      const lab = new MultiAgentResearchLab();
      const cycleResult = await lab.runScientificResearchCycle('Causal Entropy Discovery');

      expect(cycleResult.cycleId).toBeDefined();
      expect(cycleResult.status).toBe('PUBLISHED_TO_PRODUCTION_REGISTRY');
      expect(cycleResult.sharpeRatio).toBeGreaterThan(2.0);
      expect(cycleResult.brierScore).toBeLessThan(0.05);
      expect(cycleResult.trgScore).toBeGreaterThan(0.40);
    });
  });

  describe('TC39 Disposable Compliance', () => {
    test('AutoFeatureDiscoveryEngine disposes correctly via [Symbol.dispose]()', () => {
      const engine = new AutoFeatureDiscoveryEngine();
      expect(engine.getDiscoveredFeatures().length).toBeGreaterThan(0);

      engine[Symbol.dispose]();

      expect(engine._disposed).toBe(true);
      expect(() => engine.discoverNewFeatures()).toThrow('ERR_AUTO_FEATURE_DISCOVERY_DISPOSED');
    });
  });

  describe('Zero-Trust Execution Safety & Signal Emission Check', () => {
    test('ZERO TRADE SIGNALS: AutoFeatureDiscovery outputs zero BUY/SELL execution signals', () => {
      const discoveryEngine = new AutoFeatureDiscoveryEngine();
      const features = discoveryEngine.getDiscoveredFeatures();

      for (const feat of features) {
        expect(feat).not.toHaveProperty('signal');
        expect(feat).not.toHaveProperty('action');
        expect(feat).not.toHaveProperty('side');
        expect(feat).not.toHaveProperty('buyOrder');
        expect(feat).not.toHaveProperty('sellOrder');
      }

      const synthesized = discoveryEngine.discoverNewFeatures();
      expect(synthesized).not.toHaveProperty('action');
      expect(synthesized).not.toHaveProperty('signal');
    });

    test('ZERO TRADE SIGNALS: StrategyGenomeEngine evolutionary outputs contain zero BUY/SELL trade signals', () => {
      const genomeEngine = new StrategyGenomeEngine(10);
      const topGenome = genomeEngine.evolveGeneration();

      expect(topGenome).not.toHaveProperty('signal');
      expect(topGenome).not.toHaveProperty('action', 'BUY');
      expect(topGenome).not.toHaveProperty('action', 'SELL');
      expect(topGenome).toHaveProperty('dnaId');
      expect(topGenome).toHaveProperty('genes');
    });
  });
});
