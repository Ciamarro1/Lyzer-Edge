import { describe, test, expect } from 'vitest';
import { DependencyContainer } from '../../src/distributed-runtime/DependencyContainer.js';

describe('Fase 13 — DependencyContainer Verification', () => {
  test('registers and resolves singleton services and lazy factories', () => {
    const container = new DependencyContainer();

    container.register('ConfigService', { env: 'PRODUCTION', maxCapital: 100000 });
    container.registerFactory('CustomEngine', (c) => {
      const cfg = c.resolve('ConfigService');
      return { initializedWith: cfg.env };
    });

    const cfg = container.resolve('ConfigService');
    expect(cfg.env).toBe('PRODUCTION');

    const custom = container.resolve('CustomEngine');
    expect(custom.initializedWith).toBe('PRODUCTION');
  });
});
