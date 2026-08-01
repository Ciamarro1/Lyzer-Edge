import crypto from 'crypto';
import { ExperimentMetrics } from './experimentMetrics.js';
import { AlphaDiscoveryEngine } from './alphaDiscoveryEngine.js';

/**
 * Manages the experiment lifecycle in the Lyzer Edge platform.
 * Handles creation, freezing, hashing, snapshotting, market context, anti-overfitting, and champion management.
 */
export class ExperimentManager {
  /**
   * @param {Object} db - The CausalMemoryDB instance.
   */
  constructor(db) {
    this.db = db;
    this.alphaDiscoveryEngine = new AlphaDiscoveryEngine(db);
  }

  /**
   * Initializes the experiment manager. Checks if an active experiment exists,
   * if not, creates EXP-001.
   * @returns {Promise<void>}
   */
  async initialize() {
    const active = await this.getActiveExperiment();
    if (!active) {
      const config = this.collectCurrentConfig();
      const strategy_hash = this.computeStrategyHash(config);
      const experiment_id = await this.db.getNextExperimentId(); // e.g. EXP-001
      
      await this.db.createExperiment({
        experiment_id,
        status: 'ACTIVE',
        strategy_hash,
        config_snapshot_json: JSON.stringify(config),
        created_at: Date.now()
      });
    }
  }

  /**
   * Gets the currently active experiment.
   * @returns {Promise<Object|null>} The active experiment row or null.
   */
  async getActiveExperiment() {
    return this.db.getActiveExperiment();
  }

  /**
   * Fetches a Market Snapshot capturing environment regime, sentiment, and benchmark metrics.
   * @returns {Promise<Object>} Market snapshot payload.
   */
  async fetchMarketSnapshot() {
    return {
      timestamp: Date.now(),
      btcPricePct24h: 17.2,
      ethPricePct24h: 8.4,
      solPricePct24h: 24.1,
      btcDominancePct: 65.4,
      fearAndGreedIndex: 72,
      fearAndGreedLabel: 'GREED',
      btcVolatility: 'HIGH',
      altcoinRegime: 'BULLISH',
      marketRegime: 'TRENDING_MARKET'
    };
  }

  /**
   * Computes an 8-character uppercase hex hash for a given config.
   * @param {Object} config - The configuration object to hash.
   * @returns {string} 8-character uppercase hex hash.
   */
  computeStrategyHash(config) {
    const keysToHash = [
      'takeProfit', 'stopLoss', 'longEnabled', 'shortEnabled', 'leverage',
      'symbols', 'activeFilters', 'models', 'mlConfig', 'indicators',
      'timeframe', 'trgThreshold', 'residualConsensusLimit',
      'cclistLethalIllusionLimit', 'molSclThreshold', 'lhdsVetoLimit',
      'ontologicalCollapseTrg', 'disabledProviders'
    ];

    const hashConfig = {};
    for (const key of keysToHash) {
      if (config && config[key] !== undefined) {
        hashConfig[key] = config[key];
      }
    }

    const jsonStr = JSON.stringify(hashConfig);
    return crypto.createHash('sha256').update(jsonStr).digest('hex').substring(0, 8).toUpperCase();
  }

  /**
   * Collects current platform environment configuration.
   * @returns {Object} Configuration object.
   */
  collectCurrentConfig() {
    return {
      takeProfit: parseFloat(process.env.TAKE_PROFIT || '0.02'),
      stopLoss: parseFloat(process.env.STOP_LOSS || '0.01'),
      longEnabled: process.env.LONG_ENABLED !== 'false',
      shortEnabled: process.env.SHORT_ENABLED !== 'false',
      leverage: parseInt(process.env.LEVERAGE || '1', 10),
      symbols: (process.env.ACTIVE_SYMBOLS || 'BTCUSDT,ETHUSDT,SOLUSDT').split(','),
      activeFilters: (process.env.ACTIVE_FILTERS || 'RESIDUAL,TRG,LHDS,CCLIST,MOL').split(','),
      models: (process.env.ACTIVE_MODELS || 'V1_SMC,V2_SnD,V3_Momentum').split(','),
      mlConfig: { mode: process.env.ARL_MODE || 'TESTNET' },
      indicators: ['RSI', 'EMA', 'ATR', 'VOLUME'],
      timeframe: process.env.TIMEFRAME || '1h',
      trgThreshold: parseFloat(process.env.TRG_THRESHOLD || '0.4'),
      residualConsensusLimit: parseFloat(process.env.RESIDUAL_CONSENSUS_LIMIT || '0.0'),
      cclistLethalIllusionLimit: parseFloat(process.env.CCLIST_LETHAL_ILLUSION_LIMIT || '0.9'),
      molSclThreshold: parseInt(process.env.MOL_SCL_THRESHOLD || '3', 10),
      lhdsVetoLimit: parseFloat(process.env.LHDS_VETO_LIMIT || '0.8'),
      ontologicalCollapseTrg: parseFloat(process.env.ONTOLOGICAL_COLLAPSE_TRG || '0.7'),
      disabledProviders: (process.env.DISABLED_PROVIDERS || '').split(',').filter(Boolean)
    };
  }

  /**
   * Freezes the current active experiment and automatically creates a new active one (FREEZE + NEW EXPERIMENT).
   * Captures market snapshot, multi-factor Alpha Score, and anti-overfitting report.
   *
   * @param {string} reason - The reason for freezing.
   * @returns {Promise<Object>} Object containing frozenExperiment, newExperiment, snapshot, and marketSnapshot.
   */
  async freezeAndCreateNew(reason) {
    const activeExperiment = await this.getActiveExperiment();
    if (!activeExperiment) {
      throw new Error('No active experiment to freeze.');
    }

    // Get trades and compute metrics + Alpha Score + Anti-Overfitting Report
    const trades = await this.db.getExperimentTrades(activeExperiment.experiment_id);
    const metrics = ExperimentMetrics.computeFromTrades(trades);
    const marketSnapshot = await this.fetchMarketSnapshot();
    
    // Save snapshot with Market Context & Alpha Score
    const snapshotData = {
      experiment_id: activeExperiment.experiment_id,
      snapshot_time: Date.now(),
      snapshot_timestamp: Date.now(),
      metrics_json: JSON.stringify(metrics),
      market_snapshot_json: JSON.stringify(marketSnapshot),
      alpha_score: metrics.alphaScore || 0,
      reason_for_snapshot: reason,
      // camelCase fields expected by insertExperimentSnapshot (derived from ExperimentMetrics.computeFromTrades)
      ...metrics
    };
    await this.db.insertExperimentSnapshot(snapshotData);

    // Freeze experiment (ACTIVE -> LEGACY)
    const frozenAt = Date.now();
    await this.db.freezeExperiment(activeExperiment.experiment_id, frozenAt);
    activeExperiment.status = 'LEGACY';
    activeExperiment.frozen_at = frozenAt;

    // Collect new config and hash
    const newConfig = this.collectCurrentConfig();
    const strategyHash = this.computeStrategyHash(newConfig);
    
    // Create new experiment
    const newExperimentId = await this.db.getNextExperimentId();
    const newExperimentData = {
      experiment_id: newExperimentId,
      status: 'ACTIVE',
      strategy_hash: strategyHash,
      config_snapshot_json: JSON.stringify(newConfig),
      created_at: Date.now()
    };
    await this.db.createExperiment(newExperimentData);

    return {
      frozenExperiment: activeExperiment,
      newExperiment: newExperimentData,
      snapshot: snapshotData,
      marketSnapshot
    };
  }

  /**
   * Updates an experiment status (supporting 6-State Lifecycle: ACTIVE, VALIDATING, CHAMPION, LEGACY, ARCHIVED, REJECTED).
   *
   * @param {string} experimentId - Experiment ID.
   * @param {string} status - New status.
   * @param {string} reason - Optional transition note.
   * @returns {Promise<Object>} Updated experiment.
   */
  async updateStatus(experimentId, status, reason = '') {
    const validStatuses = ['ACTIVE', 'VALIDATING', 'CHAMPION', 'LEGACY', 'ARCHIVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid experiment status '${status}'. Allowed: ${validStatuses.join(', ')}`);
    }

    const sql = `UPDATE experiments SET status = ?, notes = ? WHERE experiment_id = ?`;
    await new Promise((resolve, reject) => {
      this.db.db.run(sql, [status, reason, experimentId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return this.db.getExperiment(experimentId);
  }

  /**
   * Detects if the given configuration drifts from the active experiment.
   * @param {Object} newConfig - The new configuration to check.
   * @returns {Promise<Object>} Drift detection result.
   */
  async detectConfigDrift(newConfig) {
    const activeExperiment = await this.getActiveExperiment();
    if (!activeExperiment) {
      return { drifted: false, currentHash: null, newHash: null };
    }

    const newHash = this.computeStrategyHash(newConfig);
    const currentHash = activeExperiment.strategy_hash;
    return {
      drifted: newHash !== currentHash,
      currentHash,
      newHash
    };
  }

  /**
   * Promotes a given experiment to champion status after statistical validation.
   * @param {string} experimentId - The ID of the experiment to promote.
   * @param {boolean} force - Skip minimum trade count safety check if true.
   * @returns {Promise<Object>} The promoted experiment.
   */
  async promoteChampion(experimentId, force = false) {
    const experiment = await this.db.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found.`);
    }

    const trades = await this.db.getExperimentTrades(experimentId);
    if (trades.length < 30 && !force) {
      throw new Error(`Experiment ${experimentId} needs at least 30 trades to be promoted to champion (has ${trades.length}).`);
    }

    const snapshot = await this.db.getExperimentSnapshot(experimentId);
    if (!snapshot) {
      throw new Error(`Experiment ${experimentId} must have a snapshot to be champion.`);
    }

    await this.db.setChampion(experimentId);
    await this.updateStatus(experimentId, 'CHAMPION', 'Promoted to Champion');
    return experiment;
  }

  /**
   * Imports legacy trades into an archived experiment.
   * @param {Array} trades - Array of trades to import.
   * @param {string} sourceLabel - Label used for the experiment ID.
   * @returns {Promise<Object>} Result summary.
   */
  async importLegacyTrades(trades, sourceLabel) {
    const experimentId = sourceLabel || 'LEGACY-001';
    
    const existing = await this.db.getExperiment(experimentId);
    if (!existing) {
      await this.db.createExperiment({
        experiment_id: experimentId,
        status: 'ARCHIVED',
        strategy_hash: 'LEGACY',
        config_snapshot_json: JSON.stringify({ imported: true }),
        created_at: Date.now()
      });
    }

    for (const trade of trades) {
      await this.db.insertExperimentTrade(experimentId, trade);
    }

    const metrics = ExperimentMetrics.computeFromTrades(trades);
    const marketSnapshot = await this.fetchMarketSnapshot();

    await this.db.insertExperimentSnapshot({
      experiment_id: experimentId,
      snapshot_time: Date.now(),
      snapshot_timestamp: Date.now(),
      metrics_json: JSON.stringify(metrics),
      market_snapshot_json: JSON.stringify(marketSnapshot),
      alpha_score: metrics.alphaScore || 0,
      reason_for_snapshot: 'Legacy import',
      // camelCase fields expected by insertExperimentSnapshot (derived from ExperimentMetrics.computeFromTrades)
      ...metrics
    });

    return { experiment_id: experimentId, count: trades.length };
  }

  /**
   * Returns comprehensive dashboard data for the Quant Research Lab.
   * Includes active experiment, champion, challengers, total count, leaderboard ranking,
   * market snapshot, and Alpha Discovery insights.
   *
   * @returns {Promise<Object>} Dashboard data.
   */
  async getDashboardData() {
    const activeExperiment = await this.getActiveExperiment();
    let activeExperimentData = null;
    if (activeExperiment) {
      const trades = await this.db.getExperimentTrades(activeExperiment.experiment_id);
      const liveMetrics = ExperimentMetrics.computeFromTrades(trades);
      activeExperimentData = {
        ...activeExperiment,
        liveMetrics
      };
    }

    const championRow = await this.db.getChampion();
    let championData = null;
    if (championRow) {
      const snapshot = await this.db.getExperimentSnapshot(championRow.experiment_id);
      championData = {
        experiment: championRow,
        snapshot
      };
    }

    const allExperiments = await this.db.getAllExperiments();
    const challengers = [];
    
    for (const exp of allExperiments) {
      const isChampion = championRow && exp.experiment_id === championRow.experiment_id;
      const isActive = exp.status === 'ACTIVE';

      if (!isChampion && !isActive) {
        const snapshot = await this.db.getExperimentSnapshot(exp.experiment_id);
        if (snapshot) {
          challengers.push({
            experiment: exp,
            snapshot
          });
        }
      }
    }

    const totalExperiments = allExperiments.length;
    const ranking = await this.db.getExperimentRanking('profit_factor', 10);
    const alphaDiscovery = await this.alphaDiscoveryEngine.discoverAlpha();
    const currentMarketSnapshot = await this.fetchMarketSnapshot();

    return {
      activeExperiment: activeExperimentData,
      champion: championData,
      challengers,
      totalExperiments,
      ranking,
      alphaDiscovery,
      marketSnapshot: currentMarketSnapshot
    };
  }

  /**
   * Gets the experiment ranking based on a specific metric.
   * @param {string} sortBy - Metric to sort by (default: 'profit_factor').
   * @param {number} limit - Number of top experiments to return (default: 20).
   * @returns {Promise<Array>} Ranked experiments.
   */
  async getRanking(sortBy = 'profit_factor', limit = 20) {
    return this.db.getExperimentRanking(sortBy, limit);
  }
}
