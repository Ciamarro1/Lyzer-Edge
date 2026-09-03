import { ResidualizationLayer } from '../../../lyzer-shared/src/engine/residualization.js';
import { ExecutionTriggerLayer } from '../../../lyzer-shared/src/engine/executionTriggerLayer.js';

/**
 * Truth Kernel - Anti-Consensus / Residualization (Phase 2D/2E)
 * Single Source of Truth Consolidated Edition
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Destroy Consensus (SCD)
 * 2. Extract Divergence (RL)
 * 3. Only execute on severe geometric asymmetry (ETT)
 * 4. Outputs: DVF, TRG, EEF (No directional prediction)
 */
export class TruthKernel {
  constructor(options = {}) {
    // Consolidated legacy masterSwitchThreshold fallback mapping to trgThreshold
    const trgThreshold = options.trgThreshold != null ? options.trgThreshold : (options.masterSwitchThreshold != null ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold != null ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
    this.dynamicLimitsEnabled = options.dynamicLimits !== false;
    this.minLhdsVetoLimit = options.minLhdsVetoLimit != null ? options.minLhdsVetoLimit : 0.50;
    this.maxLhdsVetoLimit = options.maxLhdsVetoLimit != null ? options.maxLhdsVetoLimit : 0.95;
    this.minOntologicalCollapseTrg = options.minOntologicalCollapseTrg != null ? options.minOntologicalCollapseTrg : 0.40;
    this.maxOntologicalCollapseTrg = options.maxOntologicalCollapseTrg != null ? options.maxOntologicalCollapseTrg : 0.90;
  }

  /**
   * Computes runtime dynamic limits based on market volatility and regime.
   * If micro is missing or contains no volatility indicators, returns base limits (100% backward compatible).
   *
   * @param {Object} [micro={}] - Microstructure metrics { atrRatio, volatilityRatio, atr14_pct, oppScore, ... }
   * @returns {Object} Dynamic limits and metadata.
   */
  computeDynamicLimits(micro = {}) {
    if (!micro || typeof micro !== 'object' || !this.dynamicLimitsEnabled) {
      return {
        lhdsVetoLimit: this.lhdsVetoLimit,
        ontologicalCollapseTrg: this.ontologicalCollapseTrg,
        effectiveLhdsVetoLimit: this.lhdsVetoLimit,
        effectiveOntologicalCollapseTrg: this.ontologicalCollapseTrg,
        volatilityFactor: 1.0,
        volatilityMultiplier: 1.0,
        isDynamic: false
      };
    }

    let volFactor = 1.0;
    let hasVolatilityMetric = false;

    if (typeof micro.volatilityRatio === 'number' && Number.isFinite(micro.volatilityRatio) && micro.volatilityRatio > 0) {
      volFactor = 1.0 + 0.12 * (micro.volatilityRatio - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.atrRatio === 'number' && Number.isFinite(micro.atrRatio) && micro.atrRatio > 0) {
      volFactor = 1.0 + 0.12 * (micro.atrRatio - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.expansionFactor === 'number' && Number.isFinite(micro.expansionFactor) && micro.expansionFactor > 0) {
      volFactor = 1.0 + 0.12 * (micro.expansionFactor - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.atr14_pct === 'number' && Number.isFinite(micro.atr14_pct) && micro.atr14_pct > 0) {
      const baseline = 0.00055;
      volFactor = 1.0 + 0.12 * (micro.atr14_pct / baseline - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.oppScore === 'number' && Number.isFinite(micro.oppScore)) {
      volFactor = 1.0 + (micro.oppScore - 1) * 0.06;
      hasVolatilityMetric = true;
    } else {
      const regimeStr = (typeof micro.regime === 'string' ? micro.regime : (typeof micro.weights?.activeRegime === 'string' ? micro.weights.activeRegime : '')).toUpperCase();
      if (regimeStr) {
        if (regimeStr.includes('NEWS') || regimeStr.includes('SHOCK')) {
          volFactor = 1.17;
          hasVolatilityMetric = true;
        } else if (regimeStr.includes('EXPANSION') || regimeStr.includes('HIGH_VOLATILITY') || regimeStr.includes('TREND') || regimeStr.includes('BREAKOUT')) {
          volFactor = 1.10;
          hasVolatilityMetric = true;
        } else if (regimeStr.includes('COMPRESSION') || regimeStr.includes('LOW_LIQUIDITY') || regimeStr.includes('RANGE') || regimeStr.includes('RANGING') || regimeStr.includes('CHOP')) {
          volFactor = 0.90;
          hasVolatilityMetric = true;
        }
      }
    }

    if (!hasVolatilityMetric) {
      return {
        lhdsVetoLimit: this.lhdsVetoLimit,
        ontologicalCollapseTrg: this.ontologicalCollapseTrg,
        effectiveLhdsVetoLimit: this.lhdsVetoLimit,
        effectiveOntologicalCollapseTrg: this.ontologicalCollapseTrg,
        volatilityFactor: 1.0,
        volatilityMultiplier: 1.0,
        isDynamic: false
      };
    }

    // Volatility factor bounding
    volFactor = Math.min(2.0, Math.max(0.5, volFactor));

    // Dynamic scaled limits
    const rawLhds = this.lhdsVetoLimit * volFactor;
    const rawCollapse = this.ontologicalCollapseTrg * volFactor;

    // Enforce safety clamping: lhdsVetoLimit in [0.50, 0.95], ontologicalCollapseTrg in [0.40, 0.90]
    const dynamicLhds = Math.min(this.maxLhdsVetoLimit, Math.max(this.minLhdsVetoLimit, rawLhds));
    const dynamicCollapse = Math.min(this.maxOntologicalCollapseTrg, Math.max(this.minOntologicalCollapseTrg, rawCollapse));

    return {
      lhdsVetoLimit: dynamicLhds,
      ontologicalCollapseTrg: dynamicCollapse,
      effectiveLhdsVetoLimit: dynamicLhds,
      effectiveOntologicalCollapseTrg: dynamicCollapse,
      volatilityFactor: volFactor,
      volatilityMultiplier: volFactor,
      isDynamic: true
    };
  }

  /**
   * Evaluates the graph of engine outputs.
   * Destroy the aggregation illusion. Extract the residual.
   * @param {Object} providers - Dictionary containing V1 and V2 outputs.
   * @param {Object} micro - Microstructure data.
   * @returns {Object} Final contract matching CRSA.
   */
  evaluate(providers, micro = {}) {
    const v1 = providers.v1;
    const v2 = providers.v2;
    const v3 = providers.v3;
    const v4 = providers.v4;
    const v5 = providers.v5;
    const v6 = providers.v6;
    const v7 = providers.v7;
    const v8 = providers.v8 !== undefined ? providers.v8 : providers.quant;

    // 1. Compute dynamic limits for this tick
    const dynamicLimits = this.computeDynamicLimits(micro);
    const effectiveLhdsLimit = dynamicLimits.lhdsVetoLimit;
    const effectiveCollapseLimit = dynamicLimits.ontologicalCollapseTrg;

    // 2. Residualization & Consensus Destruction across all active engines (V1-V8)
    const providerList = [v1, v2, v3, v4, v5, v6, v7, v8].filter(p => p !== undefined && p !== null);
    const { dvf, trg } = this.rl.evaluate(...providerList, micro);

    // 3. Execution Trigger Evaluation
    let { eef, reason } = this.ett.evaluate(trg);

    if (dvf.isConsensus) {
      eef = false;
      reason = 'BLOCKED_BY_FALSE_CONSENSUS';
    }

    // 4. Ontological Confidence Limits (OCL) with dynamic limits
    const sds = (micro && micro.scaleDivergence) || 0.0;
    const lhds = (micro && micro.lhds) || 0.0;
    let epistemicAuthority = 'UNKNOWN';
    
    if (lhds > effectiveLhdsLimit) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_REALITY_DIVERGENCE';
    } else {
      // Microstructure OOS-11 Filter (applied in production or when explicitly enforced)
      const enforceOos = String(process.env.ENFORCE_OOS11_RULES) === 'true' || String(micro?.enforceOos11) === 'true' || micro?.enforceOos11 === 1;
      let oosBlocked = false;
      if (enforceOos) {
        const oppScore = micro?.oppScore || 0;
        const imbalance = micro?.imbalance || 0;
        const direction = (Math.abs(dvf.tension) < 1e-8) ? 'FLAT' : (dvf.tension > 0 ? 'LONG' : 'SHORT');
        
        if (direction === 'FLAT') {
          epistemicAuthority = 'VETO';
          eef = false;
          reason = 'VETO_FLAT_DIVERGENCE';
          oosBlocked = true;
        } else if (direction === 'SHORT') {
          epistemicAuthority = 'VETO';
          eef = false;
          reason = 'VETO_SHORT_SELLING_DISABLED';
          oosBlocked = true;
        } else if (direction === 'LONG' && !(oppScore >= 2 && imbalance > 0.8)) {
          epistemicAuthority = 'VETO';
          eef = false;
          reason = 'VETO_INSUFFICIENT_IMBALANCE';
          oosBlocked = true;
        }
      }
      
      if (!oosBlocked) {
        if (sds < 0.3) {
          epistemicAuthority = 'OBSERVED';
        } else if (sds <= 0.7) {
          epistemicAuthority = 'INFERRED';
        } else {
          // SDS > 0.7 - Dynamic Ontological Collapse Check
          if (trg.trg >= effectiveCollapseLimit) {
            epistemicAuthority = 'VETO';
            eef = false; // Constitutional override
            reason = 'VETO_ONTOLOGICAL_COLLAPSE';
          } else {
            epistemicAuthority = 'INFERRED';
          }
        }
      }
    }

    // C2 Fix: TruthKernel Observer Divergence Metric (ODM) Veto
    if (eef && micro?.odm !== undefined && micro.odm >= 0.60) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_OBSERVER_DIVERGENCE_ODM';
    }

    // ENTRY PURIFICATION VETO (Experiment 3.5 Frozen Hypothesis)
    // Frozen threshold: SMA20 extension < 0.10%, ATR < 0.12%
    const atrLimit = 0.0012; // 0.12%
    const smaLimit = 0.0010; // 0.10%
    
    if (eef && micro && micro.atr14_pct !== undefined && micro.sma20DistancePct !== undefined) {
      const isHighAtr = micro.atr14_pct > atrLimit;
      const isOverExtended = micro.sma20DistancePct > smaLimit;
      
      if (isHighAtr && isOverExtended) {
        epistemicAuthority = 'VETO';
        eef = false;
        reason = 'ENTRY_VETO_SMA_AND_ATR';
      } else if (isHighAtr) {
        epistemicAuthority = 'VETO';
        eef = false;
        reason = 'ENTRY_VETO_HIGH_ATR';
      } else if (isOverExtended) {
        epistemicAuthority = 'VETO';
        eef = false;
        reason = 'ENTRY_VETO_OVEREXTENSION_SMA';
      }
    }

    // 5. Output pure tensor data, no "signal" prediction
    return {
      dvf: dvf.divergence,
      tension: dvf.tension,
      isConsensus: dvf.isConsensus,
      trg: trg.trg,
      eef,
      reason_codes: [reason],
      epistemic_authority: epistemicAuthority,
      dynamic_limits: dynamicLimits,
      raw_metrics: {
        v1_confidence: v1?.confidence || 0,
        v2_confidence: v2?.confidence || 0,
        liquidity_vacuum: micro?.liquidityDivergence || 1.0,
        scale_divergence: sds,
        dynamic_limits: dynamicLimits,
        lhds_veto_limit: effectiveLhdsLimit,
        ontological_collapse_trg: effectiveCollapseLimit
      }
    };
  }
}
