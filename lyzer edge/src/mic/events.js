/**
 * @fileoverview Market Event Contract (Deliverable S & Wave 4)
 * Strict validation and definition of all events crossing the MIC boundary.
 */

export const EVENT_TYPES = {
  PRICE_TICK: 'PRICE_TICK',
  ORDER_BOOK_DELTA: 'ORDER_BOOK_DELTA',
  FILL: 'FILL',
  ORDER_ACKNOWLEDGED: 'ORDER_ACKNOWLEDGED',
  ORDER_REJECTED: 'ORDER_REJECTED'
};

export class LyzerEvent {
  /**
   * Universal data format. Adapters must convert raw exchange JSON into this structure.
   * Any exchange-specific properties (e.g., binance update IDs) are explicitly dropped here.
   */
  constructor({ eventType, exchangeTimestamp, symbol, price = null, volume = null, side = null, orderId = null }) {
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      throw new Error(`[MIC] Invalid eventType: ${eventType}`);
    }

    this.eventType = eventType;
    this.systemTimestamp = Date.now();
    this.exchangeTimestamp = exchangeTimestamp;
    this.symbol = symbol;
    this.price = price;
    this.volume = volume;
    this.side = side;
    this.orderId = orderId; // Internal order ID, NEVER exchange's native ID.

    // Enforce Reality Variables stability. The contract is immutable.
    Object.freeze(this);
  }
}
