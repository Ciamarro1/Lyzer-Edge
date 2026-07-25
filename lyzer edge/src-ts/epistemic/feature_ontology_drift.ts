/**
 * Feature Ontology Drift (Epistemic Layer Extension)
 * 
 * Domain: Epistemology Layer
 * Purpose: Measures "Feature Relevance Decay".
 * 
 * Unlike Knowledge Failure (a bad hypothesis) or Context Failure 
 * (a regime shift), Feature Ontology Drift detects when a mathematical 
 * description of reality (a Feature) loses its informational content over years.
 * 
 * Example: Funding Rate was highly informative in 2021, but its predictive 
 * power decays by 2026 as the market structuralises. The feature still exists, 
 * but its ontology is dead.
 */
export class FeatureOntologyDrift {
  
  /**
   * Evaluates the historical decay of a feature's predictive utility across 
   * multiple macro cycles.
   */
  public evaluateFeatureDecay(featureName: string, historicalUtilityScores: number[]): boolean {
    // Stub: If the utility of the feature has monotonically decreased over 
    // the last 3 macro regimes, it is experiencing Ontology Drift.
    
    // Example: [0.8, 0.6, 0.3, 0.05] -> Decay detected.
    const isDecaying = true; 

    if (isDecaying) {
      console.warn(`[EPISTEMIC WARNING] Feature '${featureName}' is suffering from Ontology Drift. Its informational content is evaporating.`);
    }

    return isDecaying;
  }
}
