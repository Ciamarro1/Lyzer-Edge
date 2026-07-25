import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDataProvider } from '../../../src/components/commandCenter/sdk/providers/IDataProvider.js';

/**
 * Universal Data Provider Compliance Suite
 * 
 * Enforces the institutional RFC-002 contract for all data providers.
 * 
 * @param {string} providerName - Name for the test suite description
 * @param {function} providerFactory - Function that returns an initialized provider instance
 * @param {string} expectedRealityTag - The RealityTag the provider must declare
 */
export function runDataProviderComplianceSuite(providerName, providerFactory, expectedRealityTag) {
  describe(`IDataProvider Compliance Suite: ${providerName}`, () => {
    let provider;

    beforeEach(async () => {
      provider = await providerFactory();
    });

    afterEach(async () => {
      if (provider) {
        await provider.disconnect();
      }
    });

    it('✓ implementa interface IDataProvider', () => {
      expect(provider).toBeInstanceOf(IDataProvider);
      expect(typeof provider.connect).toBe('function');
      expect(typeof provider.disconnect).toBe('function');
      expect(typeof provider.getSnapshot).toBe('function');
      expect(typeof provider.subscribe).toBe('function');
      expect(typeof provider.getMarketData).toBe('function');
      expect(typeof provider.getCausalTimeline).toBe('function');
      expect(typeof provider.getCourtAuditLog).toBe('function');
      expect(typeof provider.healthCheck).toBe('function');
    });

    it(`✓ possui realityTag esperado (${expectedRealityTag})`, () => {
      expect(provider.realityTag).toBe(expectedRealityTag);
      expect(provider.id).toBeDefined();
      expect(typeof provider.id).toBe('string');
    });

    it('✓ expõe healthCheck() retornando ProviderHealth válido', () => {
      const health = provider.healthCheck();
      expect(health).toBeDefined();
      expect(['HEALTHY', 'DEGRADED', 'OFFLINE']).toContain(health.status);
      expect(typeof health.latencyMs).toBe('number');
      expect(typeof health.lastUpdate).toBe('number');
      expect(typeof health.dataAgeMs).toBe('number');
      expect(typeof health.errors).toBe('number');
    });

    it('✓ getSnapshot válido (retorna RuntimeSnapshot)', () => {
      const snapshot = provider.getSnapshot();
      expect(snapshot).toBeDefined();
      expect(typeof snapshot).toBe('object');
      // Sub-implementations might have more strict assertions on snapshot contents
    });

    it('✓ subscribe retorna Disposable e dispose remove listeners', () => {
      const cb = vi.fn();
      const sub = provider.subscribe('test:topic', cb);
      
      expect(sub).toBeDefined();
      expect(typeof sub.dispose).toBe('function');

      // Emulate an event (if the provider supports manual emission for tests)
      if (typeof provider._emit === 'function') {
        provider._emit('test:topic', { data: 1 });
        expect(cb).toHaveBeenCalledTimes(1);

        sub.dispose();
        provider._emit('test:topic', { data: 2 });
        expect(cb).toHaveBeenCalledTimes(1); // Should not increase
      }
    });

    it('✓ não vaza listeners (disconnect remove inscrições residuais)', async () => {
      const cb = vi.fn();
      const sub = provider.subscribe('test:topic', cb);
      
      await provider.disconnect();
      
      if (typeof provider._emit === 'function') {
        provider._emit('test:topic', { data: 1 });
        expect(cb).toHaveBeenCalledTimes(0); // Should be disconnected
      }
    });

    it('✓ mantém timestamp monotônico no getSnapshot', async () => {
      const snap1 = provider.getSnapshot();
      await new Promise(r => setTimeout(r, 10)); // tiny delay
      // For static mocks, this might just be equal. It should never go backwards.
      if (typeof provider.tick === 'function') provider.tick();
      const snap2 = provider.getSnapshot();
      
      const time1 = snap1.timestamp || 0;
      const time2 = snap2.timestamp || 0;
      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });
}
