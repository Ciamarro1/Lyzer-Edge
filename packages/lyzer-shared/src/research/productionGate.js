export class ProductionGate {
  constructor() {
    this.maxAcceptableDrawdown = 0.15; // 15% Max DD
  }

  /**
   * Final Institutional Gate before LIVE Capital execution.
   */
  evaluateReadiness(lssScore, realityGap, metrics, shadowTradingDays) {
    console.log("========================================");
    console.log("       INSTITUTIONAL PRODUCTION GATE    ");
    console.log("========================================");

    let isApproved = true;
    let failureReasons = [];

    // Rule 1: LSS >= 85 (Cruel Score)
    if (lssScore < 85) {
      isApproved = false;
      failureReasons.push(`FAILED: LSS Score (${lssScore}) is below 85 limit.`);
    }

    // Rule 2: Reality Gap < 15%
    if (realityGap >= 15) {
      isApproved = false;
      failureReasons.push(`FAILED: Reality Gap (${realityGap}%) exceeds 15% tolerance.`);
    }

    // Rule 3: Walk Forward Testing Positive
    if (!metrics.walkForwardPositive) {
      isApproved = false;
      failureReasons.push(`FAILED: Walk Forward testing resulted in negative expectancy.`);
    }

    // Rule 4: Monte Carlo Approved
    if (!metrics.monteCarloApproved) {
      isApproved = false;
      failureReasons.push(`FAILED: Monte Carlo simulations indicate risk of ruin > 1%.`);
    }

    // Rule 5: No Statistical Regression
    if (metrics.statisticalRegression) {
      isApproved = false;
      failureReasons.push(`FAILED: Statistical regression detected compared to baseline.`);
    }

    // Rule 6: Shadow Mode Validated (30 Days)
    if (shadowTradingDays < 30) {
      isApproved = false;
      failureReasons.push(`FAILED: Insufficient Shadow Trading duration (${shadowTradingDays} days). Minimum is 30 days.`);
    }

    // Rule 7: Red Team Survival
    if (!metrics.redTeamSurvived) {
      isApproved = false;
      failureReasons.push(`FAILED: System did not survive Red Team Nuclear Attack. Critical exploits found.`);
    }

    if (isApproved) {
      console.log("[GATE APPROVED] System meets all L6 Institutional Survival criteria. Authorizing Capital Tranche.");
      return { authorized: true, status: 'APPROVED' };
    } else {
      console.error("[GATE REJECTED] System failed L6 Certification.");
      failureReasons.forEach(r => console.error(` - ${r}`));
      return { authorized: false, status: 'REJECTED', reasons: failureReasons };
    }
  }
}
