/**
 * Lyzer Edge — ObservationEngine
 * Data-to-Observation Pipeline Transformer.
 * Transforms raw data streams into structured observations:
 * Raw Data -> Processing -> Observation -> Knowledge -> Decision -> Action -> Learning
 */

let _obsIdCounter = 0;

export class ObservationEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._observations = [];
  }

  /**
   * Processes raw data input into a structured cognitive observation.
   * @param {string} sourceCategory - e.g. 'MARKET_DATA', 'TELEMETRY', 'AGENT_OUTPUT'
   * @param {Record<string, unknown>} rawData
   */
  processRawData(sourceCategory, rawData = {}) {
    this._assertNotDisposed();

    const observation = Object.freeze({
      observationId: `obs_${Date.now()}_${++_obsIdCounter}`,
      sourceCategory,
      rawDataSummary: Object.freeze({ ...rawData }),
      processedFeatureCount: Object.keys(rawData).length,
      confidence: 0.96,
      realityTag: 'OBSERVED_REALITY',
      timestamp: Date.now(),
      processedAt: new Date().toISOString()
    });

    this._observations.push(observation);

    if (this._eventBus) {
      this._eventBus.publish('observation:created', { observationId: observation.observationId, sourceCategory });
    }

    return observation;
  }

  /**
   * Returns recent observations.
   * @param {number} [limit=20]
   */
  getObservations(limit = 20) {
    this._assertNotDisposed();
    return this._observations.slice(-limit);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_OBSERVATION_ENGINE_DISPOSED: Observation Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._observations = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
