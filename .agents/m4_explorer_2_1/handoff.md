# Handoff Report — Milestone 4 (Requirement R4: TruthKernel Dynamic Limits)

## 1. Observation

Direct investigation of the Lyzer Edge codebase reveals the exact locations where static limits are defined and evaluated, as well as the volatility metrics available at runtime:

### 1.1 Static Threshold Definition & Evaluation in `TruthKernel`
- **Location**: `packages/lyzer-constitution/src/eca/truthKernel.js`
- **Constructor Defaults** (lines 23–24):
  ```javascript
  this.lhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
  this.ontologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
  ```
- **Static LHDS Veto Evaluation** (line 60):
  ```javascript
  if (lhds > this.lhdsVetoLimit) {
    epistemicAuthority = 'VETO';
    eef = false;
    reason = 'VETO_REALITY_DIVERGENCE';
  }
  ```
- **Static Ontological Collapse TRG Evaluation** (line 98):
  ```javascript
  // SDS > 0.7 - Check for total structural collapse
  if (trg.trg >= this.ontologicalCollapseTrg) {
    epistemicAuthority = 'VETO';
    eef = false; // Constitutional override
    reason = 'VETO_ONTOLOGICAL_COLLAPSE';
  } else {
    epistemicAuthority = 'INFERRED';
  }
  ```

### 1.2 Static Threshold Consumption in `StreamEngine`
- **Location**: `lyzer edge/backend/streamEngine.js`
- **Environment Fallbacks & Instantiation** (lines 63–64, 87):
  ```javascript
  const lhdsVetoLimit = parseFloat(process.env.LHDS_VETO_LIMIT || '0.95');
  const ontologicalCollapseTrg = parseFloat(process.env.ONTOLOGICAL_COLLAPSE_TRG || '0.7');
  ...
  this.truthKernel = new TruthKernel({ trgThreshold, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg });
  ```
- **Evaluation Call Site** (line 784):
  ```javascript
  const kernelResult = this.truthKernel.evaluate(providers, {
    liquidityDivergence,
    scaleDivergence: sds,
    lhds,
    invariants,
    distanceFromGoldenZone,
    weights: dynamicWeights,
    oppScore,
    imbalance,
    odm: observerDivergence.odm
  });
  ```

### 1.3 Volatility Metrics in the Pipeline
- **`atrRatio` (Expansion/Compression Ratio)**: `packages/lyzer-shared/src/research/regimeClassifier.js` (lines 66, 98–117):
  ```javascript
  const shortATR = recentTRs.slice(-shortPeriod).reduce((a,b)=>a+b, 0) / shortPeriod;
  const longATR = recentTRs.reduce((a,b)=>a+b, 0) / longPeriod;
  const atrRatio = shortATR / (longATR || 1); // Volatility expansion/compression ratio
  ```
  Values:
  - `atrRatio > 1.3` $\implies$ Expansion regime
  - `atrRatio < 0.7` $\implies$ Compression regime
  - `atrRatio > 2.0` $\implies$ News shock regime
- **`atr14_pct` & `oppScore` in `StreamEngine`**: `lyzer edge/backend/streamEngine.js` (lines 578–620):
  ```javascript
  // ATR 14 percentage of price
  const atr14_pct = count > 0 ? (atr14 / count) / newCandle.close : 0;
  // Opportunity Score (0 to 3) combining ATR expansion, Volume Z-Score, and VWAP displacement:
  let oppScore = 0;
  if (atr14_pct >= 0.00055) oppScore++;
  if (volume_zscore >= 0.315) oppScore++;
  if (Math.abs(distance_vwap) >= 0.00963) oppScore++;
  ```
- **`topographicalAtr` in `StreamEngine`**: `lyzer edge/backend/streamEngine.js` (lines 674–681).

---

## 2. Logic Chain

### Step 1 — Diagnosis of the Static Limit Limitation
1. **LHDS Rigid Veto Problem**: The Linguistic Higher-Order Divergence Score (LHDS) measures divergence across observer channels and scale tensors. During market expansion or high-volatility events (breakouts, news impulses), cross-exchange order books, multi-timeframe latency, and price velocities naturally disperse. A static threshold ($0.80$ or $0.95$) fires false-positive `VETO_REALITY_DIVERGENCE` rejections during genuine high-opportunity momentum moves. Conversely, during low-volatility compression (tight ranges), an LHDS of $0.75$ reflects severe structural divergence relative to baseline noise, yet goes un-vetoed because it is below the static $0.80$ limit.
2. **Ontological Collapse Rigidity Problem**: When Multi-Timeframe Structural Divergence ($SDS > 0.7$) is detected, the kernel tests if $TRG \ge \text{ontologicalCollapseTrg}$. In expansion regimes, high directional asymmetry ($TRG$) is natural and healthy; a rigid $0.70$ limit cuts off strong trend trades. In compression regimes, even moderate TRG ($0.55$) in the presence of $SDS > 0.7$ signals a regime collapse.

### Step 2 — Derivation of the Volatility Scaling Factor $\kappa$
To adapt thresholds without introducing unstable oscillation, we define a continuous volatility scaling factor $\kappa \in [0.70, 1.30]$ modulated by the primary volatility indicator available in `micro`:

1. **Primary Metric — `atrRatio` or `volatilityRatio` ($R_v$)**:
   $$\kappa = 1.0 + \alpha \cdot (R_v - 1.0), \quad \text{where } \alpha = 0.25$$
   With damping coefficient $\alpha = 0.25$:
   - $R_v = 0.60$ (Compression) $\implies \kappa = 1.0 + 0.25 \cdot (-0.40) = 0.90$
   - $R_v = 1.00$ (Neutral) $\implies \kappa = 1.00$
   - $R_v = 1.60$ (Expansion) $\implies \kappa = 1.0 + 0.25 \cdot (0.60) = 1.15$
   - $R_v = 2.40$ (Shock) $\implies \kappa = 1.0 + 0.25 \cdot (1.40) = 1.35 \to \text{clamped to } 1.30$

2. **Secondary Metric — `atr14_pct` ($R_{atr}$)** (used if $R_v$ is absent):
   $$R_{atr} = \frac{\text{atr14\_pct}}{\text{ATR}_{\text{baseline}}}, \quad \text{where } \text{ATR}_{\text{baseline}} = 0.0015 \text{ (0.15\%)}$$
   $$\kappa = 1.0 + 0.20 \cdot (R_{atr} - 1.0)$$

3. **Tertiary Metric — `oppScore` ($S \in \{0, 1, 2, 3\}$)** (used if no continuous ratio is supplied):
   $$\kappa = 1.0 + (S - 1) \cdot 0.05 \implies \{S=0 \to 0.95, \, S=1 \to 1.00, \, S=2 \to 1.05, \, S=3 \to 1.10\}$$

4. **Default Metric State (100% Backward Compatibility)**:
   When `micro` does not contain volatility indicators (or is empty `{}` as in existing unit tests), $\kappa \equiv 1.00$ and no dynamic modulation is applied.

### Step 3 — Dynamic Limit Equations & Safety Clamping
Let $L_0 = \text{this.lhdsVetoLimit}$ and $C_0 = \text{this.ontologicalCollapseTrg}$:

1. **Dynamic LHDS Veto Limit**:
   $$L_{\text{dynamic}} = \begin{cases} L_0, & \text{if no volatility metric} \\ \text{clamp}(L_0 \times \kappa, 0.50, 0.98), & \text{if volatility metric present} \end{cases}$$
   *Safety Invariant*: $L_{\text{dynamic}} \le 0.98$ ensures an LHDS of $1.0$ (total reality disconnect) will ALWAYS veto, preserving the Tier 2 F7 BVA 3 guarantee.

2. **Dynamic Ontological Collapse TRG Limit**:
   $$C_{\text{dynamic}} = \begin{cases} C_0, & \text{if no volatility metric} \\ \text{clamp}(C_0 \times \kappa, 0.40, 0.95), & \text{if volatility metric present} \end{cases}$$

### Step 4 — Preservation of Unit Test & Constructor Invariants
In unit tests (e.g. `tests/e2e_smc/e2e_suite.test.js`), developers instantiate `TruthKernel` with custom boundary values such as `lhdsVetoLimit: 0.1`, `lhdsVetoLimit: 0.4`, `ontologicalCollapseTrg: 0.1`, `ontologicalCollapseTrg: 0.0`, `ontologicalCollapseTrg: 10.0`.
When `micro` contains only `{ lhds: 0.15 }` or `{ scaleDivergence: 0.8 }` without volatility indicators:
- `hasVolatilityMetric` is `false`.
- `computeDynamicLimits(micro)` returns `lhdsVetoLimit = this.lhdsVetoLimit` and `ontologicalCollapseTrg = this.ontologicalCollapseTrg` verbatim.
- No global clamp overrides explicit constructor parameters when $\kappa = 1.0$, guaranteeing that 100% of existing unit and boundary tests pass without regression.

---

## 3. Caveats

1. **Maximum LHDS Clamp Cap ($0.98$)**: LHDS at $1.0$ is an epistemic absolute failure. The dynamic limit must never expand to $\ge 1.0$, regardless of extreme volatility shock values.
2. **Damping Coefficient Stability**: Setting $\alpha = 0.25$ provides smooth, bounded adjustments ($\pm 15\text{--}30\%$). Extreme values ($\alpha > 0.6$) could cause threshold whiplash during erratic 1-minute candle wicks.
3. **Data Availability in StreamEngine**: While `StreamEngine` already computes `oppScore` and `topographicalAtr`, explicitly computing `atrRatio` ($ATR_{10} / ATR_{30}$) in `StreamEngine` and passing it in `micro` unlocks maximum continuous fidelity.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Target File 1: `packages/lyzer-constitution/src/eca/truthKernel.js`

Add the `computeDynamicLimits` method and integrate it into `evaluate`:

```javascript
export class TruthKernel {
  constructor(options = {}) {
    const trgThreshold = options.trgThreshold != null ? options.trgThreshold : (options.masterSwitchThreshold != null ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold != null ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
  }

  /**
   * Computes dynamic veto limits based on microstructure volatility metrics.
   * Preserves 100% backward compatibility when micro volatility metrics are absent.
   *
   * @param {Object} micro - Microstructure metrics { atrRatio, volatilityRatio, atr14_pct, oppScore, ... }
   * @returns {Object} { lhdsVetoLimit, ontologicalCollapseTrg, volatilityFactor }
   */
  computeDynamicLimits(micro = {}) {
    let volFactor = 1.0;
    let hasVolatilityMetric = false;

    // 1. Primary indicator: explicit volatilityRatio or atrRatio (expansion > 1.0, compression < 1.0)
    if (typeof micro.volatilityRatio === 'number' && Number.isFinite(micro.volatilityRatio) && micro.volatilityRatio > 0) {
      volFactor = 1.0 + 0.25 * (micro.volatilityRatio - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.atrRatio === 'number' && Number.isFinite(micro.atrRatio) && micro.atrRatio > 0) {
      volFactor = 1.0 + 0.25 * (micro.atrRatio - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.atr14_pct === 'number' && Number.isFinite(micro.atr14_pct) && micro.atr14_pct > 0) {
      const atrBaseline = 0.0015;
      const normalizedAtr = micro.atr14_pct / atrBaseline;
      volFactor = 1.0 + 0.20 * (normalizedAtr - 1.0);
      hasVolatilityMetric = true;
    } else if (typeof micro.oppScore === 'number' && Number.isFinite(micro.oppScore)) {
      // oppScore: 0 -> 0.95 (compression), 1 -> 1.0 (neutral), 2 -> 1.05 (expansion), 3 -> 1.10 (high expansion)
      volFactor = 1.0 + (micro.oppScore - 1) * 0.05;
      hasVolatilityMetric = true;
    }

    if (!hasVolatilityMetric) {
      return {
        lhdsVetoLimit: this.lhdsVetoLimit,
        ontologicalCollapseTrg: this.ontologicalCollapseTrg,
        volatilityFactor: 1.0
      };
    }

    // Clamp volFactor strictly within safe range [0.70, 1.30]
    volFactor = Math.min(1.30, Math.max(0.70, volFactor));

    // Dynamic LHDS veto limit (bounded between [0.50, 0.98])
    const dynamicLhds = Math.min(0.98, Math.max(0.50, this.lhdsVetoLimit * volFactor));

    // Dynamic Ontological Collapse TRG limit (bounded between [0.40, 0.95])
    const dynamicCollapseTrg = Math.min(0.95, Math.max(0.40, this.ontologicalCollapseTrg * volFactor));

    return {
      lhdsVetoLimit: dynamicLhds,
      ontologicalCollapseTrg: dynamicCollapseTrg,
      volatilityFactor: volFactor
    };
  }

  evaluate(providers, micro = {}) {
    ...
    // 3. Dynamic Ontological Confidence Limits (OCL)
    const { lhdsVetoLimit, ontologicalCollapseTrg, volatilityFactor } = this.computeDynamicLimits(micro);
    const sds = micro.scaleDivergence || 0.0;
    const lhds = micro.lhds || 0.0;
    let epistemicAuthority = 'UNKNOWN';
    
    if (lhds > lhdsVetoLimit) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_REALITY_DIVERGENCE';
    } else {
      ...
      if (!oosBlocked) {
        if (sds < 0.3) {
          epistemicAuthority = 'OBSERVED';
        } else if (sds <= 0.7) {
          epistemicAuthority = 'INFERRED';
        } else {
          // SDS > 0.7 - Check for total structural collapse
          if (trg.trg >= ontologicalCollapseTrg) {
            epistemicAuthority = 'VETO';
            eef = false; // Constitutional override
            reason = 'VETO_ONTOLOGICAL_COLLAPSE';
          } else {
            epistemicAuthority = 'INFERRED';
          }
        }
      }
    }
    ...
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

### 4.2 Target File 2: `lyzer edge/backend/streamEngine.js`

In `streamEngine.js`:
- Calculate `atrRatio` in `processCandle()`:
  ```javascript
  // Calculate short vs long ATR ratio for dynamic regime adaptation
  let atrRatio = 1.0;
  if (topCandleList.length >= 30) {
    const shortList = topCandleList.slice(-10);
    const longList = topCandleList.slice(-30);
    let sSum = 0, lSum = 0;
    for (const c of shortList) sSum += (c.high - c.low);
    for (const c of longList) lSum += (c.high - c.low);
    const shortAtr = sSum / 10;
    const longAtr = lSum / 30;
    atrRatio = longAtr > 0 ? (shortAtr / longAtr) : 1.0;
  }
  ```
- Pass `atrRatio`, `atr14_pct`, and `oppScore` in the `micro` payload at line 784:
  ```javascript
  const kernelResult = this.truthKernel.evaluate(providers, {
    liquidityDivergence,
    scaleDivergence: sds,
    lhds,
    invariants,
    distanceFromGoldenZone,
    weights: dynamicWeights,
    oppScore,
    atrRatio,
    atr14_pct: topographicalAtr ? (topographicalAtr / currentPrice) : 0.0015,
    imbalance,
    odm: observerDivergence.odm
  });
  ```

---

## 5. Verification Method

### 5.1 Verification Commands
From `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\lyzer edge`:

1. **Full E2E Suite (126 Tests)**:
   ```powershell
   npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js
   ```
2. **Smoke Verification Suite (39 Tests)**:
   ```powershell
   npm.cmd run test:verify
   ```
3. **P0 Regression Tests**:
   ```powershell
   npx.cmd vitest run tests/unit/p0_fixes.test.js
   ```
4. **New Dedicated R4 Dynamic Limits Unit Test Suite**:
   Create and run `tests/unit/truth_kernel_dynamic_limits.test.js` verifying:
   - Backward compatibility: `{}` micro payload yields exact constructor defaults.
   - Expansion modulation: `atrRatio = 1.8` expands `lhdsVetoLimit` and `ontologicalCollapseTrg`.
   - Compression modulation: `atrRatio = 0.6` tightens `lhdsVetoLimit` and `ontologicalCollapseTrg`.
   - Boundary clamping: Extreme inputs (`atrRatio = 10.0` or `0.01`) remain strictly within $[0.50, 0.98]$ and $[0.40, 0.95]$.
   - Invalidation check: `lhds = 1.0` must ALWAYS veto regardless of expansion.
