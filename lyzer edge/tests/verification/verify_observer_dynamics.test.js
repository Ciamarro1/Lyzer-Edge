import { describe, it, expect } from 'vitest';
import { MediaObserver } from '../../../packages/lyzer-shared/src/observers/MediaObserver.js';
import { AnalystObserver } from '../../../packages/lyzer-shared/src/observers/AnalystObserver.js';
import { LatencyMatrix } from '../../../packages/lyzer-shared/src/observers/LatencyMatrix.js';

describe('Era 7.1 Observer Dynamics Lab Verification Suite', () => {

  describe('Wave 2: Media Observer', () => {
    it('deve ingerir narrativas e aplicar Negative Bias e decaimento exponencial', () => {
      const media = new MediaObserver({ decayRate: 0.01, negativeBiasMultiplier: 1.6 });

      const now = Date.now();
      // Bad news (should be amplified by negative bias)
      media.ingestNews({
        id: 'NEWS_PANIC_01',
        timestamp: now,
        headline: 'Regulatory crackdowns hit crypto sector',
        sentiment: -0.5,
        reach: 0.9
      });

      const current = media.getCurrentSentiment(now);
      expect(current.netSentiment).toBeLessThan(-0.5); // Amplified by negative bias
      expect(current.dominantNarrative).toBe('PANIC');

      // Test exponential decay after 100 seconds
      const decayed = media.getCurrentSentiment(now + 100000);
      expect(Math.abs(decayed.netSentiment)).toBeLessThan(Math.abs(current.netSentiment));
    });

    it('deve calcular índice EPU baseado em dispersão narrativa', () => {
      const media = new MediaObserver();
      const now = Date.now();

      media.ingestNews({ timestamp: now, headline: 'Bullish breakout imminent', sentiment: 0.8, reach: 0.8 });
      media.ingestNews({ timestamp: now, headline: 'Severe risk of recession', sentiment: -0.8, reach: 0.8 });

      const epu = media.getEpuScore(now);
      expect(epu).toBeGreaterThan(0.5); // High uncertainty
    });
  });

  describe('Wave 3: Analyst Observer', () => {
    it('deve calcular consenso de analistas e divergência de herding lag', () => {
      const analyst = new AnalystObserver();

      analyst.registerAnalystOpinion({ analystId: 'A1', targetPrice: 65000, recommendation: 'BUY' });
      analyst.registerAnalystOpinion({ analystId: 'A2', targetPrice: 63000, recommendation: 'BUY' });
      analyst.registerAnalystOpinion({ analystId: 'A3', targetPrice: 64000, recommendation: 'HOLD' });

      const consensus = analyst.getConsensus();
      expect(consensus.analystsCount).toBe(3);
      expect(consensus.consensusPrice).toBe(64000);
      expect(consensus.buyRatio).toBeCloseTo(0.666, 2);
      expect(consensus.consensusBias).toBe('BULLISH');

      // Market price surging to 70,000 creates herding lag
      const divergence = analyst.getHerdingDivergence(70000);
      expect(divergence.isLagging).toBe(true);
      expect(divergence.herdingLagBps).toBeGreaterThan(500);
    });
  });

  describe('Latency Matrix Engine', () => {
    it('deve gerar matriz de latência 4x4 e calcular ODM (Observer Divergence Metric)', () => {
      const engine = new LatencyMatrix({ divergenceVetoThreshold: 0.60 });

      const matrix = engine.computeMatrix();
      expect(matrix).toHaveProperty('MARKET');
      expect(matrix).toHaveProperty('MEDIA');
      expect(matrix).toHaveProperty('ANALYSTS');
      expect(matrix).toHaveProperty('AUTHORITY');

      // Market reacts faster than authority
      expect(matrix.MARKET.AUTHORITY).toBeGreaterThan(0.9);

      // Low divergence case
      const lowDiv = engine.evaluateDivergence({ MARKET: 0.5, MEDIA: 0.4, ANALYSTS: 0.5, AUTHORITY: 0.3 });
      expect(lowDiv.epistemicVeto).toBe(false);

      // Severe divergence case (Market panic vs Authority calm)
      const highDiv = engine.evaluateDivergence({ MARKET: -0.9, MEDIA: -0.6, ANALYSTS: 0.2, AUTHORITY: 0.8 });
      expect(highDiv.odm).toBeGreaterThan(0.60);
      expect(highDiv.epistemicVeto).toBe(true);
    });
  });
});
