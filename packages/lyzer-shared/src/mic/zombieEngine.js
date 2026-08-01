/**
 * @fileoverview Zombie Resolution Engine (Deliverable X & Wave 5)
 * Mitigates EPISTEMIC_POSITION_FAILURE by escalating unresolved routed orders.
 */

// Simulated reference to the KillSwitch for system halts.
import { KillSwitch } from '../../../lyzer-constitution/src/eca/killSwitch.js';

export class ZombieEngine {
  constructor() {
    this.trackedOrders = new Map();
    // Maximum time an order can remain ROUTED without ACK.
    this.MAX_ACK_LATENCY_MS = 5000; 
  }

  /**
   * Tracks an order that was just ROUTED by the Gateway.
   * @param {string} orderId 
   * @param {Object} adapter - Used for secondary REST cancel attempts.
   * @param {Object} token - Original permission token.
   */
  trackOrder(orderId, adapter, token) {
    const timeoutHandle = setTimeout(() => {
      this._handleZombieState(orderId, adapter, token);
    }, this.MAX_ACK_LATENCY_MS);

    this.trackedOrders.set(orderId, timeoutHandle);
  }

  /**
   * Called by the Gateway if the order is naturally acknowledged via WS.
   */
  resolveOrder(orderId) {
    if (this.trackedOrders.has(orderId)) {
      clearTimeout(this.trackedOrders.get(orderId));
      this.trackedOrders.delete(orderId);
    }
  }

  /**
   * Escalation Protocol for Zombie Orders.
   * "Unknown Exposure is worse than Known Loss."
   */
  async _handleZombieState(orderId, adapter, token) {
    this.trackedOrders.delete(orderId);
    console.warn(`[ZOMBIE_ENGINE] Order ${orderId} exceeded max latency. State: ZOMBIE`);

    try {
      // Primary Resolution: Attempt to force cancel via secondary channel (Adapter logic).
      await adapter.cancelOrder(orderId, token);
      console.log(`[ZOMBIE_ENGINE] Order ${orderId} secondary cancel SUCCESS. Resolved to CANCELLED.`);
    } catch (err) {
      // Both primary routing AND secondary cancel have failed.
      // We are completely blind to our capital exposure.
      console.error(`[ZOMBIE_ENGINE] Secondary cancel FAILED. Epistemic Position Failure detected!`);
      
      // EPISTEMIC_POSITION_FAILURE = SYSTEMIC EMERGENCY -> SYSTEM_HALT
      KillSwitch.executeHardKill('EPISTEMIC_POSITION_FAILURE');
    }
  }
}

export const zombieEngine = new ZombieEngine();
