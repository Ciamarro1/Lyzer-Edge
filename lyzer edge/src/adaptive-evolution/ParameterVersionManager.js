/**
 * @fileoverview ParameterVersionManager — Phase 7.3.2 (ADR-022)
 *
 * Git-like versioning for cognitive parameters with:
 *   1. Cognitive Snapshot — immutable capture of ALL parameters at a point in time
 *   2. Diff — comparison between two snapshots
 *   3. Lineage — directed ancestry graph between versions
 */
export class ParameterVersionManager {
  constructor() {
    this.snapshots = new Map();
    this.lineage = []; // { from, to, reason, timestamp }
  }

  /**
   * Creates an immutable cognitive snapshot of all parameters.
   *
   * @param {string} version - Version tag (e.g., 'v1.1.0')
   * @param {Object} parameters - Map of fully qualified parameter names to values
   * @param {string} [reason] - Reason for this snapshot
   * @returns {Object} CognitiveSnapshot
   */
  createSnapshot(version, parameters, reason) {
    if (!version || !parameters || Object.keys(parameters).length === 0) {
      throw new Error('version and non-empty parameters are required');
    }

    const snapshot = {
      snapshot_id: `snap_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      version,
      parameters: { ...parameters },
      parameter_count: Object.keys(parameters).length,
      reason: reason || 'COGNITIVE_SNAPSHOT',
      created_at: Date.now()
    };

    this.snapshots.set(version, snapshot);
    return snapshot;
  }

  /**
   * Computes the diff between two snapshots.
   *
   * @param {string} fromVersion - Base version
   * @param {string} toVersion - Target version
   * @returns {Object} Diff result with changes and unchanged count
   */
  diff(fromVersion, toVersion) {
    const fromSnap = this.snapshots.get(fromVersion);
    const toSnap = this.snapshots.get(toVersion);

    if (!fromSnap) throw new Error(`Snapshot ${fromVersion} not found`);
    if (!toSnap) throw new Error(`Snapshot ${toVersion} not found`);

    const changes = [];
    const allKeys = new Set([...Object.keys(fromSnap.parameters), ...Object.keys(toSnap.parameters)]);
    let unchangedCount = 0;

    for (const key of allKeys) {
      const fromVal = fromSnap.parameters[key];
      const toVal = toSnap.parameters[key];

      if (fromVal === undefined && toVal !== undefined) {
        changes.push({ parameter: key, type: 'ADDED', from: null, to: toVal });
      } else if (fromVal !== undefined && toVal === undefined) {
        changes.push({ parameter: key, type: 'REMOVED', from: fromVal, to: null });
      } else if (fromVal !== toVal) {
        const deltaPct = fromVal !== 0 ? Number((((toVal - fromVal) / fromVal) * 100).toFixed(2)) : 0;
        changes.push({ parameter: key, type: 'MODIFIED', from: fromVal, to: toVal, delta_pct: deltaPct });
      } else {
        unchangedCount++;
      }
    }

    return {
      from: fromVersion,
      to: toVersion,
      changes,
      changes_count: changes.length,
      unchanged_count: unchangedCount,
      computed_at: Date.now()
    };
  }

  /**
   * Records an ancestry link between two versions.
   */
  recordLineage(fromVersion, toVersion, reason) {
    this.lineage.push({
      from: fromVersion,
      to: toVersion,
      reason: reason || 'PROMOTION',
      timestamp: Date.now()
    });
  }

  /**
   * Returns the full lineage graph.
   */
  getLineage() {
    return [...this.lineage];
  }

  getSnapshot(version) {
    return this.snapshots.get(version) || null;
  }

  getAllSnapshots() {
    return [...this.snapshots.values()];
  }
}
