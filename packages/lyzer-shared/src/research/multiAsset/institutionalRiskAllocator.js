import { CapitalAllocationGovernor } from '../governance/capitalAllocationGovernor.js';

/**
 * L12 Institutional Risk Allocator
 * Evolução do CapitalAllocationGovernor.
 * Implementa o teto rígido do Risk Budget de acordo com o Macro Regime:
 * - RISK_ON / RISK_NEUTRAL -> 100% Risk Budget
 * - RISK_OFF -> 30% Risk Budget
 * - SYSTEMIC_STRESS -> 0% (HALT / Ejeção de posição)
 * 
 * A regra do menor limite sempre vence: se o Alpha micro dita 100%, mas o Macro dita 30%, a alocação será 30%.
 */
export class InstitutionalRiskAllocator extends CapitalAllocationGovernor {
  constructor(portfolioManager, auditOnly = false) {
    super(portfolioManager, auditOnly);
    this.macroRiskBudget = 1.0; // 100%
    this.effectiveAllocation = 1.0;
  }

  evaluateRiskBudget(macroRegime, microAlphaHealth) {
    // 1. Determina teto MACRO
    switch (macroRegime) {
      case 'RISK_ON':
      case 'RISK_NEUTRAL':
        this.macroRiskBudget = 1.0;
        break;
      case 'RISK_OFF':
        this.macroRiskBudget = 0.3; // 30% risk budget
        break;
      case 'SYSTEMIC_STRESS':
        this.macroRiskBudget = 0.0; // 0% -> HALT
        break;
      default:
        this.macroRiskBudget = 0.5;
    }

    // 2. Determina limite MICRO do Alpha (Herdado de L10/L11)
    let microBudget = 1.0;
    if (microAlphaHealth === 'DECAY_WARNING') microBudget = 0.5;
    if (microAlphaHealth === 'HALT') microBudget = 0.0;

    // 3. Regra de Ouro L12: o menor limite SEMPRE vence
    this.effectiveAllocation = Math.min(this.macroRiskBudget, microBudget);

    // Se a alocação efetiva for 0, aciona HALT institucional
    if (this.effectiveAllocation === 0.0 && this.macroState !== 'HALT') {
      if (!this.AUDIT_ONLY) {
        this.transitionTo('HALT');
      } else {
        console.log(`[AUDIT MODE] InstitutionalRiskAllocator would HALT due to Risk Budget 0% (${macroRegime})`);
      }
    } else if (this.effectiveAllocation < 1.0 && this.macroState === 'FULL_ALLOCATION') {
      if (!this.AUDIT_ONLY) {
        this.transitionTo('DEFENSIVE');
      }
    }

    return {
      macroRegime: macroRegime,
      macroBudget: this.macroRiskBudget,
      microBudget: microBudget,
      effectiveAllocationPerc: this.effectiveAllocation * 100,
      governorState: this.macroState
    };
  }
}
