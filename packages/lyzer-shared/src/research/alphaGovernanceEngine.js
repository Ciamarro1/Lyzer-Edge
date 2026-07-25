import { AlphaEvolutionEngine, HypothesisState } from './alphaEvolutionEngine.js';
import { AlphaDecayMonitor } from './alphaDecayMonitor.js';

/**
 * L5 Institutional Alpha Governance Engine
 * 
 * Pipeline: IDEA -> EXPERIMENT -> VALIDATION -> SHADOW -> PRODUCTION -> MONITOR
 * Nenhuma alteração entra no sistema live sem passar por este fluxo.
 */

export const GovernanceState = {
  IDEA: 'IDEA',
  EXPERIMENT: 'EXPERIMENT',
  VALIDATION: 'VALIDATION', // Monte Carlo / Stress
  SHADOW: 'SHADOW',
  PRODUCTION: 'PRODUCTION',
  REJECTED: 'REJECTED'
};

export class AlphaGovernanceEngine {
  constructor() {
    this.evolutionEngine = new AlphaEvolutionEngine();
    this.decayMonitor = new AlphaDecayMonitor(100);
    this.pipeline = new Map(); // id -> pipeline state
  }

  // 1. Idea Stage
  proposeIdea(name, description, baseline, experiment) {
    const id = this.evolutionEngine.propose(name, description, baseline, experiment);
    this.pipeline.set(id, { state: GovernanceState.IDEA, hypothesisId: id });
    return id;
  }

  // 2. Experiment Stage (Backtest & Walk-Forward)
  async runExperimentStage(id, historicalCandles) {
    const entry = this.pipeline.get(id);
    if (!entry || entry.state !== GovernanceState.IDEA) throw new Error("Invalid Governance State");
    
    entry.state = GovernanceState.EXPERIMENT;
    
    // Runs replay and statistical Welch t-test
    const results = await this.evolutionEngine.runExperiment(id, historicalCandles);
    
    // 3. Validation Stage check
    const isApproved = this.evolutionEngine.evaluate(id);
    if (isApproved) {
      entry.state = GovernanceState.VALIDATION;
      // In a real flow, here we would trigger Monte Carlo
    } else {
      entry.state = GovernanceState.REJECTED;
    }
    
    return isApproved;
  }

  // 4. Shadow Trading Stage
  promoteToShadow(id) {
    const entry = this.pipeline.get(id);
    if (!entry || entry.state !== GovernanceState.VALIDATION) throw new Error("Must pass Validation first");
    
    entry.state = GovernanceState.SHADOW;
    console.log(`[GOVERNANCE] Hypothesis ${id} promoted to SHADOW TRADING.`);
    // System must now run live with SHADOW_TRADING_ENABLED=true
  }

  // 5. Production Stage
  promoteToProduction(id, shadowGapIsAcceptable) {
    const entry = this.pipeline.get(id);
    if (!entry || entry.state !== GovernanceState.SHADOW) throw new Error("Must pass Shadow Trading first");
    
    if (shadowGapIsAcceptable) {
      entry.state = GovernanceState.PRODUCTION;
      console.log(`[GOVERNANCE] Hypothesis ${id} promoted to LIVE PRODUCTION.`);
    } else {
      entry.state = GovernanceState.REJECTED;
      console.log(`[GOVERNANCE] Hypothesis ${id} rejected due to Reality Gap (Slippage/Latency).`);
    }
  }

  // 6. Monitor Stage (Continuous)
  monitorProduction(trade) {
    this.decayMonitor.logTrade(trade);
    const metrics = this.decayMonitor.getMetrics();
    
    if (metrics.isDecaying) {
      console.warn(`[GOVERNANCE] ALPHA DECAY DETECTED. EV Drop: ${(metrics.evDrop * 100).toFixed(2)}%. Triggering recovery protocol.`);
      // In real system, this disables live trading and requests a new hypothesis
    }
    return metrics;
  }
}
