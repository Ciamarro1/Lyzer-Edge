export class ResearchGovernanceEngine {
  constructor() {
    this.approvedAlphas = [];
  }

  evaluateHypothesis(hypothesis) {
    console.log(`[RESEARCH GOV] Evaluating Hypothesis: ${hypothesis.name}`);
    
    // 1. Overfitting Check (Purged CV score e Degrees of Freedom)
    if (hypothesis.degreesOfFreedom > 5) {
      console.log(`[RESEARCH GOV] VETO: Overfitting risk. Too many parameters (${hypothesis.degreesOfFreedom} > 5).`);
      return false;
    }

    if (hypothesis.purgedCVShape < 0.5) {
      console.log(`[RESEARCH GOV] VETO: Purged CV Score too low (${hypothesis.purgedCVShape}). Fails robust validation.`);
      return false;
    }

    // 2. Cherry Picking Check (Walk Forward)
    if (!hypothesis.walkForwardTest) {
      console.log(`[RESEARCH GOV] VETO: Missing Walk Forward Analysis.`);
      return false;
    }

    if (hypothesis.maxDrawdownInOOS > 0.15) {
      console.log(`[RESEARCH GOV] VETO: Out of Sample Drawdown exceeds institutional threshold (>15%).`);
      return false;
    }

    // 3. Epistemological Check (Does it have causal explanation?)
    if (!hypothesis.causalPremise || hypothesis.causalPremise.trim() === '') {
      console.log(`[RESEARCH GOV] VETO: Data Mining detected. No causal premise defined.`);
      return false;
    }

    // Passou em tudo
    console.log(`[RESEARCH GOV] APPROVED: Hypothesis ${hypothesis.name} is mathematically sound. Ready for EXPERIMENT phase.`);
    this.approvedAlphas.push(hypothesis.name);
    return true;
  }
}
