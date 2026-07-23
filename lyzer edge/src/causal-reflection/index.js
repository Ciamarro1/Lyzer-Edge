import { ReflectionEngine } from './ReflectionEngine.js';
import { CounterfactualSimulator } from './CounterfactualSimulator.js';
import { KnowledgeConflictResolver } from './KnowledgeConflictResolver.js';
import { ConfidenceDecayEngine } from './ConfidenceDecayEngine.js';
import { LearningReportGenerator } from './LearningReportGenerator.js';

export class CausalReflectionFacade {
  constructor(causalMemoryDB) {
    this.reflectionEngine = new ReflectionEngine(causalMemoryDB);
    this.simulator = new CounterfactualSimulator(causalMemoryDB);
    this.resolver = new KnowledgeConflictResolver();
    this.decayEngine = new ConfidenceDecayEngine(30);
    this.reportGenerator = new LearningReportGenerator();
  }

  async runDreamCycle() {
    return await this.reflectionEngine.runDreamCycle();
  }

  async simulateCounterfactual(options) {
    return await this.simulator.runSimulation(options);
  }

  resolveConflict(patternA, patternB) {
    return this.resolver.resolveConflict(patternA, patternB);
  }

  applyDecay(pattern, currentTimestampMs) {
    return this.decayEngine.applyDecay(pattern, currentTimestampMs);
  }
}

export { ReflectionEngine, CounterfactualSimulator, KnowledgeConflictResolver, ConfidenceDecayEngine, LearningReportGenerator };
