/**
 * Lyzer Edge — UniversalContextEngine
 * Universal Context Engine & Hierarchy Manager.
 * Governs the 6 Context Layers:
 *   1. Global Context (Architecture, Rules, Policies)
 *   2. Organization Context (Org goals, SLAs)
 *   3. Project Context (Active project, deadlines, dependencies)
 *   4. Session Context (Recent actions, active windows, user identity)
 *   5. Task Context (Current active mission or task)
 *   6. Moment Context (Instantaneous state - e.g. analyzing error, planning, debugging)
 */

export const CONTEXT_LAYERS = Object.freeze([
  'GLOBAL',
  'ORGANIZATION',
  'PROJECT',
  'SESSION',
  'TASK',
  'MOMENT'
]);

export class UniversalContextEngine {
  constructor() {
    this._disposed = false;
    this._contextState = new Map();
    CONTEXT_LAYERS.forEach(layer => this._contextState.set(layer, {}));
  }

  /**
   * Updates context data for a specific context layer.
   * @param {'GLOBAL' | 'ORGANIZATION' | 'PROJECT' | 'SESSION' | 'TASK' | 'MOMENT'} layer
   * @param {Record<string, unknown>} payload
   */
  updateContext(layer, payload = {}) {
    this._assertNotDisposed();

    if (!CONTEXT_LAYERS.includes(layer)) {
      throw new Error(`ERR_INVALID_CONTEXT_LAYER: ${layer}. Valid: ${CONTEXT_LAYERS.join(', ')}`);
    }

    const current = this._contextState.get(layer) || {};
    const updated = Object.freeze({ ...current, ...payload, updatedAt: Date.now() });
    this._contextState.set(layer, updated);
    return updated;
  }

  /**
   * Evaluates aggregated multi-layered context snapshot.
   */
  getAggregatedContext() {
    this._assertNotDisposed();

    const snapshot = {};
    CONTEXT_LAYERS.forEach(layer => {
      snapshot[layer.toLowerCase()] = this._contextState.get(layer);
    });

    return Object.freeze({
      ...snapshot,
      activePersona: snapshot.session?.userRole || 'DEVELOPER',
      momentState: snapshot.moment?.state || 'ANALYZING_SYSTEM',
      evaluatedAt: new Date().toISOString()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_UNIVERSAL_CONTEXT_ENGINE_DISPOSED: Universal Context Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._contextState.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
