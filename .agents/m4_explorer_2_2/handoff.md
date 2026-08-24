# Handoff Report: Milestone 4 (Requirement R4) — TruthKernel Dynamic Limits

> **Explorer 2 Report**  
> **Target Milestone**: Milestone 4 — TruthKernel Dynamic Limits (`packages/lyzer-constitution/src/eca/truthKernel.js`)  
> **Scope**: Epistemic reality divergence limits (`lhdsVetoLimit`), Ontological collapse thresholds (`ontologicalCollapseTrg`), Market regime transitions (Expansion, Compression, News Shock), and Mathematical Clamping Bounds ($[0.50, 0.95]$ and $[0.40, 0.90]$).

---

## 1. Observation

### 1.1 TruthKernel Code Architecture
- **Location**: `packages/lyzer-constitution/src/eca/truthKernel.js` (Lines 1–134)
- **Re-exports**:
  - `packages/lyzer-shared/src/engine/kernel.js:1` (`export { TruthKernel } from '../../../lyzer-constitution/src/eca/truthKernel.js';`)
  - `lyzer edge/src/engine/kernel.js:5` (`export { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';`)
- **Current Constructor Implementation** (`truthKernel.js:15-25`):
  ```javascript
  constructor(options = {}) {
    const trgThreshold = options.trgThreshold != null ? options.trgThreshold : (options.masterSwitchThreshold != null ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold != null ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
  }
  ```
- **Current Veto & Collapse Logic** (`truthKernel.js:56-107`):
  ```javascript
  const sds = micro.scaleDivergence || 0.0;
  const lhds = micro.lhds || 0.0;
  let epistemicAuthority = 'UNKNOWN';
  
  if (lhds > this.lhdsVetoLimit) {
    epistemicAuthority = 'VETO';
    eef = false;
    reason = 'VETO_REALITY_DIVERGENCE';
  } else {
    // ...
    if (!oosBlocked) {
      if (sds < 0.3) {
        epistemicAuthority = 'OBSERVED';
      } else if (sds <= 0.7) {
        epistemicAuthority = 'INFERRED';
      } else {
        // SDS > 0.7 - Check for total structural collapse
        if (trg.trg >= this.ontologicalCollapseTrg) {
          epistemicAuthority = 'VETO';
          eef = false; // Constitutional override
          reason = 'VETO_ONTOLOGICAL_COLLAPSE';
        } else {
          epistemicAuthority = 'INFERRED';
        }
      }
    }
  }
  ```

### 1.2 Calling Pipeline & Available Microstructure Signals
- **File**: `lyzer edge/backend/streamEngine.js`
  - Line 749: `const dynamicWeights = this.weightMatrix.evaluate(topographicalAtr, v6Sig?.regime || v6Sig?.signal, utcHours);`
  - Line 768: `const oppScore = this.calculateOpportunityScore(candle);` (evaluates `atr14_pct >= 0.00055`, `volume_zscore >= 0.315`, `distance_vwap >= 0.00963`)
  - Line 784: `const kernelResult = this.truthKernel.evaluate(providers, { liquidityDivergence, scaleDivergence: sds, lhds, invariants, distanceFromGoldenZone, weights: dynamicWeights, oppScore, imbalance, odm: observerDivergence.odm });`
- **File**: `packages/lyzer-shared/src/research/regimeClassifier.js`
  - Computes `atrRatio = shortATR / (longATR || 1)` (10-bar ATR vs 30-bar ATR), `compressionRatio`, `directionalBias`, and identifies market regimes:
    - `'COMPRESSION'` (`atrRatio < 0.7 && compressionRatio < 0.5`)
    - `'EXPANSION'` (`atrRatio > 1.3 && Math.abs(directionalBias) > 0.4`)
    - `'NEWS_SHOCK'` (`atrRatio > 2.0`)
    - `'TREND_BULLISH'` / `'TREND_BEARISH'`
    - `'RANGE_WIDE'` / `'RANGE_NARROW'`
- **File**: `packages/lyzer-shared/src/engine/weightMatrix.js`
  - Detects active regimes: `'HIGH_VOLATILITY'`, `'LOW_LIQUIDITY_NIGHT'`, `'RANGING'`, `'BALANCED'`.

### 1.3 Baseline Test Status
- Executed `npm.cmd test` in `lyzer edge/`:
  - **143 test files passed**, 10 skipped, **608 tests passed**.
- Executed `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`:
  - **126 tests passed** (including 5 Tier 1 LHDS tests and 5 Tier 1 Collapse tests).
- Executed `npm.cmd run test:verify`:
  - **6 test files passed**, **39 tests passed**.

---

## 2. Logic Chain

1. **Static Threshold Vulnerability**:
   - `lhdsVetoLimit` fixed at $0.80$ (or $0.95$) and `ontologicalCollapseTrg` fixed at $0.70$ are static and market-blind.
   - During **high-volatility expansion**, elevated cross-timeframe dispersion and feed latency cause $LHDS$ to naturally rise to $0.82 - 0.88$. A rigid $0.80$ threshold creates false-positive vetoes (`VETO_REALITY_DIVERGENCE`), suppressing high-probability trend momentum entries.
   - Conversely, during **low-volatility compression**, low trading volume and spoofing create subtle divergence traps where an $LHDS$ of $0.75$ is dangerously anomalous. A rigid $0.80$ threshold fails to veto these false liquidity traps.
   - When scale divergence $SDS > 0.7$ occurs during low volatility, multiple signal engines disagreeing in a dead market is a critical red flag; a static $0.70$ collapse threshold allows noisy execution. In high volatility, healthy engine divergence generates TRG $> 0.70$, causing premature collapse vetoes.

2. **Adaptive Volatility Factor ($V_f$) Derivation**:
   - To make thresholds dynamic without coupling `truthKernel.js` to specific external modules, `computeDynamicLimits(micro)` must ingest multiple polymorphic indicators from the `micro` object with a robust priority hierarchy:
     1. `micro.volatilityRatio` (normalized float)
     2. `micro.atrRatio` ($ATR_{10} / ATR_{30}$, baseline $1.0$)
     3. `micro.expansionFactor` (volatility expansion multiplier)
     4. `micro.atr14_pct` (relative ATR normalized by baseline $0.00055$)
     5. `micro.oppScore` ($0..3$ score mapped to $[0.85, 1.30]$ via $0.85 + 0.15 \times \text{oppScore}$)
     6. `micro.regime` or `micro.weights?.activeRegime` (string mapping: `'EXPANSION'`/`'HIGH_VOLATILITY'` $\rightarrow 1.25$, `'COMPRESSION'`/`'LOW_LIQUIDITY_NIGHT'`/`'RANGING'` $\rightarrow 0.80$, `'NEWS_SHOCK'` $\rightarrow 1.40$)
     7. Default: $V_f = 1.0$ (when no metrics provided).
   - $V_f$ is strictly bounded: $V_f = \min(1.80, \max(0.60, V_f))$.

3. **Sub-Linear Mathematical Modulation**:
   - Linear threshold adjustments risk runaway behavior. We apply sub-linear concave power scalings:
     $$L_{\text{raw}} = L_{\text{base}} \times V_f^{0.5}$$
     $$C_{\text{raw}} = C_{\text{base}} \times V_f^{0.75}$$
   - When $V_f = 1.0$, $L_{\text{raw}} = L_{\text{base}} \times 1.0 = L_{\text{base}}$ and $C_{\text{raw}} = C_{\text{base}} \times 1.0 = C_{\text{base}}$, guaranteeing exact backward compatibility.

4. **Guaranteed Clamping Boundaries**:
   - To protect against numerical instability, floating-point divergence, or pathological market conditions:
     $$L_{\text{dynamic}} = \max\left(0.50, \; \min\left(0.95, \; L_{\text{raw}}\right)\right)$$
     $$C_{\text{dynamic}} = \max\left(0.40, \; \min\left(0.90, \; C_{\text{raw}}\right)\right)$$
   - Minimum LHDS ($0.50$): Prevents system paralysis from routine feed noise.
   - Maximum LHDS ($0.95$): Guarantees that near-total reality detachment ($LHDS > 0.95$) is ALWAYS vetoed.
   - Minimum Collapse TRG ($0.40$): Prevents false collapse vetoes on single-engine signals ($(0.7)^2 = 0.49$).
   - Maximum Collapse TRG ($0.90$): Guarantees that catastrophic multi-scale fracturing ($SDS > 0.7, TRG \ge 0.90$) is unconditionally vetoed.

5. **Transparency & Auditability**:
   - `evaluate()` returns `dynamic_limits: { lhdsVetoLimit, ontologicalCollapseTrg, volatilityFactor }`, allowing Causal Memory (`db.insertCausalEvent`) and Spectrogram UI to record the exact active limits for every tick.

---

## 3. Caveats

1. **Backwards Compatibility**:
   - Existing tests and caller code pass `{ lhdsVetoLimit: 0.4 }` or omit `micro`. The dynamic calculator MUST preserve these base values when $V_f = 1.0$ and respect `options.dynamicLimits === false` if dynamically disabled.
2. **Deterministic Inputs**:
   - All calculations must sanitize `NaN`, `Infinity`, negative numbers, or `null` values by falling back cleanly to $V_f = 1.0$.
3. **No Side-Effects in Causal Memory**:
   - Dynamic threshold adjustments are computed statelessly per tick from `micro` and do not alter internal state between evaluations.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Implementation Blueprint for `truthKernel.js`

```javascript
// packages/lyzer-constitution/src/eca/truthKernel.js

import { ResidualizationLayer } from '../../../lyzer-shared/src/engine/residualization.js';
import { ExecutionTriggerLayer } from '../../../lyzer-shared/src/engine/executionTriggerLayer.js';

/**
 * Truth Kernel - Anti-Consensus / Residualization (Phase 2D/2E)
 * Single Source of Truth Consolidated Edition with Volatility-Adaptive Dynamic Limits (R4)
 */
export class TruthKernel {
  constructor(options = {}) {
    const trgThreshold = options.trgThreshold != null ? options.trgThreshold : (options.masterSwitchThreshold != null ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold != null ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);

    // Base limits
    this.baseLhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
    this.baseOntologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;

    // Dynamic bounds & controls
    this.dynamicLimitsEnabled = options.dynamicLimits !== false;
    this.minLhdsVetoLimit = options.minLhdsVetoLimit != null ? options.minLhdsVetoLimit : 0.50;
    this.maxLhdsVetoLimit = options.maxLhdsVetoLimit != null ? options.maxLhdsVetoLimit : 0.95;
    this.minOntologicalCollapseTrg = options.minOntologicalCollapseTrg != null ? options.minOntologicalCollapseTrg : 0.40;
    this.maxOntologicalCollapseTrg = options.maxOntologicalCollapseTrg != null ? options.maxOntologicalCollapseTrg : 0.90;

    // Instance property aliases for backwards compatibility
    this.lhdsVetoLimit = this.baseLhdsVetoLimit;
    this.ontologicalCollapseTrg = this.baseOntologicalCollapseTrg;
  }

  /**
   * Computes runtime dynamic limits based on market volatility and regime.
   * @param {Object} micro - Microstructure data.
   * @returns {Object} { lhdsVetoLimit, ontologicalCollapseTrg, volatilityFactor, isDynamic }
   */
  computeDynamicLimits(micro = {}) {
    if (!this.dynamicLimitsEnabled) {
      return {
        lhdsVetoLimit: this.baseLhdsVetoLimit,
        ontologicalCollapseTrg: this.baseOntologicalCollapseTrg,
        volatilityFactor: 1.0,
        isDynamic: false
      };
    }

    let volFactor = 1.0;
    if (typeof micro.volatilityRatio === 'number' && Number.isFinite(micro.volatilityRatio) && micro.volatilityRatio > 0) {
      volFactor = Math.min(1.8, Math.max(0.6, micro.volatilityRatio));
    } else if (typeof micro.atrRatio === 'number' && Number.isFinite(micro.atrRatio) && micro.atrRatio > 0) {
      volFactor = Math.min(1.8, Math.max(0.6, micro.atrRatio));
    } else if (typeof micro.expansionFactor === 'number' && Number.isFinite(micro.expansionFactor) && micro.expansionFactor > 0) {
      volFactor = Math.min(1.8, Math.max(0.6, micro.expansionFactor));
    } else if (typeof micro.atr14_pct === 'number' && Number.isFinite(micro.atr14_pct) && micro.atr14_pct > 0) {
      volFactor = Math.min(1.8, Math.max(0.6, micro.atr14_pct / 0.00055));
    } else if (typeof micro.oppScore === 'number' && Number.isFinite(micro.oppScore)) {
      volFactor = Math.min(1.5, Math.max(0.7, 0.85 + micro.oppScore * 0.15));
    } else {
      const regimeStr = (typeof micro.regime === 'string' ? micro.regime : (micro.weights?.activeRegime || '')).toUpperCase();
      if (regimeStr.includes('EXPANSION') || regimeStr.includes('HIGH_VOLATILITY') || regimeStr.includes('TREND') || regimeStr.includes('BREAKOUT')) {
        volFactor = 1.25;
      } else if (regimeStr.includes('COMPRESSION') || regimeStr.includes('LOW_LIQUIDITY') || regimeStr.includes('RANGE') || regimeStr.includes('CHOP') || regimeStr.includes('ACCUMULATION')) {
        volFactor = 0.80;
      } else if (regimeStr.includes('NEWS') || regimeStr.includes('SHOCK')) {
        volFactor = 1.40;
      }
    }

    const rawLhds = this.baseLhdsVetoLimit * Math.pow(volFactor, 0.5);
    const rawCollapse = this.baseOntologicalCollapseTrg * Math.pow(volFactor, 0.75);

    const dynamicLhds = Math.min(this.maxLhdsVetoLimit, Math.max(this.minLhdsVetoLimit, rawLhds));
    const dynamicCollapse = Math.min(this.maxOntologicalCollapseTrg, Math.max(this.minOntologicalCollapseTrg, rawCollapse));

    return {
      lhdsVetoLimit: dynamicLhds,
      ontologicalCollapseTrg: dynamicCollapse,
      volatilityFactor: volFactor,
      isDynamic: volFactor !== 1.0
    };
  }

  evaluate(providers, micro = {}) {
    const v1 = providers.v1;
    const v2 = providers.v2;
    const v3 = providers.v3;
    const v4 = providers.v4;
    const v5 = providers.v5;
    const v6 = providers.v6;
    const v7 = providers.v7;

    // 1. Compute dynamic limits for this tick
    const { lhdsVetoLimit, ontologicalCollapseTrg, volatilityFactor } = this.computeDynamicLimits(micro);

    // 2. Residualization & Consensus Destruction across all active engines (V1-V7)
    const providerList = [v1, v2, v3, v4, v5, v6, v7].filter(p => p !== undefined && p !== null);
    const { dvf, trg } = this.rl.evaluate(...providerList, micro);

    // 3. Execution Trigger Evaluation
    let { eef, reason } = this.ett.evaluate(trg);

    if (dvf.isConsensus) {
      eef = false;
      reason = 'BLOCKED_BY_FALSE_CONSENSUS';
    }

    // 4. Ontological Confidence Limits (OCL) with dynamic thresholds
    const sds = micro.scaleDivergence || 0.0;
    const lhds = micro.lhds || 0.0;
    let epistemicAuthority = 'UNKNOWN';
    
    if (lhds > lhdsVetoLimit) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_REALITY_DIVERGENCE';
    } else {
      const enforceOos = String(process.env.ENFORCE_OOS11_RULES) === 'true' || String(micro.enforceOos11) === 'true' || micro.enforceOos11 === 1;
      let oosBlocked = false;
      if (enforceOos) {
        const oppScore = micro.oppScore || 0;
        const imbalance = micro.imbalance || 0;
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
          if (trg.trg >= ontologicalCollapseTrg) {
            epistemicAuthority = 'VETO';
            eef = false;
            reason = 'VETO_ONTOLOGICAL_COLLAPSE';
          } else {
            epistemicAuthority = 'INFERRED';
          }
        }
      }
    }

    // Observer Divergence Metric (ODM) Veto
    if (eef && micro.odm !== undefined && micro.odm >= 0.60) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_OBSERVER_DIVERGENCE_ODM';
    }

    // 5. Output pure tensor data and dynamic limits metadata
    return {
      dvf: dvf.divergence,
      tension: dvf.tension,
      isConsensus: dvf.isConsensus,
      trg: trg.trg,
      eef,
      reason_codes: [reason],
      epistemic_authority: epistemicAuthority,
      dynamic_limits: {
        lhdsVetoLimit,
        ontologicalCollapseTrg,
        volatilityFactor
      },
      raw_metrics: {
        v1_confidence: v1?.confidence || 0,
        v2_confidence: v2?.confidence || 0,
        liquidity_vacuum: micro?.liquidityDivergence || 1.0,
        scale_divergence: sds
      }
    };
  }
}
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Unit Test Suite Creation**:
   - Write comprehensive unit tests in `lyzer edge/tests/unit/truthKernel.test.js` validating:
     - Neutral default limits ($V_f = 1.0 \rightarrow L = 0.80, C = 0.70$)
     - High-volatility expansion widening ($V_f = 1.4 \rightarrow L \approx 0.947, C \approx 0.90$)
     - Low-volatility compression tightening ($V_f = 0.7 \rightarrow L \approx 0.669, C \approx 0.535$)
     - Upper clamping bounds ($V_f = 3.0 \rightarrow L = 0.95, C = 0.90$)
     - Lower clamping bounds ($V_f = 0.1 \rightarrow L = 0.50, C = 0.40$)
     - Malformed / non-numeric input resilience (`null`, `NaN`, `Infinity`, strings)
     - Dynamic veto execution during compression traps ($LHDS = 0.75$ vetoed under compressed limit $0.67$)
     - Dynamic collapse prevention during legitimate breakout ($SDS = 0.8, TRG = 0.78$ allowed under expanded limit $0.85$)
2. **Execute Commands**:
   - `npx.cmd vitest run tests/unit/truthKernel.test.js`
   - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`
   - `npm.cmd run test:verify`
   - `npm.cmd test`
3. **Pass Criteria**:
   - 100% of all unit tests in `truthKernel.test.js` pass.
   - All 126 test cases in `e2e_suite.test.js` pass without regressions.
   - All 39 smoke tests in `npm run test:verify` pass.
   - Full 143-file test suite in `npm test` passes completely.
