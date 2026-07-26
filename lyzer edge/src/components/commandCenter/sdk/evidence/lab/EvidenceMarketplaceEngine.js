/**
 * Lyzer Edge — EvidenceMarketplaceEngine
 * Modular Evidence Plugin Marketplace & Governance Registry.
 * Allows third-party evidence plugins (e.g. OpenMobius by MobiusQuant) to register cleanly as non-coupled extensions.
 */

export class EvidenceMarketplaceEngine {
  constructor() {
    this._plugins = new Map();
    this._initDefaultPlugins();
  }

  _initDefaultPlugins() {
    this.registerPlugin({
      pluginId: 'openmobius-skill-plugin',
      name: 'OpenMobius SMC Parser',
      author: 'MobiusQuant',
      version: '2.1',
      lastEvaluationScore: 97,
      sharpe: 2.04,
      precisionPct: 78,
      compatibility: 'SDK v1.0.0 (Platinum Certified)',
      status: 'INSTALLED_AND_ACTIVE'
    });
  }

  registerPlugin(pluginMeta) {
    if (!pluginMeta.pluginId) throw new Error('ERR_MARKETPLACE_INVALID: pluginId is required');
    this._plugins.set(pluginMeta.pluginId, Object.freeze({ ...pluginMeta }));
  }

  getPlugin(pluginId) {
    return this._plugins.get(pluginId);
  }

  listPlugins() {
    return Object.freeze(Array.from(this._plugins.values()));
  }
}
