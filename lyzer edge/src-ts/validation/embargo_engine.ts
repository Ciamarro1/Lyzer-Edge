/**
 * Embargo Engine (Chamber 3)
 * 
 * Domain: Validation Layer
 * Purpose: Constitutional Law 2. Enforces a dead zone between Training 
 * and Testing windows to prevent serial correlation leakage.
 */
export class EmbargoEngine {
  
  /**
   * Calculates the exact duration of the embargo required to cleanse the data.
   * Constraint: Embargo must be AT LEAST equal to the predictive horizon (T+n).
   */
  public calculateEmbargoZone(horizonMinutes: number): number {
    // A strict implementation of De Prado's embargo.
    // If the hypothesis predicts 24h into the future, we must wait at least 24h 
    // after the last training sample before the first test sample.
    const safetyMultiplier = 1.0; // Strict T+n correlation break
    return horizonMinutes * safetyMultiplier;
  }
}
