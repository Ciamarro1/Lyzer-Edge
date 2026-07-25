import { StatisticalAnomaly } from './anomaly_detection';
import { ContextState } from '../observation/regime_features';

export interface HypothesisCandidate {
  hypothesisId: string;
  originAnomalyId: string;
  symbol: string;
  context: ContextState;
  
  // The scientific contract
  condition: string;
  expectedOutcomeDirection: 'POSITIVE' | 'NEGATIVE' | 'MEAN_REVERT';
  horizonMinutes: number; // The absolute T+n horizon (e.g. 720 for 12h)
  
  forgedAtMs: number;
}

/**
 * Hypothesis Forge (Chamber 3)
 * 
 * Domain: Discovery Layer
 * Purpose: Transforms a dead anomaly into a falsifiable predictive contract.
 * Governance Constraint: Every hypothesis MUST be predictive and MUST have an 
 * explicit T+n horizon. Anomaly necromancy is structurally blocked.
 */
export class HypothesisForge {
  
  /**
   * Attempts to forge a hypothesis. Will return null if the anomaly is dead.
   */
  public forgeHypothesis(anomaly: StatisticalAnomaly, currentContext: ContextState, currentTimeMs: number): HypothesisCandidate | null {
    // 1. Anti-Necromancy Check
    if (currentTimeMs > anomaly.expiresAtMs) {
      console.warn(`[FORGE] Rejecting anomaly ${anomaly.anomalyId}. It expired ${currentTimeMs - anomaly.expiresAtMs}ms ago.`);
      return null;
    }

    // 2. Forge the Falsifiable Contract
    // Stub: Logic to map the anomaly to a specific testable prediction
    let expectedDirection: 'POSITIVE' | 'NEGATIVE' | 'MEAN_REVERT' = 'MEAN_REVERT';
    let horizon = 720; // Default to T+12h (in minutes)

    if (anomaly.featureName === 'volumeZScore' && anomaly.aberrationValue > 4.0) {
      expectedDirection = 'MEAN_REVERT';
      horizon = 60 * 24; // T+24h
    }

    return {
      hypothesisId: `HYP-${Date.now()}-${anomaly.symbol}`,
      originAnomalyId: anomaly.anomalyId,
      symbol: anomaly.symbol,
      context: currentContext,
      condition: `When ${anomaly.featureName} exceeds ${anomaly.aberrationValue.toFixed(2)} in ${currentContext.volatilityRegime} regime`,
      expectedOutcomeDirection: expectedDirection,
      horizonMinutes: horizon,
      forgedAtMs: currentTimeMs
    };
  }
}
