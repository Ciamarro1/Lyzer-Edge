import { LyzerStandardBar } from './market_ingestion';

export interface ContextState {
  volatilityRegime: 'COMPRESSED' | 'NORMAL' | 'EXPANDED';
  trendRegime: 'BULL' | 'BEAR' | 'CHOP';
  timestampMs: number;
}

/**
 * Regime Feature Generator
 * 
 * Domain: Observation Layer
 * Subdomain: Context
 * Purpose: Calculates mathematical context from raw facts, without predicting 
 * the future (preventing Feature Leakage).
 * Answers: "What kind of world are we currently standing in?"
 */
export class RegimeFeatures {
  
  /**
   * Generates the current Context State from a rolling window of facts.
   * STRICT REQUIREMENT: Only past data may be used.
   */
  public calculateCurrentRegime(historicalWindow: LyzerStandardBar[]): ContextState {
    if (historicalWindow.length < 2) {
      return { volatilityRegime: 'NORMAL', trendRegime: 'CHOP', timestampMs: Date.now() };
    }

    // Stub: HMM or simple rolling standard deviation for volatility
    const isVolatile = false; // Stub
    const isTrendingUp = false; // Stub

    return {
      volatilityRegime: isVolatile ? 'EXPANDED' : 'COMPRESSED',
      trendRegime: isTrendingUp ? 'BULL' : 'CHOP',
      timestampMs: historicalWindow[historicalWindow.length - 1].timestampMs
    };
  }
}
