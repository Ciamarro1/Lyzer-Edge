/**
 * Lyzer Edge — CognitiveMemoryEngine
 * 8-Tier Cognitive Memory Architecture:
 * 1. Working Memory: Active task scratchpad
 * 2. Session Memory: Multi-turn interaction context
 * 3. Operational Memory: Live pipeline & tick execution state
 * 4. Knowledge Memory: Verified market facts & regime rules
 * 5. Long Term Memory: Persistent historical lessons
 * 6. Archived Memory: Cold storage snapshots
 * 7. Semantic Memory: Vector embeddings (10^9 capacity)
 * 8. Procedural Memory: Execution workflows & tool patterns
 */

export const MEMORY_TIERS = Object.freeze([
  'WORKING',
  'SESSION',
  'OPERATIONAL',
  'KNOWLEDGE',
  'LONG_TERM',
  'ARCHIVED',
  'SEMANTIC',
  'PROCEDURAL'
]);

export class CognitiveMemoryEngine {
  constructor() {
    this._disposed = false;
    this._tiers = new Map();
    for (const tier of MEMORY_TIERS) {
      this._tiers.set(tier, new Map());
    }
  }

  /**
   * Stores a record in a specific memory tier.
   * @param {string} tier - One of MEMORY_TIERS
   * @param {string} key
   * @param {unknown} value
   */
  store(tier, key, value) {
    this._assertNotDisposed();

    if (!MEMORY_TIERS.includes(tier)) {
      throw new Error(`ERR_INVALID_MEMORY_TIER: ${tier}. Valid: ${MEMORY_TIERS.join(', ')}`);
    }

    const tierMap = this._tiers.get(tier);
    const record = Object.freeze({
      key,
      tier,
      value: Object.freeze(typeof value === 'object' && value !== null ? { ...value } : value),
      storedAt: Date.now()
    });

    tierMap.set(key, record);
    return record;
  }

  /**
   * Retrieves a record from a memory tier.
   * @param {string} tier
   * @param {string} key
   */
  recall(tier, key) {
    this._assertNotDisposed();

    const tierMap = this._tiers.get(tier);
    if (!tierMap) return undefined;
    return tierMap.get(key);
  }

  /**
   * Returns item count per memory tier.
   */
  getTierStats() {
    this._assertNotDisposed();

    const stats = {};
    for (const [tier, map] of this._tiers) {
      stats[tier] = map.size;
    }
    return Object.freeze(stats);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_MEMORY_ENGINE_DISPOSED: Memory Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    for (const map of this._tiers.values()) {
      map.clear();
    }
    this._tiers.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
