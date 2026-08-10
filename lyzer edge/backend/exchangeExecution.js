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

  async placeOrder(symbol, side, type = 'MARKET', quantity = 0.001, currentPrice = null) {
    const cleanSymbol = validateSymbol(symbol);

    if (!this.apiKey || !this.apiSecret) {
      console.log(`[EXECUTION] ⚠️ Missing credentials. Simulating Spot Order: ${type} ${side} ${quantity} ${cleanSymbol} at ${currentPrice || 'MARKET'}`);
      
      let fillPrice = currentPrice || 0;
      let fundingRateCost = 0;
      
      if (fillPrice > 0) {
        if (type === 'MARKET') {
          // Slippage model: 0.05% slippage on MARKET orders
          const slippageBps = 5; 
          const slippageMultiplier = slippageBps / 10000;
          
          fillPrice = side.toUpperCase() === 'BUY' 
            ? fillPrice * (1 + slippageMultiplier) 
            : fillPrice * (1 - slippageMultiplier);
            
          // Synthetic funding rate / Taker fee simulation per trade (e.g. 0.05% taker fee)
          fundingRateCost = fillPrice * quantity * 0.0005; 
        } else if (type === 'LIMIT') {
          // Zero slippage for LIMIT orders. We act as Maker.
          // Synthetic Maker Rebate simulation (e.g. -0.01% fee meaning we get paid to provide liquidity)
          fundingRateCost = fillPrice * quantity * -0.0001; 
        }
      }

      return {
        orderId: `sim_order_${Date.now()}`,
        status: 'FILLED_MOCK',
        symbol: cleanSymbol,
        side,
        type,
        qty: quantity,
        price: fillPrice,
        fundingRateCost, // Modeled simulated cost (Negative means rebate!)
        transactTime: Date.now(),
        reality_tag: 'SYNTHETIC_REALITY'
      };
    }

    const timestamp = Date.now() - 2000;
    const recvWindow = 60000;

    const cleanSide = encodeURIComponent(side.toUpperCase());
    const cleanType = encodeURIComponent(type.toUpperCase());
    const cleanQty = encodeURIComponent(String(quantity));

    let queryString = `symbol=${encodeURIComponent(cleanSymbol)}&side=${cleanSide}&type=${cleanType}&quantity=${cleanQty}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
    
    if (type === 'LIMIT' && currentPrice) {
      queryString += `&price=${encodeURIComponent(String(currentPrice))}&timeInForce=GTC`;
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

      const data = await response.json();
      if (data.orderId) {
        console.log(`[EXECUTION] ✅ Order success: Binance ID ${data.orderId}`);
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
      return await response.json();
    } catch (e) {
      console.error(`[EXECUTION] ❌ Failed to fetch open orders:`, e);
      return [];
    }
  }
}
