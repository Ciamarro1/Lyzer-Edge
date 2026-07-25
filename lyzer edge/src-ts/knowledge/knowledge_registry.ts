import { ActiveKnowledge } from './replication_protocol';

export type KnowledgeStatus = 'ACTIVE' | 'RETIRED';

export interface RegisteredKnowledge {
  knowledgeData: ActiveKnowledge;
  status: KnowledgeStatus;
  retiredAt?: number;
}

/**
 * Knowledge Registry
 * 
 * Domain: Knowledge Layer
 * Purpose: The immutable database of Institutional Knowledge.
 * Governance Rule: The Capital Layer may ONLY consume 'ACTIVE' knowledge.
 */
export class KnowledgeRegistry {
  private db: Map<string, RegisteredKnowledge> = new Map();

  /**
   * Commits newly replicated knowledge into the institutional registry.
   */
  public commitKnowledge(knowledge: ActiveKnowledge): void {
    this.db.set(knowledge.id, {
      knowledgeData: knowledge,
      status: 'ACTIVE'
    });
  }

  /**
   * Retrieves strictly ACTIVE knowledge for operational use (e.g. Capital Layer).
   */
  public getActiveKnowledge(): ActiveKnowledge[] {
    return Array.from(this.db.values())
      .filter(record => record.status === 'ACTIVE')
      .map(record => record.knowledgeData);
  }

  /**
   * Internal mechanism to mutate the state of knowledge to RETIRED.
   * Does NOT delete the knowledge.
   */
  public markAsRetired(knowledgeId: string): void {
    const record = this.db.get(knowledgeId);
    if (record && record.status === 'ACTIVE') {
      record.status = 'RETIRED';
      record.retiredAt = Date.now();
    }
  }
}
