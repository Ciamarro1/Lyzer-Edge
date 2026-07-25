/**
 * Reasoning Engine (Pathologist / Lobe 1)
 * 
 * Domain: Intelligence Layer (The Cortex)
 * Purpose: Wakes up on Triggers (Event-Driven) and correlates 
 * Active Knowledge (Theses) with Current Context.
 */

export interface IntelligenceTrigger {
  triggerId: string;
  type: 'ANOMALY_TRIGGERED' | 'REGIME_CHANGE' | 'FEATURE_REVIVAL';
  asset: string;
  timestampMs: number;
}

export interface ContextSnapshot {
  macroRegime: string;
  volatilityState: string;
  triggerEvent: IntelligenceTrigger;
}

export interface AwakenedThesis {
  thesisId: string;
  direction: 'BUY' | 'SELL';
  horizon: number;
  trigger: IntelligenceTrigger;
}

export class ReasoningEngine {
  
  /**
   * The Cortex only thinks when woken up.
   * Cross-references the event trigger with the Knowledge Base.
   */
  public wakeUp(trigger: IntelligenceTrigger, currentContext: any, knowledgeBase: any[]): AwakenedThesis[] {
    const awakened: AwakenedThesis[] = [];

    // Stub: Find hypotheses in Active Knowledge that map to this trigger
    // E.g., if a Volume Anomaly just fired, which VALIDATED theses rely on it?
    for (const thesis of knowledgeBase) {
      if (thesis.originAnomalyId === trigger.triggerId) {
        awakened.push({
          thesisId: thesis.id,
          direction: thesis.condition.includes('above') ? 'BUY' : 'SELL', // Stub logic
          horizon: thesis.horizon,
          trigger: trigger
        });
      }
    }

    return awakened;
  }
}
