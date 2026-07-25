/**
 * Regime Shock Injection Simulator (RSIS)
 * 
 * Part of the Interaction Engineering Layer (Release 1.5).
 * Prevents reflex overfitting by periodically fear-testing the system with 
 * simulated rare regime collapses. Evaluates the system for survival, not just performance.
 */

export class RegimeShockInjectionSimulator {
  constructor(config = {}) {
    this.shockProbability = config.shockProbability ?? 0.05; // Chance per evaluation to inject a shock
    this.survivalThreshold = config.survivalThreshold ?? 0.5; // Min metric to survive a shock
    this.shockMagnitudes = config.shockMagnitudes ?? [1.5, 2.0, 3.0, 5.0]; // Multipliers of volatility/drawdown
  }

  /**
   * Evaluates if a regime shock should be injected and assesses the system's
   * readiness for extreme reflex overfitting failures.
   * 
   * @param {Object} portfolioState - Current state of allocations and exposure.
   * @returns {Object} Standard engine output.
   */
  evaluate(portfolioState) {
    const overfittingRisk = portfolioState.overfittingRisk || 0; // 0 to 1
    const systemLeverage = portfolioState.leverage || 1.0;
    const correlationStrength = portfolioState.correlationStrength || 0; // 0 to 1

    let signal = "caution";
    let confidence = 50;
    let reasons = [];
    let shockImminent = false;

    // Determine if we inject a fear-test this cycle based on probability and risk
    if (Math.random() < this.shockProbability || overfittingRisk > 0.85) {
      shockImminent = true;
      signal = "go"; // "go" means trigger a simulated shock
      confidence = Math.min(100, (overfittingRisk * 100) + 20);
      reasons.push("RSIS_SHOCK_INJECTION_TRIGGERED");
    } else {
      signal = "no-go";
      confidence = Math.max(0, 80 - (overfittingRisk * 100));
      reasons.push("RSIS_NORMAL_OPERATION");
    }

    // Calculate a hypothetical survival score if a shock were to happen right now.
    // High leverage, high correlation, and overfitting reduce survivability.
    const fragility = (systemLeverage * 0.3) + (correlationStrength * 0.4) + (overfittingRisk * 0.3);
    const survivalScore = Math.max(0, 1 - fragility);

    if (survivalScore < this.survivalThreshold) {
      reasons.push("RSIS_SYSTEM_FRAGILE");
      // System is too fragile, signal caution to the meta-kernel to deleverage
      if (signal === "no-go") {
        signal = "caution";
        confidence = 90;
      }
    } else {
      reasons.push("RSIS_SYSTEM_ROBUST");
    }

    return {
      signal,
      confidence: Math.round(confidence),
      reason_codes: reasons,
      raw_metrics: {
        shock_imminent: shockImminent,
        survival_score: parseFloat(survivalScore.toFixed(4)),
        fragility_index: parseFloat(fragility.toFixed(4)),
        overfitting_risk: overfittingRisk
      }
    };
  }

  /**
   * Simulates a rare regime collapse to stress-test existing rule structures.
   * It evaluates how well the active genome/strategies survive tail events.
   * 
   * @param {Array} activeStrategies - The current active genome/strategies.
   * @returns {Object} The shock impact metrics.
   */
  simulateCollapse(activeStrategies) {
    if (!activeStrategies || activeStrategies.length === 0) {
      return { shock_magnitude: 0, survival_rate: 0, survived_count: 0, collapsed_count: 0, post_shock_strategies: [] };
    }

    // Select a random tail-event magnitude
    const magnitude = this.shockMagnitudes[Math.floor(Math.random() * this.shockMagnitudes.length)];
    
    let survivedCount = 0;
    let collapsedCount = 0;

    const evaluatedStrategies = activeStrategies.map(strategy => {
      // Robustness is a proxy for how well the strategy handles unseen variance
      const robustness = strategy.robustnessScore !== undefined ? strategy.robustnessScore : Math.random();
      
      // Impact scales with magnitude and the strategy's own leverage
      const impact = magnitude * (strategy.leverage || 1.0);
      
      // Survival threshold: does the robustness absorb the shock impact?
      // In a real system, this would evaluate the strategy against historical shock data
      const isSurvivor = robustness * 5 > impact; // Arbitrary scale factor for simulation
      
      if (isSurvivor) {
        survivedCount++;
      } else {
        collapsedCount++;
      }

      return {
        ...strategy,
        survived_shock: isSurvivor,
        impact_endured: parseFloat(impact.toFixed(2))
      };
    });

    const survivalRate = survivedCount / activeStrategies.length;

    return {
      shock_magnitude: magnitude,
      survival_rate: parseFloat(survivalRate.toFixed(4)),
      survived_count: survivedCount,
      collapsed_count: collapsedCount,
      post_shock_strategies: evaluatedStrategies
    };
  }
}
 