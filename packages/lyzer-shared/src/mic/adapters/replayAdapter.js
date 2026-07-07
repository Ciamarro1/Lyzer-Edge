/**
 * @fileoverview Replay Adapter (Wave 3)
 * Extends AbstractExchangeProvider. Simulates live exchange via Latency Distribution Model.
 */

import { AbstractExchangeProvider } from './abstractAdapter.js';
import { calculateStochasticLatency } from '../latency/scenarios.js';

export class ReplayAdapter extends AbstractExchangeProvider {
  constructor(scenarioProfile) {
    super();
    this.scenario = scenarioProfile;
    this.simulatedGateway = null; // Set post-instantiation for testing
  }

  async submitOrder(orderData, permissionToken) {
    // 1. Calculate stochastic network latency to simulate "ROUTED -> ACKNOWLEDGED"
    const latencyMs = calculateStochasticLatency(this.scenario);
    
    // Simulate network delay using Promise
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // In a real adapter, this would be an Axios call.
        // Here, we simulate a successful REST submit.
        
        // Let's pretend it always reaches the simulated exchange book.
        // The Gateway's order status will be updated to ROUTED automatically by Gateway logic,
        // but we need to eventually fire 'acknowledgeOrder' to mock the WS returning the ACK.
        
        // We delay the ACK to simulate the exchange matching engine queue.
        if (this.simulatedGateway) {
          setTimeout(() => {
            this.simulatedGateway.acknowledgeOrder(orderData.id);
          }, calculateStochasticLatency(this.scenario)); // A second stochastic delay for WS ACK
        }

        resolve(); // Submit succeeds
      }, latencyMs);
    });
  }

  async cancelOrder(orderId, permissionToken) {
    const latencyMs = calculateStochasticLatency(this.scenario);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulated successful secondary cancellation
        resolve();
      }, latencyMs);
    });
  }

  subscribeData(symbol, lyzerEventCallback) {
    // In Replay, this would attach to a historical tape reader.
    // For this mock, it does nothing active.
  }
}
