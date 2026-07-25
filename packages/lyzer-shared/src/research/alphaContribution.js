import { ReplayEngine } from './replayEngine.js';
import { StatisticalValidator } from './statisticalValidator.js';

export class AlphaContributionBenchmark {
  /**
   * @param {Object} baselineConfig The baseline configuration
   */
  constructor(baselineConfig = {}) {
    this.baselineConfig = {
      disabledProviders: [],
      consensusLimit: 0.1,
      trgThreshold: 0.4,
      trgExponent: 2,
      lhdsVetoLimit: 0.8,
      ...baselineConfig
    };
    this.validator = new StatisticalValidator();
    this.experiments = this._defineExperiments();
  }

  _defineExperiments() {
    return [
      { name: 'V1 Ablation', config: { disabledProviders: ['V1'] } },
      { name: 'V2 Ablation', config: { disabledProviders: ['V2'] } },
      { name: 'V3 Ablation', config: { disabledProviders: ['V3'] } },
      { name: 'V4 Ablation', config: { disabledProviders: ['V4'] } },
      { name: 'Consensus Destruction', config: { consensusLimit: 0 } },
      { name: 'TRG Threshold 0.1', config: { trgThreshold: 0.1 } },
      { name: 'TRG Threshold 0.2', config: { trgThreshold: 0.2 } },
      { name: 'TRG Threshold 0.3', config: { trgThreshold: 0.3 } },
      { name: 'TRG Threshold 0.4', config: { trgThreshold: 0.4 } },
      { name: 'TRG Threshold 0.5', config: { trgThreshold: 0.5 } },
      { name: 'TRG Threshold 0.6', config: { trgThreshold: 0.6 } },
      { name: 'TRG Threshold 0.7', config: { trgThreshold: 0.7 } },
      { name: 'TRG Threshold 0.8', config: { trgThreshold: 0.8 } },
      { name: 'TRG Exponent 2', config: { trgExponent: 2 } },
      { name: 'TRG Exponent 4', config: { trgExponent: 4 } },
      { name: 'LHDS Veto 0.5', config: { lhdsVetoLimit: 0.5 } },
      { name: 'LHDS Veto 0.6', config: { lhdsVetoLimit: 0.6 } },
      { name: 'LHDS Veto 0.7', config: { lhdsVetoLimit: 0.7 } },
      { name: 'LHDS Veto 0.8', config: { lhdsVetoLimit: 0.8 } },
      { name: 'LHDS Veto 0.9', config: { lhdsVetoLimit: 0.9 } },
      { name: 'C-CLIST Stress Oracle Disable', config: { disableStressOracle: true } },
      { name: 'MOL Recovery Gate Disable', config: { disableRecoveryGate: true } }
    ];
  }

  /**
   * Run the ablation benchmark suite against a dataset of ticks
   * @param {Array} ticks 
   */
  async runBenchmark(candles) {
    const baselineEngine = new ReplayEngine(this.baselineConfig);
    const baselineResult = baselineEngine.replay(candles);
    const results = [];

    for (const exp of this.experiments) {
      const expConfig = { ...this.baselineConfig, ...exp.config };
      
      // Some providers need to be appended rather than overwritten
      if (exp.config.disabledProviders) {
        expConfig.disabledProviders = [
          ...this.baselineConfig.disabledProviders,
          ...exp.config.disabledProviders
        ];
      }

      const expEngine = new ReplayEngine(expConfig);
      const expResult = expEngine.replay(candles);

      // Compare returns/trades statistically
      const comparison = this.validator.compare(
        baselineResult.trades || [],
        expResult.trades || []
      );
      
      const baseStats = baselineResult.stats || {};
      const expStats = expResult.stats || {};
      
      const delta = {
        sharpe: (expStats.sharpe || 0) - (baseStats.sharpe || 0),
        winRate: (expStats.winRate || 0) - (baseStats.winRate || 0),
        maxDD: (expStats.maxDrawdown || 0) - (baseStats.maxDrawdown || 0),
        profitFactor: (expStats.profitFactor || 0) - (baseStats.profitFactor || 0)
      };

      const classification = this._classify(delta, comparison);

      results.push({
        component: exp.name,
        baseline: baseStats,
        experiment: expStats,
        delta,
        classification,
        pValue: comparison.welchTest?.pValue || 1.0,
        tStatistic: comparison.welchTest?.tStatistic || 0.0
      });
    }

    return { results };
  }

  _classify(delta, comparison) {
    const isSignificant = comparison.welchTest?.isSignificant || false;
    
    // If there is no statistical significance, it might just be noise filter or unproven
    if (!isSignificant) {
        return (Math.abs(delta.sharpe) < 0.05) ? 'UNPROVEN' : 'NOISE_FILTER';
    }
    
    // When an ablation (removal) reduces Sharpe/WinRate significantly -> CORE_ALPHA
    if (delta.sharpe <= -0.1) return 'CORE_ALPHA';
    
    // When an ablation (removal) increases max drawdown significantly -> RISK_FILTER
    if (delta.maxDD >= 0.05) return 'RISK_FILTER';
    
    // When an ablation (removal) increases Sharpe/WinRate significantly -> NEGATIVE_VALUE
    if (delta.sharpe >= 0.1) return 'NEGATIVE_VALUE'; 
    
    return 'UNPROVEN';
  }
}
