import { ActiveKnowledge } from './replication_protocol';
import { KnowledgeRegistry } from './knowledge_registry';
import { KnowledgeRetirement } from './knowledge_retirement';

/**
 * Knowledge Lifecycle Monitor
 * 
 * Domain: Knowledge Layer
 * Purpose: Track the biological clock (Alpha Decay) of ACTIVE knowledge against current market conditions.
 */
export class KnowledgeLifecycleMonitor {
  private registry: KnowledgeRegistry;
  private retirementEngine: KnowledgeRetirement;

  constructor(registry: KnowledgeRegistry) {
    this.registry = registry;
    this.retirementEngine = new KnowledgeRetirement(registry);
  }

  /**
   * Scans all ACTIVE knowledge to measure performance degradation (Decay).
   * If the decay exceeds the institutional threshold, it triggers Retirement.
   */
  public evaluateDecay(marketStateSnapshot: any): void {
    const activeKnowledgeList = this.registry.getActiveKnowledge();

    for (const knowledge of activeKnowledgeList) {
      const decayScore = this.measureAlphaDecay(knowledge, marketStateSnapshot);
      
      // If decay crosses the lethal threshold, retire it immediately.
      if (decayScore > 0.95) {
        this.retirementEngine.executeRetirement(knowledge.id, 'ALPHA_DECAY_THRESHOLD_REACHED');
      }
    }
  }

  private measureAlphaDecay(knowledge: ActiveKnowledge, marketStateSnapshot: any): number {
    // Stub: Calculate degradation of the knowledge's predictive power.
    // 0 = No decay, 1.0 = Complete failure.
    return 0.1; // Placeholder
  }
}
