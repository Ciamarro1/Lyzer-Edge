export const MacroState = {
  FULL_ALLOCATION: 'FULL_ALLOCATION',
  REDUCED_ALLOCATION: 'REDUCED_ALLOCATION',
  DEFENSIVE_MODE: 'DEFENSIVE_MODE',
  CAPITAL_PRESERVATION_MODE: 'CAPITAL_PRESERVATION_MODE',
  HALT: 'HALT'
};

export class CapitalAllocationGovernor {
  constructor(portfolioManager, auditOnly = false) {
    this.portfolio = portfolioManager; // Dependency injection from L9
    this.macroState = MacroState.FULL_ALLOCATION;
    this.stateLog = [];
    this.AUDIT_ONLY = auditOnly || process.env.AUDIT_ONLY === 'true';
  }

  evaluateMacroState(alphaAuditorClassification, realityGapRecommendation) {
    let newState = this.macroState;

    // 1. Reality Gap Override
    if (realityGapRecommendation === 'HALT_EXECUTION') {
      newState = MacroState.HALT;
    } else if (realityGapRecommendation === 'REDUCE_SIZE' && newState === MacroState.FULL_ALLOCATION) {
      newState = MacroState.REDUCED_ALLOCATION;
    }

    // 2. Alpha Decay Override
    if (alphaAuditorClassification === 'RED') {
      newState = MacroState.HALT;
    } else if (alphaAuditorClassification === 'YELLOW' && newState !== MacroState.HALT) {
      newState = MacroState.DEFENSIVE_MODE;
    }

    // 3. Drawdown Hard Limits (Institutional Level)
    const currentDrawdown = this.portfolio ? this.portfolio.maxDrawdownRealized : 0;
    if (currentDrawdown > 0.15) {
      newState = MacroState.HALT;
    } else if (currentDrawdown > 0.10 && newState !== MacroState.HALT) {
      newState = MacroState.CAPITAL_PRESERVATION_MODE;
    } else if (currentDrawdown > 0.05 && newState !== MacroState.HALT && newState !== MacroState.CAPITAL_PRESERVATION_MODE) {
      newState = MacroState.DEFENSIVE_MODE;
    }

    // A lógica MACRO nunca volta sozinha para FULL_ALLOCATION
    // O sistema corta risco automaticamente, mas exige destravamento manual via governance p/ voltar.
    // Assim, nós prevemos o "Não aumentar risco baseado apenas em performance recente".
    if (newState !== this.macroState) {
      if (this.AUDIT_ONLY) {
         console.log(`[BLIND AUDIT] Transition Blocked: Would shift from ${this.macroState} to ${newState}`);
         // No Audit Mode, apenas gera telemetria, não altera o estado real.
      } else {
         this.transitionTo(newState);
      }
    }

    return this.macroState;
  }

  getAllocationMultiplier() {
    switch (this.macroState) {
      case MacroState.FULL_ALLOCATION: return 1.0;
      case MacroState.REDUCED_ALLOCATION: return 0.75;
      case MacroState.DEFENSIVE_MODE: return 0.50;
      case MacroState.CAPITAL_PRESERVATION_MODE: return 0.25;
      case MacroState.HALT: return 0.0;
      default: return 0.0;
    }
  }

  transitionTo(newState) {
    console.log(`[MACRO GOVERNOR] State Transition: ${this.macroState} -> ${newState}`);
    this.stateLog.push({
      from: this.macroState,
      to: newState,
      timestamp: Date.now()
    });
    this.macroState = newState;
  }
}
