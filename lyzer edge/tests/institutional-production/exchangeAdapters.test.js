import { describe, test, expect } from 'vitest';
import { MockExchangeAdapter, BinanceAdapter, BybitAdapter, KrakenAdapter } from '../../src/institutional-production/ExchangeAdapter.js';

describe('Fase 14 — ExchangeAdapters Verification', () => {
  test('blocks instantiation of MockExchangeAdapter in production', () => {
    expect(() => new MockExchangeAdapter()).toThrow('MockExchangeAdapter is strictly forbidden');
  });

  test('instantiates Binance, Bybit, and Kraken adapters with standard interface', async () => {
    const binance = new BinanceAdapter();
    const bybit = new BybitAdapter();
    const kraken = new KrakenAdapter();

    expect((await binance.connect()).exchange).toBe('BINANCE');
    expect((await bybit.connect()).exchange).toBe('BYBIT');
    expect((await kraken.connect()).exchange).toBe('KRAKEN');
  });
});
