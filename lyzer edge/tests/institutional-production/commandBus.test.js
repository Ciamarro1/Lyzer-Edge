import { describe, test, expect } from 'vitest';
import { CognitiveCommandBus } from '../../src/institutional-production/CognitiveCommandBus.js';

describe('Fase 14 — CognitiveCommandBus Verification', () => {
  test('dispatches command to registered handler and logs command', async () => {
    const bus = new CognitiveCommandBus();

    bus.registerHandler('PromoteStrategyCommand', async (payload) => {
      return { promoted: true, strategy_id: payload.strategy_id };
    });

    const res = await bus.dispatch('PromoteStrategyCommand', { strategy_id: 'SMC_V1' });

    expect(res.status).toBe('HANDLED');
    expect(res.result.promoted).toBe(true);
    expect(bus.getCommandLog().length).toBe(1);
  });
});
