import { LyzerStandardBar } from './market_ingestion';

export type QualityLevel = 'VALID' | 'LEVEL_1_FLAG' | 'LEVEL_2_QUARANTINE' | 'LEVEL_3_CIRCUIT_BREAKER';

export interface QualityReport {
  bar: LyzerStandardBar;
  level: QualityLevel;
  reason?: string;
}

/**
 * Metadata Quality Purifier
 * 
 * Domain: Observation Layer
 * Purpose: Protects the ecosystem from Reality Distortion.
 * Governance Rule: Quality precedes Quantity. No hypothesis may be born 
 * from corrupted reality.
 */
export class MetadataQuality {
  private lastBarTimestamp: number = 0;

  /**
   * Evaluates a bar and assigns a strict epistemic quality level.
   */
  public evaluateFidelity(bar: LyzerStandardBar): QualityReport {
    // 1. Time Continuity Checks
    if (this.lastBarTimestamp > 0 && bar.timestampMs <= this.lastBarTimestamp) {
      return { bar, level: 'LEVEL_3_CIRCUIT_BREAKER', reason: 'Non-sequential timestamp' };
    }
    
    // 2. Value Sanity Checks
    if (bar.high < bar.low || bar.open <= 0 || bar.close <= 0) {
      return { bar, level: 'LEVEL_2_QUARANTINE', reason: 'Impossible price geometry' };
    }

    // 3. Noise/Latency Checks
    const timeDelta = Date.now() - bar.timestampMs;
    if (timeDelta > 5000) { // 5 seconds lag
      return { bar, level: 'LEVEL_1_FLAG', reason: 'Latency degradation detected' };
    }

    this.lastBarTimestamp = bar.timestampMs;
    return { bar, level: 'VALID' };
  }
}
