/**
 * ARL v3.3 Exchange Execution Layer
 * Handles signed REST orders to Binance Testnet or Spot Live endpoints.
 */

import crypto from 'crypto';
import { recordTradeOutcome } from './tradeMemoryRegistry.js';

export class ExchangeExecution {
  constructor(apiKey, apiSecret, isTestnet = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  }

  async placeOrder(symbol, side, type = 'MARKET', quantity = 0.001, intelligenceMetadata = {}) {
    if (!this.apiKey || !this.apiSecret) {
      console.log(`[EXECUTION] ⚠️ Missing credentials. Simulating Spot Order: ${side} ${quantity} ${symbol}`);
      
      const orderData = {
        orderId: `sim_order_${Date.now()}`,
        status: 'FILLED_MOCK',
        symbol,
        side,
        type,
        qty: quantity,
        transactTime: Date.now()
      };

      // --- OIL: Outcome Intelligence Layer ---
      recordTradeOutcome({
        signal: side.toUpperCase(),
        confidence: intelligenceMetadata.confidence || 0,
        causal_state: intelligenceMetadata.causal_state || 'UNKNOWN',
        rdm_state: intelligenceMetadata.rdm_state || 'UNKNOWN',
        expected_outcome: `Expected edge extraction via simulation.`,
        actual_outcome: 'PENDING',
        explanation: 'Trade entered. Awaiting reality resolution via paper trading loop.'
      });

      return orderData;
    }

    const timestamp = Date.now();
    const recvWindow = 5000;

    let queryString = `symbol=${symbol.toUpperCase()}&side=${side.toUpperCase()}&type=${type.toUpperCase()}&quantity=${quantity}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');

    queryString += `&signature=${signature}`;
    const url = `${this.baseUrl}/api/v3/order?${queryString}`;

    console.log(`[EXECUTION] Placing live REST order on ${this.baseUrl}: ${side} ${quantity} ${symbol}...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = await response.json();
      if (data.orderId) {
        console.log(`[EXECUTION] ✅ Order success: Binance ID ${data.orderId}`);
        
        // --- OIL: Outcome Intelligence Layer ---
        recordTradeOutcome({
          signal: side.toUpperCase(),
          confidence: intelligenceMetadata.confidence || 0,
          causal_state: intelligenceMetadata.causal_state || 'UNKNOWN',
          rdm_state: intelligenceMetadata.rdm_state || 'UNKNOWN',
          expected_outcome: `Expected edge extraction via live execution.`,
          actual_outcome: 'PENDING',
          explanation: 'Real trade entered. Awaiting reality resolution via live trading loop.'
        });

        return data;
      } else {
        console.error(`[EXECUTION] ❌ Order placement rejected by exchange:`, data);
        throw new Error(data.msg || 'Exchange order rejection');
      }
    } catch (e) {
      console.error(`[EXECUTION] ❌ HTTP order request failed:`, e);
      throw e;
    }
  }
}
