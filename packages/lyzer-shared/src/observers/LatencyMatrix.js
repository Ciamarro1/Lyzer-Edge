/**
 * Latency Matrix Engine — Observer Dynamics Lab (Era 7.1 Wave 3)
 * Evaluates the cross-observer latency and epistemic divergence across
 * the 4 fundamental observers: Market, Authority/FOMC, Media, Analysts.
 */
export class LatencyMatrix {
  constructor(options = {}) {
    this.divergenceVetoThreshold = options.divergenceVetoThreshold || 0.60;
    this.observers = ['MARKET', 'MEDIA', 'ANALYSTS', 'AUTHORITY'];
    
    // Baseline empirical reaction latencies (in nominal units / seconds proxy)
    this.inherentLatencies = {
      MARKET: 1,      // Fastest (seconds)
      MEDIA: 120,     // Minutes
      ANALYSTS: 1800, // Hours
      AUTHORITY: 7200 // Days/Weeks
    };
  }

  /**
   * Computes the 4x4 Pairwise Latency Matrix.
   * @param {Object} customLatencies - Optional observed real-time reaction delays.
   * @returns {Object} 4x4 Matrix mapping relative lag between observer pairs.
   */
  computeMatrix(customLatencies = {}) {
    const latencies = { ...this.inherentLatencies, ...customLatencies };
    const matrix = {};

    for (const obs1 of this.observers) {
      matrix[obs1] = {};
      for (const obs2 of this.observers) {
        // Delta latency (positive means obs1 reacts faster than obs2)
        const lagRatio = (latencies[obs2] - latencies[obs1]) / Math.max(latencies[obs1], latencies[obs2]);
        matrix[obs1][obs2] = parseFloat(lagRatio.toFixed(3));
      }
    }

    return matrix;
  }

  /**
   * Computes the Observer Divergence Metric (ODM) across active signals/sentiments.
   * @param {Object} observerSignals - { MARKET: -1..1, MEDIA: -1..1, ANALYSTS: -1..1, AUTHORITY: -1..1 }
   * @returns {Object} { odm, epistemicVeto, matrix, breakdown }
   */
  evaluateDivergence(observerSignals = {}) {
    const signals = {
      MARKET: observerSignals.MARKET || 0,
      MEDIA: observerSignals.MEDIA || 0,
      ANALYSTS: observerSignals.ANALYSTS || 0,
      AUTHORITY: observerSignals.AUTHORITY || 0
    };

    const values = Object.values(signals);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const odm = Math.min(1.0, Math.sqrt(variance) * 1.414); // Normalized 0 to 1

    const matrix = this.computeMatrix();
    const epistemicVeto = odm >= this.divergenceVetoThreshold;

    return {
      odm: parseFloat(odm.toFixed(4)),
      epistemicVeto,
      consensusMean: parseFloat(mean.toFixed(4)),
      latencyMatrix: matrix,
      signals
    };
  }
}
