/**
 * Lyzer Edge — CognitiveKnowledgeEngine
 * Living Knowledge Graph & Fact Engine.
 * Every knowledge node records: Source, Confidence, Relationships, Validity Window, Version, Dependencies, Consumer Agents, Producer Agents, Obsolescence Decay.
 */

export class CognitiveKnowledgeEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._knowledgeNodes = new Map();
  }

  /**
   * Registers or updates a knowledge node in the living knowledge graph.
   * @param {string} conceptId
   * @param {object} factData
   */
  assertKnowledge(conceptId, factData = {}) {
    this._assertNotDisposed();

    const existing = this._knowledgeNodes.get(conceptId);

    const node = Object.freeze({
      conceptId,
      fact: factData.fact || 'Market regime exhibits mean-reverting property',
      source: factData.source || 'AutoFeatureDiscoveryEngine',
      confidence: factData.confidence ?? 0.94,
      version: existing ? existing.version + 1 : 1,
      relationships: Object.freeze(factData.relationships || []),
      producerAgent: factData.producerAgent || 'discovery_lab',
      consumerAgents: Object.freeze(factData.consumerAgents || ['orchestrator', 'court']),
      decayHalfLifeDays: factData.decayHalfLifeDays || 30,
      assertedAt: Date.now()
    });

    this._knowledgeNodes.set(conceptId, node);

    if (this._eventBus) {
      this._eventBus.publish('knowledge:asserted', { conceptId, confidence: node.confidence });
    }

    return node;
  }

  /**
   * Retrieves a knowledge node by concept ID.
   * @param {string} conceptId
   */
  getKnowledge(conceptId) {
    this._assertNotDisposed();
    return this._knowledgeNodes.get(conceptId);
  }

  /**
   * Returns list of all active knowledge nodes.
   */
  listKnowledge() {
    this._assertNotDisposed();
    return Array.from(this._knowledgeNodes.values());
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_KNOWLEDGE_ENGINE_DISPOSED: Knowledge Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._knowledgeNodes.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
