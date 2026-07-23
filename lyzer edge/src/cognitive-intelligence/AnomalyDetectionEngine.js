/**
 * @fileoverview AnomalyDetectionEngine — Phase 8 (ADR-025)
 *
 * Detects real-time market microstructure anomalies, structural breaks,
 * or epistemic divergence between baseline models and current market feeds.
 */
export class AnomalyDetectionEngine {
  constructor(config = {}) {
    this.zScoreThreshold = config.zScoreThreshold || 3.0;
  }

  /**
   * Evaluates current market tick or state against historical baseline.
   *
   * @param {Object} currentSnapshot - { volatility, spread, volume, dvf, lhds }
   * @param {Object} baseline - { mean_volatility, std_volatility, mean_spread, std_spread }
   * @returns {Object} AnomalyDetectionResult
   */
  detectAnomaly(currentSnapshot = {}, baseline = {}) {
    const { volatility = 0.01, spread = 0.0001 } = currentSnapshot;
    const meanVol = baseline.mean_volatility || 0.01;
    const stdVol = baseline.std_volatility || 0.002;
    const meanSpread = baseline.mean_spread || 0.0001;
    const stdSpread = baseline.std_spread || 0.00002;

    const volZScore = stdVol > 0 ? Math.abs((volatility - meanVol) / stdVol) : 0;
    const spreadZScore = stdSpread > 0 ? Math.abs((spread - meanSpread) / stdSpread) : 0;

    const anomalies = [];
    if (volZScore >= this.zScoreThreshold) {
      anomalies.push({
        metric: 'VOLATILITY_BREAK',
        z_score: Number(volZScore.toFixed(2)),
        current_value: volatility,
        baseline_mean: meanVol,
        severity: volZScore > 5.0 ? 'CRITICAL' : 'HIGH'
      });
    }

    if (spreadZScore >= this.zScoreThreshold) {
      anomalies.push({
        metric: 'SPREAD_EXPANSION',
        z_score: Number(spreadZScore.toFixed(2)),
        current_value: spread,
        baseline_mean: meanSpread,
        severity: spreadZScore > 5.0 ? 'CRITICAL' : 'HIGH'
      });
    }

    const hasAnomaly = anomalies.length > 0;
    const maxSeverity = hasAnomaly
      ? (anomalies.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH')
      : 'NONE';

    return {
      has_anomaly: hasAnomaly,
      anomaly_count: anomalies.length,
      severity: maxSeverity,
      anomalies,
      detected_at: Date.now()
    };
  }
}
