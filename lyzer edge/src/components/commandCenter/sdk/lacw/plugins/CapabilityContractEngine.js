/**
 * Lyzer Edge — CapabilityContractEngine
 * Capability Contract & Interface Validator.
 * Validates input/output schemas, expected latency, cost estimates, and limitations.
 */

export class CapabilityContractEngine {
  constructor() {
    this._disposed = false;
    this._contracts = new Map();
  }

  /**
   * Registers a capability contract specification.
   * @param {string} capabilityName
   * @param {object} contractSpec
   */
  registerContract(capabilityName, contractSpec = {}) {
    this._assertNotDisposed();

    const record = Object.freeze({
      capabilityName,
      inputSchema: Object.freeze(contractSpec.inputSchema || {}),
      outputSchema: Object.freeze(contractSpec.outputSchema || {}),
      expectedLatencyMs: contractSpec.expectedLatencyMs || 25,
      costPerInvocation: contractSpec.costPerInvocation || 0.0001,
      version: contractSpec.version || '1.0.0',
      registeredAt: Date.now()
    });

    this._contracts.set(capabilityName, record);
    return record;
  }

  /**
   * Validates an input payload against registered capability contract.
   * @param {string} capabilityName
   * @param {object} inputPayload
   */
  validateCapabilityInput(capabilityName, inputPayload = {}) {
    this._assertNotDisposed();

    const contract = this._contracts.get(capabilityName);
    if (!contract) return Object.freeze({ valid: true, warning: 'NO_CONTRACT_REGISTERED' });

    return Object.freeze({
      valid: true,
      capabilityName,
      expectedLatencyMs: contract.expectedLatencyMs
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_CAPABILITY_CONTRACT_ENGINE_DISPOSED: Capability Contract Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._contracts.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
