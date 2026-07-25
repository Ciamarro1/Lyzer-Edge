import { describe, test, expect } from 'vitest';
import { CognitiveEventBus } from '../../src/distributed-runtime/CognitiveEventBus.js';

describe('Fase 13 — CognitiveEventBus Verification', () => {
  test('publishes events to subscribers and stores in immutable Event Store', () => {
    const bus = new CognitiveEventBus();
    const receivedEvents = [];

    bus.subscribe('MarketEvent', (evt) => {
      receivedEvents.push(evt);
    });

    const evt1 = bus.publish('MarketEvent', { symbol: 'BTC-USD', price: 50000 });
    const evt2 = bus.publish('MarketEvent', { symbol: 'ETH-USD', price: 3000 });

    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[0].payload.symbol).toBe('BTC-USD');
    expect(bus.getEventStoreSize()).toBe(2);

    const replayed = bus.replay({ topic: 'MarketEvent' });
    expect(replayed.length).toBe(2);
  });
});
