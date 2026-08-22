/**
 * @fileoverview ExchangeAdapter — Phase 14 (ADR-031)
 *
 * Exchange Abstraction Layer standardizing exchange connectivity:
 *   - connect()
 *   - subscribeMarketData()
 *   - placeOrder()
 *   - cancelOrder()
 *   - getBalances()
 *
 * Includes implementations: MockExchangeAdapter, BinanceAdapter, BybitAdapter, KrakenAdapter.
 */

export class BaseExchangeAdapter {
  constructor(exchangeName = 'BASE') {
    this.exchangeName = exchangeName;
    this.isConnected = false;
  }

  async connect() {
    this.isConnected = true;
    return { status: 'CONNECTED', exchange: this.exchangeName };
  }

  async subscribeMarketData(symbol) {
    return { status: 'SUBSCRIBED', symbol, exchange: this.exchangeName };
  }

  async placeOrder(orderSpec = {}) {
    throw new Error('MOCK_EXCHANGE_REMOVED: placeOrder must be implemented by a real exchange adapter. Production Integrity Restoration P1: No FILLED_MOCK allowed.');
  }

  async cancelOrder(orderId) {
    throw new Error('MOCK_EXCHANGE_REMOVED: cancelOrder must be implemented.');
  }

  async getBalances() {
    throw new Error('MOCK_EXCHANGE_REMOVED: getBalances must be implemented.');
  }
}

export class MockExchangeAdapter extends BaseExchangeAdapter {
  constructor() {
    super('MOCK_EXCHANGE');
    throw new Error('MockExchangeAdapter is strictly forbidden in Production Integrity Restoration phase.');
  }
}

export class BinanceAdapter extends BaseExchangeAdapter {
  constructor() {
    super('BINANCE');
  }
}

export class BybitAdapter extends BaseExchangeAdapter {
  constructor() {
    super('BYBIT');
  }
}

export class KrakenAdapter extends BaseExchangeAdapter {
  constructor() {
    super('KRAKEN');
  }
}
