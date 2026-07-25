export class DatasetIntegrityValidator {
  constructor() {
    this.name = "Data Integrity War Validator";
  }

  /**
   * Validates a historical dataset for institutional-grade reliability.
   */
  validateDataset(candles, expectedIntervalMs) {
    console.log(`[QA AUTOMATION] Initiating L6.1 Dataset Integrity War on ${candles.length} records.`);
    let issues = {
      missingCandles: 0,
      anomalousTimestamps: 0,
      duplicates: 0,
      survivorshipBiasRisk: false
    };

    let previousTimestamp = null;
    let seenTimestamps = new Set();

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];

      // 1. Duplicates
      if (seenTimestamps.has(c.timestamp)) {
        issues.duplicates++;
      }
      seenTimestamps.add(c.timestamp);

      // 2. Missing Candles / Gaps
      if (previousTimestamp !== null) {
        const gap = c.timestamp - previousTimestamp;
        if (gap !== expectedIntervalMs) {
           const missedTicks = Math.floor(gap / expectedIntervalMs) - 1;
           if (missedTicks > 0) issues.missingCandles += missedTicks;
        }
        
        // 3. Anomalous Timestamps (Out of order)
        if (c.timestamp < previousTimestamp) {
          issues.anomalousTimestamps++;
        }
      }

      // 4. Survivorship Bias Risk (Volume suddenly zeroing out without delisting)
      if (c.volume === 0 && i > 0 && candles[i-1].volume > 1000) {
         issues.survivorshipBiasRisk = true;
      }

      previousTimestamp = c.timestamp;
    }

    const isClean = (issues.missingCandles === 0 && issues.anomalousTimestamps === 0 && issues.duplicates === 0);

    return {
      isValid: isClean,
      issues: issues,
      report: isClean ? "CLEAN" : "CORRUPTED"
    };
  }
}
