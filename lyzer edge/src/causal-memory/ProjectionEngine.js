export class ProjectionEngine {
  constructor() {
    this.currentState = {
      lastObservation: null,
      lastReality: null,
      lastJudgment: null,
      lastRisk: null,
      lastExecution: null,
      totalEventsProcessed: 0,
      activeRegime: 'REGIME_A_CONSENSUS'
    };
  }

  processEvent(event) {
    if (!event || !event.event_type) return;

    this.currentState.totalEventsProcessed++;

    switch (event.event_type) {
      case 'MARKET_OBSERVATION_RECEIVED':
        this.currentState.lastObservation = event;
        break;
      case 'REALITY_RECONSTRUCTED':
        this.currentState.lastReality = event;
        if (event.epistemic_regime) {
          this.currentState.activeRegime = event.epistemic_regime;
        }
        break;
      case 'CONSTITUTIONAL_JUDGMENT':
        this.currentState.lastJudgment = event;
        break;
      case 'RISK_ASSESSED':
        this.currentState.lastRisk = event;
        break;
      case 'EXECUTION_RESULT':
        this.currentState.lastExecution = event;
        break;
      default:
        break;
    }

    return this.getCurrentState();
  }

  getCurrentState() {
    return { ...this.currentState };
  }
}
