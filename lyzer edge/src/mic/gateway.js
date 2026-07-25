/**
 * @fileoverview Gateway Runtime Specification (Deliverable V & Wave 1)
 * The central operational hub of the MIC. Routes between Court, Adapters, and the Zombie Engine.
 */

import { verifyToken } from '../eca/permission.js';
import { zombieEngine } from './zombieEngine.js';

export class MICGateway {
  constructor(adapter) {
    this.adapter = adapter; // Implementation of AbstractExchangeProvider
    this.orderStateMap = new Map(); // Internal order state tracking
  }

  /**
   * Translates the internal PermissionToken into a physical market routing.
   * @param {Object} orderData 
   * @param {PermissionToken} token 
   */
  async routeOrder(orderData, token) {
    if (!verifyToken(token) || !token.granted) {
      throw new Error('[MIC_GATEWAY] Rejected: Invalid or Denied PermissionToken.');
    }

    // Rate Limiting / Permission Storm Protection
    // (A real implementation would use a token bucket or queue here)
    
    // Log state: SUBMITTED_TO_MIC
    this.orderStateMap.set(orderData.id, { status: 'SUBMITTED_TO_MIC', timestamp: Date.now() });

    try {
      // Pass to adapter. The adapter is agnostic.
      await this.adapter.submitOrder(orderData, token);
      
      // If we reach here, the adapter has successfully sent it over the wire.
      this.orderStateMap.set(orderData.id, { status: 'ROUTED', timestamp: Date.now() });
      
      // Start Zombie tracking. If an ACK doesn't come back, the Zombie Engine will intervene.
      zombieEngine.trackOrder(orderData.id, this.adapter, token);
      
    } catch (e) {
      // Exchange Failure or Adapter Exception
      this.orderStateMap.set(orderData.id, { status: 'EXCHANGE_REJECTED', reason: e.message });
      // Emit LyzerEvent indicating rejection
    }
  }

  /**
   * Invoked by Adapters when an exchange ACK is received via WS/REST polling.
   */
  acknowledgeOrder(internalOrderId) {
    const state = this.orderStateMap.get(internalOrderId);
    if (state && state.status === 'ROUTED') {
      state.status = 'EXCHANGE_ACKNOWLEDGED';
      this.orderStateMap.set(internalOrderId, state);
      zombieEngine.resolveOrder(internalOrderId);
    }
  }
}
