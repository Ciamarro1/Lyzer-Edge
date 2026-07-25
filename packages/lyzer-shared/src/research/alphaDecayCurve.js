export class AlphaDecayCurve {
  /**
   * Analyzes the decay of the Alpha (Sharpe) over 1, 3, 6, and 12 months.
   * @param {Array} monthlySharpes An array of Sharpe ratios for [m1, m3, m6, m12]
   */
  constructor() {
    this.decayThreshold = 0.5; // If sharpe drops by more than 50%, it's dying.
  }

  analyzeCurve(monthlySharpes) {
    if (monthlySharpes.length < 4) {
      throw new Error("Requires at least 4 data points (1m, 3m, 6m, 12m).");
    }

    const [m1, m3, m6, m12] = monthlySharpes;
    const dropTo12m = (m1 - m12) / m1;

    let status = "PERSISTING";
    let message = "Alpha remains strong across the entire curve.";

    if (m12 < 1.0) {
      status = "DYING";
      message = "Alpha dies after 6-12 months (Sharpe < 1.0). Overfitting detected.";
    } else if (dropTo12m > this.decayThreshold) {
      status = "ADAPTING";
      message = "Alpha degrades but remains profitable. Recalibration loop required.";
    }

    return {
      curve: { m1, m3, m6, m12 },
      dropRatio: dropTo12m,
      status: status,
      message: message
    };
  }
}
