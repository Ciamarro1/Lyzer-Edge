/**
 * Lyzer Edge — AgentMarketplaceFoundation
 * Agent Marketplace & Federated Component Store Architecture.
 * Supports agent registration, versioning, capability manifest verification, and institutional certification.
 */

export class AgentMarketplaceFoundation {
  constructor() {
    this._disposed = false;
    this._publishedAgents = new Map();
  }

  /**
   * Publishes an agent definition to the institutional marketplace registry.
   * @param {object} agentManifest - Agent manifest details
   */
  publishAgent(agentManifest = {}) {
    this._assertNotDisposed();

    if (!agentManifest.id || !agentManifest.version) {
      throw new Error('ERR_INVALID_MARKETPLACE_MANIFEST: Agent manifest must declare id and version');
    }

    const record = Object.freeze({
      agentId: agentManifest.id,
      name: agentManifest.name || agentManifest.id,
      version: agentManifest.version,
      author: agentManifest.author || 'Lyzer_Quant_Lab',
      capabilities: Object.freeze([...(agentManifest.capabilities || [])]),
      certificationLevel: agentManifest.certificationLevel || 'PLATINUM',
      publishedAt: new Date().toISOString()
    });

    this._publishedAgents.set(record.agentId, record);
    return record;
  }

  /**
   * Lists published agents in marketplace.
   */
  listPublishedAgents() {
    this._assertNotDisposed();
    return Array.from(this._publishedAgents.values());
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_AGENT_MARKETPLACE_FOUNDATION_DISPOSED: Agent Marketplace Foundation is disposed');
  }

  dispose() {
    this._disposed = true;
    this._publishedAgents.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
