export const AlphaState = {
  DISCOVERY: 'DISCOVERY',
  VALIDATION: 'VALIDATION',
  SHADOW: 'SHADOW',
  CERTIFIED: 'CERTIFIED',
  PRODUCTION: 'PRODUCTION',
  DECAY_WARNING: 'DECAY_WARNING',
  RESEARCH_ONLY: 'RESEARCH_ONLY',
  RETIRED: 'RETIRED'
};

export class AlphaLifecycleManager {
  constructor(alphaId, currentState = AlphaState.DISCOVERY) {
    this.alphaId = alphaId;
    this.state = currentState;
    this.metrics = {
      liveWinRate: 0,
      historicalWinRate: 0,
      liveSharpe: 0,
      historicalSharpe: 0,
      daysInState: 0
    };
    this.transitions = [];
  }

  updateMetrics(liveWinRate, historicalWinRate, liveSharpe, historicalSharpe) {
    this.metrics.liveWinRate = liveWinRate;
    this.metrics.historicalWinRate = historicalWinRate;
    this.metrics.liveSharpe = liveSharpe;
    this.metrics.historicalSharpe = historicalSharpe;
  }

  evaluateState() {
    // Regras de transição de degradação
    if (this.state === AlphaState.PRODUCTION || this.state === AlphaState.CERTIFIED) {
      const sharpeDecay = this.metrics.historicalSharpe > 0 ? (this.metrics.historicalSharpe - this.metrics.liveSharpe) / this.metrics.historicalSharpe : 0;
      
      // Se perdeu 40% da eficiência do Sharpe histórico
      if (sharpeDecay >= 0.40) {
        this.transitionTo(AlphaState.DECAY_WARNING, `Sharpe Decay: ${sharpeDecay.toFixed(2)} exceeds 40% threshold.`);
        return this.state;
      }
    }

    if (this.state === AlphaState.DECAY_WARNING) {
      const winrateDecay = this.metrics.historicalWinRate > 0 ? (this.metrics.historicalWinRate - this.metrics.liveWinRate) / this.metrics.historicalWinRate : 0;

      // Se perdeu 20% do Win Rate enquanto em Decay Warning
      if (winrateDecay >= 0.20) {
        this.transitionTo(AlphaState.RESEARCH_ONLY, `WinRate Decay: ${winrateDecay.toFixed(2)} while in Warning.`);
        return this.state;
      }
    }

    // Se a eficiência for negativa por tempo considerável
    if (this.state === AlphaState.RESEARCH_ONLY && this.metrics.liveSharpe < 0) {
       this.transitionTo(AlphaState.RETIRED, `Negative live Sharpe in Research Only state.`);
    }

    return this.state;
  }

  transitionTo(newState, reason) {
    this.transitions.push({
      from: this.state,
      to: newState,
      reason,
      timestamp: Date.now()
    });
    console.log(`[LIFECYCLE] ${this.alphaId}: ${this.state} -> ${newState} | Reason: ${reason}`);
    this.state = newState;
  }
}
