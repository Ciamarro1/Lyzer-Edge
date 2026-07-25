export class ExecutionReplayEngine {
  constructor(config = {}) {
    this.baseLatencyMs = config.baseLatencyMs || 100;
    this.spreadMultiplier = config.spreadMultiplier || 1.0;
    this.slippageModel = config.slippageModel || "DYNAMIC"; // STATIC or DYNAMIC
  }

  /**
   * Simulates the friction of the real world on a generated signal.
   * Modifies the intended entry price based on simulated execution realities.
   */
  simulateExecution(signal, marketState) {
    // 1. Network Delay Simulation
    // Se a volatilidade está alta, a latência de rede e matching engine sobem.
    const latencyJitter = marketState.volatility > 0.05 ? Math.random() * 500 : Math.random() * 50;
    const totalLatency = this.baseLatencyMs + latencyJitter;

    // 2. Exchange Queue & Fill Probability
    // Market orders em baixa liquidez correm risco de Fill Parcial, mas simulamos Fill total com pior preço.
    const liquidityScore = marketState.liquidityScore || 1.0; // 0.0 to 1.0
    const fillProbability = 0.5 + (liquidityScore * 0.5); // Min 50% prob of perfect fill

    let realizedPrice = signal.intendedPrice;
    
    // 3. Spread Expansion & Slippage Model
    if (Math.random() > fillProbability) {
        const spreadPenalty = (marketState.spread * this.spreadMultiplier) / 2;
        
        let slippage = 0;
        if (this.slippageModel === "DYNAMIC") {
            // Maior volatilidade e menor liquidez = mais slippage
            const slippageFactor = (marketState.volatility / liquidityScore) * 0.1;
            slippage = signal.intendedPrice * slippageFactor;
        } else {
            slippage = signal.intendedPrice * 0.0005; // 0.05% static
        }

        // Penalize long buys higher, shorts lower
        if (signal.direction === "LONG") {
            realizedPrice += (spreadPenalty + slippage);
        } else {
            realizedPrice -= (spreadPenalty + slippage);
        }
    }

    const alphaLostPercent = Math.abs((realizedPrice - signal.intendedPrice) / signal.intendedPrice) * 100;

    return {
      success: true,
      intendedPrice: signal.intendedPrice,
      realizedPrice: realizedPrice,
      totalLatencyMs: totalLatency,
      alphaLostPercent: alphaLostPercent,
      friction: {
          volatility: marketState.volatility,
          liquidity: liquidityScore
      }
    };
  }
}
