export class AdversarialExecutionTest {
  constructor(replayEngine, governor, liquidityEngine) {
    this.replayEngine = replayEngine;
    this.governor = governor;
    this.liquidityEngine = liquidityEngine;
  }

  /**
   * "Em qual condição o Lyzer deve parar de operar?"
   * Simula ataques extremos de infraestrutura e liquidez.
   */
  async runExecutionRedTeam(signal) {
    console.log("[RED TEAM EXECUTION] Initiating Adversarial Infrastructure Attack");
    let failureModes = [];

    const scenarios = [
      { name: "Normal", spread: 0.0001, volatility: 0.01, depth: 5000000 },
      { name: "Spread 10x", spread: 0.001, volatility: 0.02, depth: 3000000 },
      { name: "Artificial Latency (+500ms)", spread: 0.0001, volatility: 0.01, depth: 5000000, latency: 500 },
      { name: "Liquidity Void", spread: 0.005, volatility: 0.08, depth: 100000 },
      { name: "Flash Volatility", spread: 0.002, volatility: 0.20, depth: 500000 }
    ];

    for (const scenario of scenarios) {
      const marketState = {
          spread: scenario.spread,
          volatility: scenario.volatility,
          depth: scenario.depth,
          regime: scenario.volatility > 0.1 ? "NEWS_SHOCK" : "TREND"
      };

      // 1. Liquidity Engine Veto Check
      const liqCheck = this.liquidityEngine.evaluateLiquidityEnvironment(marketState);
      
      if (!liqCheck.trade_allowed) {
          console.log(`[PASS] System successfully aborted in scenario: ${scenario.name} (Reason: ${liqCheck.execution_risk})`);
          continue;
      }

      marketState.liquidityScore = liqCheck.liquidity_score;

      // 2. Simulate Execution
      // If we force latency via scenario config, we inject it into the engine
      if (scenario.latency) {
          this.replayEngine.baseLatencyMs = scenario.latency;
      }
      
      const realizedExecution = this.replayEngine.simulateExecution(signal, marketState);
      
      // Reset latency
      if (scenario.latency) this.replayEngine.baseLatencyMs = 100;

      console.log(`[WARN] System attempted execution in ${scenario.name}. Alpha lost: ${realizedExecution.alphaLostPercent.toFixed(2)}%`);
      
      // Se o slippage comeu mais de 1% do trade num único tick, é falha estrutural.
      if (realizedExecution.alphaLostPercent > 1.0) {
          failureModes.push(`FAILED IN: ${scenario.name} (Alpha lost: ${realizedExecution.alphaLostPercent.toFixed(2)}%)`);
      }
    }

    const survived = failureModes.length === 0;
    return {
        survived,
        failureModes
    };
  }
}
