/**
 * Lyzer Edge — FeatureLifecycleManager
 * Feature Lifecycle & State Transition Manager.
 * Governs the 7 Feature Lifecycle Stages:
 *   PROPOSAL -> PROTOTYPE -> VALIDATION -> BETA -> STABLE -> DEPRECATED -> REMOVED
 */

export const FEATURE_LIFECYCLE_STAGES = Object.freeze([
  'PROPOSAL',
  'PROTOTYPE',
  'VALIDATION',
  'BETA',
  'STABLE',
  'DEPRECATED',
  'REMOVED'
]);

export class FeatureLifecycleManager {
  constructor() {
    this._disposed = false;
    this._features = new Map();
  }

  /**
   * Registers a new feature proposal.
   * @param {string} featureId
   * @param {string} name
   */
  registerFeature(featureId, name) {
    this._assertNotDisposed();

    const record = {
      featureId,
      name,
      stage: 'PROPOSAL',
      history: [{ stage: 'PROPOSAL', timestamp: Date.now() }],
      registeredAt: new Date().toISOString()
    };

    this._features.set(featureId, record);
    return Object.freeze(JSON.parse(JSON.stringify(record)));
  }

  /**
   * Transitions feature stage.
   * @param {string} featureId
   * @param {string} targetStage
   */
  transitionStage(featureId, targetStage) {
    this._assertNotDisposed();

    const feature = this._features.get(featureId);
    if (!feature) throw new Error(`ERR_FEATURE_NOT_FOUND: Feature '${featureId}' not found.`);

    if (!FEATURE_LIFECYCLE_STAGES.includes(targetStage)) {
      throw new Error(`ERR_INVALID_FEATURE_STAGE: ${targetStage}. Valid: ${FEATURE_LIFECYCLE_STAGES.join(', ')}`);
    }

    feature.stage = targetStage;
    feature.history.push({ stage: targetStage, timestamp: Date.now() });

    return Object.freeze(JSON.parse(JSON.stringify(feature)));
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_FEATURE_LIFECYCLE_MANAGER_DISPOSED: Feature Lifecycle Manager is disposed');
  }

  dispose() {
    this._disposed = true;
    this._features.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
