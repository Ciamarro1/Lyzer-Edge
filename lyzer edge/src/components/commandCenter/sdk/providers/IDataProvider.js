import { RealityTags, ProviderHealthStatus } from '../types.js';

/**
 * Universal Data Provider Contract (RFC-002)
 * Abstract base class defining the reality boundary for the Command Center Runtime.
 * All providers MUST extend this class and pass the IDataProviderComplianceSuite.
 */
export class IDataProvider {
  /**
   * @param {string} id - Unique identifier for the provider instance
   * @param {string} realityTag - Reality context (from RealityTags)
   */
  constructor(id, realityTag) {
    if (new.target === IDataProvider) {
      throw new Error('[ERR_ABSTRACT_CLASS] Cannot instantiate abstract class IDataProvider directly.');
    }
    if (!id || typeof id !== 'string') {
      throw new Error('[ERR_INVALID_PROVIDER] Provider must declare an id.');
    }
    if (!Object.values(RealityTags).includes(realityTag)) {
      throw new Error(`[ERR_INVALID_REALITY_TAG] Unknown realityTag: ${realityTag}`);
    }

    this._id = id;
    this._realityTag = realityTag;
  }

  get id() {
    return this._id;
  }

  get realityTag() {
    return this._realityTag;
  }

  /**
   * Initializes the provider (e.g., establishing WebSocket connections, loading files).
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.connect() must be implemented.');
  }

  /**
   * Gracefully shuts down the provider, disposing all internal subscriptions.
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.disconnect() must be implemented.');
  }

  /**
   * Synchronously returns the current known state of the system.
   * @returns {import('../types.js').RuntimeSnapshot}
   */
  getSnapshot() {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.getSnapshot() must be implemented.');
  }

  /**
   * Subscribes to real-time events on a specific topic.
   * @param {string} topic 
   * @param {function} callback 
   * @returns {{ dispose: function }} Disposable object
   */
  subscribe(topic, callback) {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.subscribe() must be implemented.');
  }

  /**
   * Retrieves historical or aggregated market data.
   * @param {Object} request - MarketDataRequest { symbol, timeframe }
   * @returns {Object} MarketDataResponse
   */
  getMarketData(request) {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.getMarketData() must be implemented.');
  }

  /**
   * Retrieves the causal integration graph/timeline.
   * @param {Object} request - TimelineRequest { limit, rootId }
   * @returns {Object[]} CausalTimeline
   */
  getCausalTimeline(request) {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.getCausalTimeline() must be implemented.');
  }

  /**
   * Retrieves the constitutional court audit trail.
   * @returns {Object[]} AuditRecord[]
   */
  getCourtAuditLog() {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.getCourtAuditLog() must be implemented.');
  }

  /**
   * Retrieves the current health status of the provider.
   * @returns {Object} ProviderHealth { status: ProviderHealthStatus, latencyMs, lastUpdate, dataAgeMs, errors }
   */
  healthCheck() {
    throw new Error('[ERR_NOT_IMPLEMENTED] IDataProvider.healthCheck() must be implemented.');
  }
}
