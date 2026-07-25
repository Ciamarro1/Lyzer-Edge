/**
 * @fileoverview AbstractExchangeProvider (Deliverable W & Wave 2)
 * The definitive interface that all Exchange Adapters must implement.
 * Enforces the rule: "Exchange responses are hostile. Never trust them."
 */

export class AbstractExchangeProvider {
  constructor() {
    if (new.target === AbstractExchangeProvider) {
      throw new Error('[MIC] Cannot instantiate AbstractExchangeProvider directly.');
    }
  }

  /**
   * Translates internal order to exchange-specific REST/WS call.
   * MUST throw or handle its own specific exceptions.
   * MUST NOT leak AxiosError or HTTP status codes back to the Gateway.
   * @param {Object} orderData 
   * @param {Object} permissionToken - Must be verified before execution.
   */
  async submitOrder(orderData, permissionToken) {
    throw new Error('Method submitOrder() must be implemented.');
  }

  /**
   * Translates internal orderId to exchange cancel routine.
   * @param {string} orderId 
   * @param {Object} permissionToken 
   */
  async cancelOrder(orderId, permissionToken) {
    throw new Error('Method cancelOrder() must be implemented.');
  }

  /**
   * Subscribes to market data and forces the output into LyzerEvent.
   * @param {string} symbol 
   * @param {Function} lyzerEventCallback - Callback expecting LyzerEvent instances.
   */
  subscribeData(symbol, lyzerEventCallback) {
    throw new Error('Method subscribeData() must be implemented.');
  }
}
