/**
 * Lyzer Edge Command Center v2 — Read-Only Data Provider (ETAPA 2)
 * Coordinates validation, reality tag separation, and forensic lineage.
 * Maintains strict segregation between OBSERVED_REALITY and SYNTHETIC_REALITY.
 */

import { metricValidator } from './metricValidator.js';
import { realityTagValidator } from './realityTagValidator.js';
import { lineageVerifier } from './lineageVerifier.js';
import { securityGuard } from './dashboardSecurityGuard.js';

export class DashboardDataProvider {
  constructor() {
    this.observedStore = new Map();
    this.syntheticStore = new Map();
    this.errorLogs = [];
  }

  /**
   * Ingests read-only telemetry from backend streams.
   * Enforces that OBSERVED_REALITY and SYNTHETIC_REALITY are never mixed.
   * @param {Array|Object} dataBatch
   * @returns {Object} { success: boolean, ingestedCount: number, error?: string, veto?: string }
   */
  ingest(dataBatch) {
    // 1. Validate reality tags (no mixing allowed in a single ingestion context)
    const tagValidation = realityTagValidator.validate(dataBatch);
    if (!tagValidation.valid) {
      if (tagValidation.veto) {
        securityGuard.inspect({
          method: 'POST',
          action: 'INGEST_MIXED_REALITY',
          source: 'DataIngestionLayer'
        });
      }
      this.errorLogs.push({ timestamp: new Date().toISOString(), error: tagValidation.error });
      return { success: false, ingestedCount: 0, error: tagValidation.error, veto: tagValidation.veto };
    }

    const items = Array.isArray(dataBatch) ? dataBatch : [dataBatch];
    let count = 0;

    for (const item of items) {
      // 2. Validate metric schema
      const schemaValidation = metricValidator.validate(item);
      if (!schemaValidation.valid) {
        this.errorLogs.push({ timestamp: new Date().toISOString(), error: schemaValidation.error });
        continue;
      }

      // 3. Verify forensic lineage if hash is present
      if (item.hash || item.sha256) {
        const lineageValidation = lineageVerifier.verify(item);
        if (!lineageValidation.valid) {
          this.errorLogs.push({ timestamp: new Date().toISOString(), error: lineageValidation.error });
        }
      }

      const tag = item.reality_tag || item.realityTag;
      const key = item.name;

      if (tag === 'OBSERVED_REALITY') {
        this.observedStore.set(key, { ...item, _ingestedAt: new Date().toISOString() });
      } else if (tag === 'SYNTHETIC_REALITY') {
        this.syntheticStore.set(key, { ...item, _ingestedAt: new Date().toISOString() });
      }
      count++;
    }

    return { success: true, ingestedCount: count };
  }

  /**
   * Returns all observed physical microstructure metrics.
   * Never returns synthetic data.
   */
  getObservedMetrics() {
    return Array.from(this.observedStore.values());
  }

  /**
   * Returns a specific observed metric by name.
   */
  getObservedMetric(name) {
    return this.observedStore.get(name) || null;
  }

  /**
   * Returns all synthetic chaos/simulation metrics.
   * Never returns observed physical data.
   */
  getSyntheticMetrics() {
    return Array.from(this.syntheticStore.values());
  }

  /**
   * Returns a specific synthetic metric by name.
   */
  getSyntheticMetric(name) {
    return this.syntheticStore.get(name) || null;
  }

  /**
   * Clears in-memory stores. Does not mutate persistent backend state.
   */
  reset() {
    this.observedStore.clear();
    this.syntheticStore.clear();
    this.errorLogs = [];
  }
}

export const dataProvider = new DashboardDataProvider();
