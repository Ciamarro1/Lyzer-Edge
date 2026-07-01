/**
 * ARL v3.2 Counterfactual World Simulator
 * Stress tests strategies by generating alternative history paths with noise.
 */

export class CounterfactualWorldSimulator {
  simulate(strategy, nScenarios = 5) {
    const results = [];
    for (let i = 0; i < nScenarios; i++) {
      const noise = Math.random() * 0.05;
      results.push({
        EV: strategy.EV * (1 + noise - 0.025),
        drawdown: strategy.drawdown * (1 + noise),
        stability: strategy.stability * (1 - noise),
        regime: ['trend_up','trend_down','low_vol','chop'][Math.floor(Math.random()*4)]
      });
    }
    return results;
  }
}
