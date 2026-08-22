/**
 * ARL v3.3 Exchange Execution Layer
 * Handles signed REST orders to Binance Testnet or Spot Live endpoints.
 */

import crypto from 'crypto';
import { safeFetch, validateSymbol } from './utils/ssrfGuard.js';

export class ExchangeExecution {
  constructor(apiKey, apiSecret, isTestnet = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  }

  async placeOrder(symbol, side, type = 'MARKET', quantity = 0.001, currentPrice = null, rules = { lotDecimals: 3, priceDecimals: 2 }) {
    // Dynamic precision based on provided rules (fallback to old behavior if not provided)
    const cleanQty = encodeURIComponent(String(Number(quantity).toFixed(rules.lotDecimals)));
    const cleanSymbol = validateSymbol(symbol);

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(`[EXECUTION] ❌ Cannot execute order for ${cleanSymbol}: BINANCE_API_KEY and BINANCE_API_SECRET are required.`);
    }

    // A2 fix: Removed the dangerous - 2000 timestamp hack which sent orders from the past
    const timestamp = Date.now();
    // A2 fix: Reduced recvWindow from massive 60s to standard 5s to prevent network delay slippage execution
    const recvWindow = 5000; 

    const cleanSide = encodeURIComponent(side.toUpperCase());
    const cleanType = encodeURIComponent(type.toUpperCase());
    const roundedQty = encodeURIComponent(String(Number(quantity).toFixed(rules.lotDecimals)));

    let queryString = `symbol=${encodeURIComponent(cleanSymbol)}&side=${cleanSide}&type=${cleanType}&quantity=${roundedQty}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
    
    if (type === 'LIMIT' && currentPrice) {
      // Dynamic price rounding
      queryString += `&price=${encodeURIComponent(String(Number(currentPrice).toFixed(rules.priceDecimals)))}&timeInForce=GTC`;
    }
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');

    queryString += `&signature=${encodeURIComponent(signature)}`;
    const url = `${this.baseUrl}/api/v3/order?${queryString}`;

    console.log(`[EXECUTION] Placing live REST order on ${this.baseUrl}: ${side} ${quantity} ${cleanSymbol}...`);

    try {
      const response = await safeFetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        redirect: 'error'
      });

      if (!response.ok) {
        if (response.status === 429 || response.status === 418) {
          const retryAfter = response.headers.get('Retry-After');
          throw new Error(`[RATE_LIMIT] HTTP ${response.status}. Retry after: ${retryAfter || 'unknown'}s. Do not spam.`);
        }
        let errorBody = '';
        try { errorBody = await response.text(); } catch(e) {}
        throw new Error(`HTTP Error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      if (data.orderId) {
        if (data.status === 'PARTIALLY_FILLED') {
           console.warn(`[EXECUTION] ⚠️ Order PARTIALLY FILLED for ${data.orderId}. Quantity executed: ${data.executedQty} / ${data.origQty}`);
           data.isPartial = true;
        } else {
           console.log(`[EXECUTION] ✅ Order success: Binance ID ${data.orderId}`);
        }
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

  async getAccount() {
    if (!this.apiKey || !this.apiSecret) return { balances: [] };
    const timestamp = Date.now() - 2000;
    const recvWindow = 60000;
    let queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    queryString += `&signature=${encodeURIComponent(signature)}`;
    const url = `${this.baseUrl}/api/v3/account?${queryString}`;
    try {
      const response = await safeFetch(url, {
        method: 'GET',
        headers: { 'X-MBX-APIKEY': this.apiKey }
      });
      if (!response.ok) {
        let errStr = '';
        try { errStr = await response.text(); } catch(e) {}
        console.error(`[EXECUTION] ❌ Failed to fetch account HTTP ${response.status}:`, errStr);
        return { balances: [] };
      }
      return await response.json();
    } catch (e) {
      console.error(`[EXECUTION] ❌ Failed to fetch account:`, e);
      return { balances: [] };
    }
  }

  async getOpenOrders(symbol = null) {
    if (!this.apiKey || !this.apiSecret) return [];
    const timestamp = Date.now() - 2000;
    const recvWindow = 60000;
    let queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    if (symbol) {
      queryString = `symbol=${encodeURIComponent(validateSymbol(symbol))}&${queryString}`;
    }
    const signature = crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    queryString += `&signature=${encodeURIComponent(signature)}`;
    const url = `${this.baseUrl}/api/v3/openOrders?${queryString}`;
    try {
      const response = await safeFetch(url, {
        method: 'GET',
        headers: { 'X-MBX-APIKEY': this.apiKey }
      });
      if (!response.ok) {
        let errStr = '';
        try { errStr = await response.text(); } catch(e) {}
        console.error(`[EXECUTION] ❌ Failed to fetch open orders HTTP ${response.status}:`, errStr);
        return [];
      }
      return await response.json();
    } catch (e) {
      console.error(`[EXECUTION] ❌ Failed to fetch open orders:`, e);
      return [];
    }
  }
}
