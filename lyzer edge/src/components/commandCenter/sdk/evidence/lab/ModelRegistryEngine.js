/**
 * Lyzer Edge — ModelRegistryEngine
 * Institutional Quantitative Model Registry.
 * Tracks versioned model metadata, training dates, domains, target assets, timeframes,
 * Sharpe, Profit Factor, Brier Score, ECE, and deployment status.
 */

export class ModelRegistryEngine {
  constructor() {
    this._registry = new Map();
    this._initDefaultModels();
  }

  _initDefaultModels() {
    this.registerModel({
      modelId: 'openmobius-smc-v2',
      name: 'OpenMobius SMC Parser',
      version: '2.3.1',
      trainedDate: '2026-08-12',
      domain: 'SMC/ICT Geometry',
      targetAssets: ['BTC', 'ETH'],
      timeframes: ['1m', '5m', '15m'],
      metrics: {
        sharpe: 2.11,
        profitFactor: 1.71,
        brierScore: 0.041,
        ece: 0.018
      },
      status: 'PRODUCTION'
    });

    this.registerModel({
      modelId: 'liquidity-engine-v1',
      name: 'Liquidity Pool Sweep Engine',
      version: '1.4.0',
      trainedDate: '2026-08-10',
      domain: 'Orderbook Liquidity',
      targetAssets: ['BTC', 'ETH', 'SOL'],
      timeframes: ['5m', '15m', '1h'],
      metrics: {
        sharpe: 2.35,
        profitFactor: 1.95,
        brierScore: 0.035,
        ece: 0.012
      },
      status: 'PRODUCTION'
    });
  }

  registerModel(metadata) {
    if (!metadata.modelId) throw new Error('ERR_MODEL_REGISTRY_INVALID: modelId is required');
    this._registry.set(metadata.modelId, Object.freeze({ ...metadata }));
  }

  getModel(modelId) {
    return this._registry.get(modelId);
  }

  listModels() {
    return Object.freeze(Array.from(this._registry.values()));
  }
}
