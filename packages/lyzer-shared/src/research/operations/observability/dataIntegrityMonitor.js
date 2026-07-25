/**
 * L13 Data Integrity Monitor
 * Monitora timestamp freshness e saltos anômalos (gaps / corrupção no OHLCV).
 */

export class DataIntegrityMonitor {
  constructor() {
    this.status = 'HEALTHY';
    this.maxFreshnessDelayMs = 15000; // 15s limit from Alpha Freeze
  }

  checkHealth(dataDelayMs = 120, isDataCorrupted = false, anomalousGapDetected = false) {
    const issues = [];
    if (dataDelayMs > this.maxFreshnessDelayMs) {
      issues.push(`Market data delay (${dataDelayMs}ms) exceeds freshness limit (${this.maxFreshnessDelayMs}ms)`);
    }
    if (isDataCorrupted) {
      issues.push(`Market data feed reports corrupted or NaN OHLCV values`);
    }
    if (anomalousGapDetected) {
      issues.push(`Anomalous price gap detected in data stream without volume confirmation`);
    }

    if (isDataCorrupted || anomalousGapDetected) {
      this.status = 'CORRUPTED_FEED';
    } else if (dataDelayMs > this.maxFreshnessDelayMs) {
      this.status = 'STALE_DATA';
    } else {
      this.status = 'HEALTHY';
    }

    return {
      component: 'DataIntegrity',
      status: this.status,
      metrics: { delayMs: dataDelayMs, corrupted: isDataCorrupted, gap: anomalousGapDetected },
      issues: issues,
      timestamp: new Date().toISOString()
    };
  }
}
