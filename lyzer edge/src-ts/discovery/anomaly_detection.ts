import { FeatureVector } from './feature_generation';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StatisticalAnomaly {
  anomalyId: string;
  symbol: string;
  featureName: string;
  aberrationValue: number;
  severity: AnomalySeverity;
  detectedAtMs: number;
  expiresAtMs: number; // The absolute death of this anomaly
}

/**
 * Anomaly Detection Engine (Chamber 2)
 * 
 * Domain: Discovery Layer
 * Purpose: Detects statistical deviations. Anomalies are NOT opportunities, 
 * they are just violations of expectations.
 * Governance Constraint: Every anomaly must have a decay/half-life. 
 * Necromancy (using dead anomalies) is strictly forbidden.
 */
export class AnomalyDetection {
  
  private calculateExpiration(severity: AnomalySeverity, detectedAtMs: number): number {
    const HOUR_MS = 60 * 60 * 1000;
    switch (severity) {
      case 'CRITICAL': return detectedAtMs + (1 * HOUR_MS);
      case 'HIGH': return detectedAtMs + (6 * HOUR_MS);
      case 'MEDIUM': return detectedAtMs + (24 * HOUR_MS);
      case 'LOW': return detectedAtMs + (72 * HOUR_MS);
    }
  }

  /**
   * Scans a feature vector for aberrations (e.g. Z-Score breaks).
   */
  public detectAnomalies(features: FeatureVector): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];

    // Rule: Z-Score > 4 is a HIGH severity anomaly
    if (Math.abs(features.volumeZScore) > 4.0) {
      const detectedAt = features.timestampMs;
      anomalies.push({
        anomalyId: `ANOM-${Date.now()}-VOLZ`,
        symbol: features.symbol,
        featureName: 'volumeZScore',
        aberrationValue: features.volumeZScore,
        severity: 'HIGH',
        detectedAtMs: detectedAt,
        expiresAtMs: this.calculateExpiration('HIGH', detectedAt)
      });
    }

    return anomalies;
  }
}
