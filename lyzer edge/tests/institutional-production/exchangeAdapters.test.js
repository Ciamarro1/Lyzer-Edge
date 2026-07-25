import { describe, test, expect } from 'vitest';
import { MockExchangeAdapter, BinanceAdapter, BybitAdapter, KrakenAdapter } from '../../src/institutional-production/ExchangeAdapter.js';

describe('Fase 14 — ExchangeAdapters Verification', () => {
  test('connects and places order using MockExchangeAdapter', async () => {
    const adapter = new MockExchangeAdapter();
    const conn = await adapter.connect();

    expect(conn.status).toBe('CONNECTED');
    expect(conn.exchange).toBe('MOCK_EXCHANGE');

    const order = await adapter.placeOrder({ symbol: 'BTC-USD', side: 'BUY', quantity: 0.5, price: 50000 });
    expect(order.status).toBe('FILLED_MOCK');
    expect(order.quantity).toBe(0.5);

    const balances = await adapter.getBalances();
    expect(balances.USDT).toBe(100000.0);
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
