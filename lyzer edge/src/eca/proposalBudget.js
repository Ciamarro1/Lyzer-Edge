export const BUDGET_LIMITS = {
  MAX_DAILY_PROPOSALS: 10,
  MAX_DAILY_FAILURES: 3,
  MAX_CUMULATIVE_COGNITIVE_COST: 50
};

export class ProposalBudget {
  constructor() {
    this.dailyProposalsCount = 0;
    this.dailyFailuresCount = 0;
    this.cumulativeCognitiveCost = 0;
    this.lastResetTimestamp = Date.now();
  }

  checkReset() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - this.lastResetTimestamp >= oneDay) {
      this.dailyProposalsCount = 0;
      this.dailyFailuresCount = 0;
      this.cumulativeCognitiveCost = 0;
      this.lastResetTimestamp = now;
    }
  }

  evaluateBudget(proposalCost) {
    this.checkReset();

    if (this.dailyProposalsCount >= BUDGET_LIMITS.MAX_DAILY_PROPOSALS) {
      return { allowed: false, reason: "Daily proposal limit exceeded (Exploration Spam Protection)" };
    }

    if (this.dailyFailuresCount >= BUDGET_LIMITS.MAX_DAILY_FAILURES) {
      return { allowed: false, reason: "Daily failure threshold reached (Evolutionary Protection Lock)" };
    }

    if (this.cumulativeCognitiveCost + proposalCost > BUDGET_LIMITS.MAX_CUMULATIVE_COGNITIVE_COST) {
      return { allowed: false, reason: "Cognitive energy budget exhausted for today" };
    }

    return { allowed: true };
  }

  recordProposal(cost) {
    this.dailyProposalsCount++;
    this.cumulativeCognitiveCost += cost;
  }

  recordFailure() {
    this.dailyFailuresCount++;
  }
}
 