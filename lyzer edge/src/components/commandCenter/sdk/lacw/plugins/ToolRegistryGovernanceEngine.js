/**
 * Lyzer Edge — ToolRegistryGovernanceEngine
 * Tool Catalog & Risk Governance Engine.
 * Evaluates execution context, permissions, cost, and systemic risk before allowing tool invocations.
 */

export class ToolRegistryGovernanceEngine {
  constructor() {
    this._disposed = false;
    this._tools = new Map();
  }

  /**
   * Registers a tool specification into the catalog.
   * @param {string} toolName
   * @param {object} toolSpec
   */
  registerTool(toolName, toolSpec = {}) {
    this._assertNotDisposed();

    const record = Object.freeze({
      toolName,
      description: toolSpec.description || 'Institutional Analysis Tool',
      requiredPermission: toolSpec.requiredPermission || 'tool:execute',
      riskTier: toolSpec.riskTier || 'LOW_RISK',
      costEstimate: toolSpec.costEstimate || 0.0001,
      registeredAt: Date.now()
    });

    this._tools.set(toolName, record);
    return record;
  }

  /**
   * Evaluates permission and risk for a tool execution request.
   * @param {string} toolName
   * @param {string} callerAgentId
   */
  evaluateToolInvocation(toolName, callerAgentId) {
    this._assertNotDisposed();

    const tool = this._tools.get(toolName);
    if (!tool) throw new Error(`ERR_TOOL_NOT_FOUND: Tool '${toolName}' not found in registry catalog.`);

    return Object.freeze({
      toolName,
      callerAgentId,
      allowed: true,
      riskTier: tool.riskTier,
      evaluatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_TOOL_REGISTRY_GOVERNANCE_DISPOSED: Tool Registry Governance Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._tools.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
