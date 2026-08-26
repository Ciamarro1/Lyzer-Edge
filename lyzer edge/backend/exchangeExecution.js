/**
 * ARL v3.3 Exchange Execution Layer
 * Handles signed REST orders to Binance Testnet or Spot Live endpoints.
 */

import crypto from 'crypto';
import { safeFetch, validateSymbol } from './utils/ssrfGuard.js';
import { verifyToken, PermissionToken } from '../../packages/lyzer-constitution/src/eca/permission.js';

export class ExchangeExecution {
  constructor(apiKey, apiSecret, isTestnet = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  }

  async placeOrder(symbol, side, type = 'MARKET', quantity = 0.001, currentPrice = null, rules = { lotDecimals: 3, priceDecimals: 2 }, permissionToken = null) {
    let token = permissionToken;
    let effectiveRules = rules;

    // Polymorphic handling if rules was omitted or passed directly as token
    if (rules && (rules instanceof PermissionToken || rules.signature || rules.granted !== undefined || typeof rules._signToken === 'function')) {
      token = rules;
      effectiveRules = { lotDecimals: 3, priceDecimals: 2 };
    }

    // =========================================================================
    // PORTÃO 3: PHYSICAL ADAPTER FAIL-CLOSED CONSTITUTIONAL GATE
    // =========================================================================
    if (!token) {
      throw new Error('[PHYSICAL_GATE_VIOLATION] Missing permissionToken. Execution blocked at physical boundary.');
    }

    if (!verifyToken(token)) {
      throw new Error('[PHYSICAL_GATE_VIOLATION] Invalid token signature. Cryptographic HMAC verification failed.');
    }

    if (token.granted !== true) {
      throw new Error(`[PHYSICAL_GATE_VIOLATION] Token not granted (${token.reason || 'DENIED'}). Execution blocked at physical boundary.`);
    }

    const tokenAgeMs = Date.now() - (token.timestamp || 0);
    if (tokenAgeMs > 10000 || tokenAgeMs < -1000) {
      throw new Error(`[PHYSICAL_GATE_VIOLATION] Stale/expired permissionToken (age: ${tokenAgeMs}ms > 10000ms max freshness window). Execution aborted.`);
    }

    // Dynamic precision based on provided rules (fallback to default 3 decimals if not provided)
    const lotDec = (effectiveRules && typeof effectiveRules.lotDecimals === 'number') ? effectiveRules.lotDecimals : 3;
    const cleanQty = encodeURIComponent(String(Number(quantity).toFixed(lotDec)));
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

    let queryString = `symbol=${encodeURIComponent(cleanSymbol)}&side=${cleanSide}&type=${cleanType}&quantity=${cleanQty}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
    
    if (type === 'LIMIT' && currentPrice) {
      const priceDec = (effectiveRules && typeof effectiveRules.priceDecimals === 'number') ? effectiveRules.priceDecimals : 2;
      queryString += `&price=${encodeURIComponent(String(Number(currentPrice).toFixed(priceDec)))}&timeInForce=GTC`;
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

  async cancelOpenOrders(symbol) {
    if (!this.apiKey || !this.apiSecret) return { success: false, message: 'Missing API keys' };
    const cleanSymbol = validateSymbol(symbol);
    const timestamp = Date.now();
    const recvWindow = 5000;
    let queryString = `symbol=${encodeURIComponent(cleanSymbol)}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    queryString += `&signature=${encodeURIComponent(signature)}`;
    const url = `${this.baseUrl}/api/v3/openOrders?${queryString}`;
    try {
      const response = await safeFetch(url, {
        method: 'DELETE',
        headers: { 'X-MBX-APIKEY': this.apiKey }
      });
      if (!response.ok) {
        let errStr = '';
        try { errStr = await response.text(); } catch(e) {}
        console.error(`[EXECUTION] ❌ Failed to cancel open orders for ${cleanSymbol} HTTP ${response.status}:`, errStr);
        return { success: false, error: errStr };
      }
      return await response.json();
    } catch (e) {
      console.error(`[EXECUTION] ❌ Failed to cancel open orders for ${cleanSymbol}:`, e);
      return { success: false, error: e.message };
    }
  }
}
