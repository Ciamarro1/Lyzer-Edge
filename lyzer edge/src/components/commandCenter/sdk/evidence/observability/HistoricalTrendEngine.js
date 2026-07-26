/**
 * Lyzer Edge — HistoricalTrendEngine
 * Commit-indexed time-series storage with regression detection.
 * Tracks key metrics across commits to answer questions like:
 *   - Did this commit increase latency?
 *   - Did Sharpe degrade?
 *   - Is coverage dropping?
 *   - Is heap growing?
 *
 * Uses an in-memory ring buffer (max 500 snapshots).
 * Strictly observational. Zero trade execution signals emitted.
 */

const TRACKED_METRICS = [
  'sharpeOOS',
  'p99LatencyUs',
  'heapUsedMb',
  'codeCoveragePct',
  'wiringEfficiencyPct',
  'dsrScore',
  'maxDrawdownPct',
  'buildTimeSeconds'
];

const REGRESSION_THRESHOLDS = {
  sharpeOOS:           { direction: 'higher_is_better', pctDrop: 5 },
  p99LatencyUs:        { direction: 'lower_is_better',  pctRise: 20 },
  heapUsedMb:          { direction: 'lower_is_better',  pctRise: 10 },
  codeCoveragePct:     { direction: 'higher_is_better', pctDrop: 1 },
  wiringEfficiencyPct: { direction: 'higher_is_better', pctDrop: 1 },
  dsrScore:            { direction: 'higher_is_better', pctDrop: 3 },
  maxDrawdownPct:      { direction: 'lower_is_better',  pctRise: 15 },
  buildTimeSeconds:    { direction: 'lower_is_better',  pctRise: 25 }
};

export class HistoricalTrendEngine {
  constructor(maxSnapshots = 500) {
    this._disposed = false;
    this._maxSnapshots = maxSnapshots;
    this._snapshots = [];
    this._commitIndex = new Map();
  }

  /**
   * Records a telemetry snapshot indexed by commit hash.
   * @param {string} commitHash
   * @param {object} telemetrySnapshot - Output from ContinuousMeasurementPlatformEngine.generateTelemetrySnapshot()
   */
  recordSnapshot(commitHash, telemetrySnapshot) {
    this._assertNotDisposed();

    const record = Object.freeze({
      commitHash,
      timestamp: Date.now(),
      metrics: Object.freeze({
        sharpeOOS: telemetrySnapshot.producao?.sharpeOOS ?? 0,
        p99LatencyUs: telemetrySnapshot.performance?.p99LatencyUs ?? 0,
        heapUsedMb: telemetrySnapshot.memoria?.heapUsedMb ?? 0,
        codeCoveragePct: telemetrySnapshot.engenharia?.codeCoveragePct ?? 0,
        wiringEfficiencyPct: telemetrySnapshot.complexidade?.wiringEfficiencyPct ?? 0,
        dsrScore: telemetrySnapshot.estatistica?.dsrScore ?? 0,
        maxDrawdownPct: telemetrySnapshot.producao?.maxDrawdownPct ?? 0,
        buildTimeSeconds: telemetrySnapshot.engenharia?.buildTimeSeconds ?? 0
      })
    });

    this._snapshots.push(record);
    this._commitIndex.set(commitHash, this._snapshots.length - 1);

    if (this._snapshots.length > this._maxSnapshots) {
      const removed = this._snapshots.shift();
      this._commitIndex.delete(removed.commitHash);
      // Re-index
      for (const [hash, idx] of this._commitIndex) {
        this._commitIndex.set(hash, idx - 1);
      }
    }

    return record;
  }

  /**
   * Computes per-metric deltas between two commits.
   * @param {string} commitA - Earlier commit
   * @param {string} commitB - Later commit
   * @returns {object} Delta object with absolute and percentage changes per metric
   */
  computeDelta(commitA, commitB) {
    this._assertNotDisposed();

    const idxA = this._commitIndex.get(commitA);
    const idxB = this._commitIndex.get(commitB);

    if (idxA === undefined) throw new Error(`ERR_COMMIT_NOT_FOUND: ${commitA}`);
    if (idxB === undefined) throw new Error(`ERR_COMMIT_NOT_FOUND: ${commitB}`);

    const metricsA = this._snapshots[idxA].metrics;
    const metricsB = this._snapshots[idxB].metrics;

    const deltas = {};
    for (const metric of TRACKED_METRICS) {
      const valA = metricsA[metric];
      const valB = metricsB[metric];
      const absoluteDelta = Math.round((valB - valA) * 10000) / 10000;
      const pctChange = valA !== 0
        ? Math.round(((valB - valA) / Math.abs(valA)) * 10000) / 100
        : 0;

      deltas[metric] = Object.freeze({
        before: valA,
        after: valB,
        absoluteDelta,
        pctChange
      });
    }

    return Object.freeze({
      commitA,
      commitB,
      deltas: Object.freeze(deltas),
      computedAt: Date.now()
    });
  }

  /**
   * Detects regressions over the last N snapshots.
   * @param {number} [windowSize=10] - Number of recent snapshots to analyze
   * @returns {Array<{ metric: string, severity: string, currentValue: number, baselineValue: number, pctChange: number }>}
   */
  detectRegressions(windowSize = 10) {
    this._assertNotDisposed();

    if (this._snapshots.length < 2) return [];

    const recent = this._snapshots.slice(-windowSize);
    const baseline = recent[0].metrics;
    const current = recent[recent.length - 1].metrics;
    const regressions = [];

    for (const [metric, threshold] of Object.entries(REGRESSION_THRESHOLDS)) {
      const baseVal = baseline[metric];
      const currVal = current[metric];

      if (baseVal === 0) continue;

      const pctChange = ((currVal - baseVal) / Math.abs(baseVal)) * 100;

      if (threshold.direction === 'higher_is_better' && pctChange < -threshold.pctDrop) {
        regressions.push({
          metric,
          severity: Math.abs(pctChange) > threshold.pctDrop * 2 ? 'CRITICAL' : 'WARNING',
          currentValue: currVal,
          baselineValue: baseVal,
          pctChange: Math.round(pctChange * 100) / 100
        });
      }

      if (threshold.direction === 'lower_is_better' && pctChange > threshold.pctRise) {
        regressions.push({
          metric,
          severity: pctChange > threshold.pctRise * 2 ? 'CRITICAL' : 'WARNING',
          currentValue: currVal,
          baselineValue: baseVal,
          pctChange: Math.round(pctChange * 100) / 100
        });
      }
    }

    return regressions;
  }

  /**
   * Returns time-series array for a specific metric over the last N commits.
   * Suitable for sparkline rendering.
   * @param {string} metric - One of TRACKED_METRICS
   * @param {number} [lastN=50]
   * @returns {Array<{ commitHash: string, value: number, timestamp: number }>}
   */
  getTrendSeries(metric, lastN = 50) {
    this._assertNotDisposed();

    if (!TRACKED_METRICS.includes(metric)) {
      throw new Error(`ERR_UNKNOWN_METRIC: ${metric}. Valid: ${TRACKED_METRICS.join(', ')}`);
    }

    return this._snapshots.slice(-lastN).map(s => ({
      commitHash: s.commitHash,
      value: s.metrics[metric],
      timestamp: s.timestamp
    }));
  }

  /**
   * Returns count of recorded snapshots.
   */
  get snapshotCount() {
    return this._snapshots.length;
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_TREND_ENGINE_DISPOSED');
  }

  dispose() {
    this._disposed = true;
    this._snapshots = [];
    this._commitIndex.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
