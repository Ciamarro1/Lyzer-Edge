export class OperationalChaosEngine {
  constructor() {
    this.failRates = {
      apiOffline: 0.05,
      latencySpike: 0.10,
      clockDrift: 0.05,
      missingData: 0.05,
      invalidCandles: 0.02,
      duplicatedEvents: 0.05
    };
  }

  /**
   * Injerta falhas de latência
   * @param {number} baseLatency - latência original
   * @returns {number} latência modificada
   */
  injectLatency(baseLatency) {
    if (Math.random() < this.failRates.latencySpike) {
      return baseLatency + Math.floor(Math.random() * 5000); // Até 5s de delay
    }
    return baseLatency;
  }

  /**
   * Corrompe o payload de dados do mercado (simulate invalid candles/missing depth)
   */
  corruptMarketData(payload) {
    let newPayload = { ...payload };

    if (Math.random() < this.failRates.apiOffline) {
      throw new Error("NETWORK_DISCONNECT: Binance WS offline");
    }

    if (Math.random() < this.failRates.missingData) {
      delete newPayload.liquidityScore; // Força undefined
    }

    if (Math.random() < this.failRates.invalidCandles) {
      newPayload.close = -1; // Preço impossível
    }

    if (Math.random() < this.failRates.clockDrift) {
      newPayload.timestamp = new Date(Date.now() - 3600000).toISOString(); // 1h atrasado
    }

    return newPayload;
  }

  /**
   * Gera eventos duplicados na fila
   */
  duplicateEvent(payload) {
    if (Math.random() < this.failRates.duplicatedEvents) {
      return [payload, { ...payload, duplicate: true }];
    }
    return [payload];
  }
}
