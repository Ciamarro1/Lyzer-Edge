/**
 * Comprehensive Empirical Adversarial Stress-Test Suite
 * Milestone 4: TruthKernel Dynamic Limits (Requirement R4)
 * 
 * Target: packages/lyzer-constitution/src/eca/truthKernel.js
 * 
 * Verifications:
 * 1. 10,000 Synthetic Ticks across 5 volatility regimes (< 0.1 ATR to > 10x ATR).
 * 2. Strict Mathematical Clamping Invariants: L in [0.50, 0.95], C in [0.40, 0.90], Vf in [0.50, 2.00].
 * 3. Veto Accuracy & Triggering: Zero false vetoes in equilibrium, sensitive vetoes in compression, opportunity extraction in expansion, unbypassable safety vetoes in black-swan shocks.
 * 4. Adversarial Input Poisoning (NaN, Inf, negatives, corrupt objects).
 * 5. Deterministic Dynamic Limit Pipeline Integration.
 */

import { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} - ${details}`);
    failures.push({ testName, details });
  }
}

console.log('================================================================');
console.log('CHALLENGER 1: EMPIRICAL ADVERSARIAL STRESS-TEST FOR REQUIREMENT R4');
console.log('================================================================\n');

// ============================================================================
// SUITE 1: 10,000 Synthetic Ticks Multi-Regime Volatility Stress Test
// ============================================================================
console.log('>>> SUITE 1: 10,000 Synthetic Ticks Multi-Regime Simulation & Invariant Clamping');

{
  const kernel = new TruthKernel();
  const NUM_TICKS = 10000;
  
  let clampViolationsLhds = 0;
  let clampViolationsCollapse = 0;
  let clampViolationsVolFactor = 0;
  let nonFiniteCount = 0;
  let dynamicCount = 0;

  // Track regime stats
  const regimeStats = {
    ULTRA_LOW: { count: 0, minL: Infinity, maxL: -Infinity, minC: Infinity, maxC: -Infinity },
    COMPRESSION: { count: 0, minL: Infinity, maxL: -Infinity, minC: Infinity, maxC: -Infinity },
    EQUILIBRIUM: { count: 0, minL: Infinity, maxL: -Infinity, minC: Infinity, maxC: -Infinity },
    EXPANSION: { count: 0, minL: Infinity, maxL: -Infinity, minC: Infinity, maxC: -Infinity },
    BLACK_SWAN: { count: 0, minL: Infinity, maxL: -Infinity, minC: Infinity, maxC: -Infinity }
  };

  for (let i = 0; i < NUM_TICKS; i++) {
    let micro = {};
    let regimeKey = 'EQUILIBRIUM';

    // Distribute ticks across 5 regimes (2,000 ticks each)
    if (i < 2000) {
      // Regime 1: Ultra-low volatility (< 0.1 ATR)
      regimeKey = 'ULTRA_LOW';
      const atrRatio = 0.001 + Math.random() * 0.099; // [0.001, 0.100]
      micro = {
        atrRatio,
        atr14_pct: 0.00055 * atrRatio,
        oppScore: 0,
        regime: 'COMPRESSION',
        scaleDivergence: 0.15,
        lhds: 0.2
      };
    } else if (i < 4000) {
      // Regime 2: Low volatility / Consolidation (0.1 to 0.7 ATR)
      regimeKey = 'COMPRESSION';
      const atrRatio = 0.1 + Math.random() * 0.6; // [0.1, 0.7]
      micro = {
        atrRatio,
        oppScore: Math.random() > 0.5 ? 0 : 1,
        regime: 'RANGING',
        scaleDivergence: 0.25,
        lhds: 0.3
      };
    } else if (i < 6000) {
      // Regime 3: Normal / Equilibrium market (0.8 to 1.2 ATR)
      regimeKey = 'EQUILIBRIUM';
      const atrRatio = 0.8 + Math.random() * 0.4; // [0.8, 1.2]
      micro = {
        atrRatio,
        atr14_pct: 0.00055 * atrRatio,
        oppScore: 1,
        regime: 'NORMAL',
        scaleDivergence: 0.35,
        lhds: 0.35
      };
    } else if (i < 8000) {
      // Regime 4: High Volatility / Expansion (1.5 to 4.0 ATR)
      regimeKey = 'EXPANSION';
      const atrRatio = 1.5 + Math.random() * 2.5; // [1.5, 4.0]
      micro = {
        atrRatio,
        oppScore: Math.random() > 0.5 ? 2 : 3,
        regime: 'EXPANSION',
        scaleDivergence: 0.45,
        lhds: 0.4
      };
    } else {
      // Regime 5: Black Swan / Shock Volatility (> 10x ATR, up to 50x ATR)
      regimeKey = 'BLACK_SWAN';
      const atrRatio = 10.0 + Math.random() * 40.0; // [10.0, 50.0]
      micro = {
        atrRatio,
        atr14_pct: 0.00055 * atrRatio,
        oppScore: 3,
        regime: 'NEWS_SHOCK',
        scaleDivergence: 0.65,
        lhds: 0.5
      };
    }

    const res = kernel.evaluate({
      v1: { signal: 'long', confidence: 60 },
      v2: { signal: 'short', confidence: 40 }
    }, micro);

    const limits = res.dynamic_limits;

    if (!Number.isFinite(limits.lhdsVetoLimit) || !Number.isFinite(limits.ontologicalCollapseTrg) || !Number.isFinite(limits.volatilityFactor)) {
      nonFiniteCount++;
    }

    if (limits.lhdsVetoLimit < 0.50 || limits.lhdsVetoLimit > 0.95) {
      clampViolationsLhds++;
    }

    if (limits.ontologicalCollapseTrg < 0.40 || limits.ontologicalCollapseTrg > 0.90) {
      clampViolationsCollapse++;
    }

    if (limits.volatilityFactor < 0.50 || limits.volatilityFactor > 2.00) {
      clampViolationsVolFactor++;
    }

    if (limits.isDynamic) {
      dynamicCount++;
    }

    // Accumulate regime stats
    const stats = regimeStats[regimeKey];
    stats.count++;
    stats.minL = Math.min(stats.minL, limits.lhdsVetoLimit);
    stats.maxL = Math.max(stats.maxL, limits.lhdsVetoLimit);
    stats.minC = Math.min(stats.minC, limits.ontologicalCollapseTrg);
    stats.maxC = Math.max(stats.maxC, limits.ontologicalCollapseTrg);
  }

  assert(clampViolationsLhds === 0, `1.1 Zero LHDS clamp violations out of ${NUM_TICKS} ticks (all L in [0.50, 0.95])`, `Found ${clampViolationsLhds}`);
  assert(clampViolationsCollapse === 0, `1.2 Zero Ontological Collapse clamp violations out of ${NUM_TICKS} ticks (all C in [0.40, 0.90])`, `Found ${clampViolationsCollapse}`);
  assert(clampViolationsVolFactor === 0, `1.3 Zero Volatility Factor violations out of ${NUM_TICKS} ticks (all Vf in [0.50, 2.00])`, `Found ${clampViolationsVolFactor}`);
  assert(nonFiniteCount === 0, `1.4 Zero non-finite/NaN/Infinity limits encountered in ${NUM_TICKS} ticks`, `Found ${nonFiniteCount}`);
  assert(dynamicCount === NUM_TICKS, `1.5 All ${NUM_TICKS} ticks properly identified as dynamic`, `Dynamic count: ${dynamicCount}`);

  // Check monotonic relationship across regimes
  assert(regimeStats.ULTRA_LOW.maxL < regimeStats.EXPANSION.minL, '1.6 Ultra-low volatility maximum L is strictly less than Expansion minimum L');
  assert(regimeStats.EQUILIBRIUM.minL >= 0.77 && regimeStats.EQUILIBRIUM.maxL <= 0.83, '1.7 Equilibrium regime remains centered around baseline 0.80 +/- 0.03');
  assert(regimeStats.BLACK_SWAN.maxL <= 0.95 && regimeStats.BLACK_SWAN.minL >= 0.90, '1.8 Black Swan regime expands to near safety ceiling (0.95) without breaching it');

  console.log('\n  --- Regime Distribution Summary (10,000 Ticks) ---');
  for (const [r, s] of Object.entries(regimeStats)) {
    console.log(`  Regime ${r.padEnd(12)}: ticks=${s.count} | LHDS Limits=[${s.minL.toFixed(4)}, ${s.maxL.toFixed(4)}] | Collapse Limits=[${s.minC.toFixed(4)}, ${s.maxC.toFixed(4)}]`);
  }
  console.log('');
}

// ============================================================================
// SUITE 2: Boundary Invariant Clamping Under Extreme Mathematical Inputs
// ============================================================================
console.log('>>> SUITE 2: Boundary Invariant Clamping Under Extreme Inputs');

{
  const kernel = new TruthKernel();

  // 2.1 Infinite volatility ratio
  const resInf = kernel.computeDynamicLimits({ atrRatio: 1e15 });
  assert(resInf.lhdsVetoLimit === 0.95, '2.1 atrRatio=1e15 clamps exactly to maxLhdsVetoLimit (0.95)', `Got ${resInf.lhdsVetoLimit}`);
  assert(resInf.ontologicalCollapseTrg === 0.90, '2.1 atrRatio=1e15 clamps exactly to maxOntologicalCollapseTrg (0.90)', `Got ${resInf.ontologicalCollapseTrg}`);
  assert(resInf.volatilityFactor === 2.0, '2.1 atrRatio=1e15 clamps volatilityFactor to 2.0', `Got ${resInf.volatilityFactor}`);

  // 2.2 Near-zero volatility ratio
  const resZero = kernel.computeDynamicLimits({ atrRatio: 1e-15 });
  assert(resZero.lhdsVetoLimit >= 0.50 && resZero.lhdsVetoLimit <= 0.72, '2.2 atrRatio=1e-15 tightens cleanly and stays >= 0.50', `Got ${resZero.lhdsVetoLimit}`);
  assert(resZero.ontologicalCollapseTrg >= 0.40 && resZero.ontologicalCollapseTrg <= 0.63, '2.2 atrRatio=1e-15 tightens collapse and stays >= 0.40', `Got ${resZero.ontologicalCollapseTrg}`);

  // 2.3 Extreme oppScore (+1000 and -1000)
  const resOppHigh = kernel.computeDynamicLimits({ oppScore: 1000 });
  const resOppLow = kernel.computeDynamicLimits({ oppScore: -1000 });
  assert(resOppHigh.lhdsVetoLimit === 0.95, '2.3 oppScore=1000 clamps to 0.95', `Got ${resOppHigh.lhdsVetoLimit}`);
  assert(resOppLow.lhdsVetoLimit === 0.50, '2.3 oppScore=-1000 clamps to 0.50', `Got ${resOppLow.lhdsVetoLimit}`);
  assert(resOppLow.ontologicalCollapseTrg === 0.40, '2.3 oppScore=-1000 collapse clamps to 0.40', `Got ${resOppLow.ontologicalCollapseTrg}`);

  // 2.4 Extreme atr14_pct (0.10 = 10% candle ATR and 1e-9)
  const resAtrHuge = kernel.computeDynamicLimits({ atr14_pct: 0.10 });
  const resAtrTiny = kernel.computeDynamicLimits({ atr14_pct: 1e-9 });
  assert(resAtrHuge.lhdsVetoLimit === 0.95, '2.4 atr14_pct=0.10 clamps to max 0.95', `Got ${resAtrHuge.lhdsVetoLimit}`);
  assert(resAtrTiny.lhdsVetoLimit >= 0.50, '2.4 atr14_pct=1e-9 clamps to min >= 0.50', `Got ${resAtrTiny.lhdsVetoLimit}`);

  // 2.5 Custom safety clamp thresholds in constructor
  const customKernel = new TruthKernel({
    minLhdsVetoLimit: 0.60,
    maxLhdsVetoLimit: 0.88,
    minOntologicalCollapseTrg: 0.45,
    maxOntologicalCollapseTrg: 0.82
  });
  const resCustomHigh = customKernel.computeDynamicLimits({ atrRatio: 100.0 });
  const resCustomLow = customKernel.computeDynamicLimits({ atrRatio: 0.001 });
  assert(resCustomHigh.lhdsVetoLimit === 0.88, '2.5 Custom maxLhdsVetoLimit (0.88) respected on extreme expansion', `Got ${resCustomHigh.lhdsVetoLimit}`);
  assert(resCustomHigh.ontologicalCollapseTrg === 0.82, '2.5 Custom maxOntologicalCollapseTrg (0.82) respected on extreme expansion', `Got ${resCustomHigh.ontologicalCollapseTrg}`);
  assert(resCustomLow.lhdsVetoLimit >= 0.60, '2.5 Custom minLhdsVetoLimit (0.60) respected on compression', `Got ${resCustomLow.lhdsVetoLimit}`);
  assert(resCustomLow.ontologicalCollapseTrg >= 0.45, '2.5 Custom minOntologicalCollapseTrg (0.45) respected on compression', `Got ${resCustomLow.ontologicalCollapseTrg}`);
}

// ============================================================================
// SUITE 3: Veto Accuracy & Triggering Invariants Across Regimes
// ============================================================================
console.log('\n>>> SUITE 3: Veto Accuracy & Triggering Invariants');

{
  const kernel = new TruthKernel({ trgThreshold: 0.2 });

  // 3.1 Non-Extreme Equilibrium (Baseline Normal Market):
  // Clean signals with low LHDS and low SDS MUST pass
  const normalProviders = {
    v1: { signal: 'long', confidence: 80 },
    v2: { signal: 'short', confidence: 60 } // trg is sufficient
  };
  const resClean = kernel.evaluate(normalProviders, {
    atrRatio: 1.0,
    lhds: 0.25,
    scaleDivergence: 0.20
  });
  assert(resClean.eef === true, '3.1 Normal equilibrium clean tick is NOT vetoed (EEF=true)', `EEF=${resClean.eef}, reason=${resClean.reason_codes}`);
  assert(resClean.epistemic_authority === 'OBSERVED', '3.1 Normal equilibrium authority is OBSERVED', `Got ${resClean.epistemic_authority}`);

  // 3.2 Equilibrium boundary test (LHDS 0.79 vs 0.81 at baseline 0.80)
  const resPass80 = kernel.evaluate(normalProviders, { atrRatio: 1.0, lhds: 0.79 });
  const resVeto80 = kernel.evaluate(normalProviders, { atrRatio: 1.0, lhds: 0.81 });
  assert(resPass80.eef === true && resPass80.epistemic_authority === 'OBSERVED', '3.2 LHDS 0.79 passes under baseline limit 0.80');
  assert(resVeto80.eef === false && resVeto80.epistemic_authority === 'VETO' && resVeto80.reason_codes.includes('VETO_REALITY_DIVERGENCE'), '3.2 LHDS 0.81 is VETOED under baseline limit 0.80');

  // 3.3 Volatility Compression Sensitivity (Microstructure trap detection):
  // Under compression (atrRatio = 0.30), limit drops to ~0.7328
  // An LHDS of 0.76 would sneak past static 0.80, but must be caught by dynamic compression
  const resCompTrap = kernel.evaluate(normalProviders, { atrRatio: 0.30, lhds: 0.76 });
  assert(resCompTrap.eef === false, '3.3 LHDS 0.76 is VETOED under compression (dynamic limit < 0.76)', `Limit was ${resCompTrap.dynamic_limits.lhdsVetoLimit}`);
  assert(resCompTrap.reason_codes.includes('VETO_REALITY_DIVERGENCE'), '3.3 Reason code is VETO_REALITY_DIVERGENCE');

  // 3.4 Volatility Compression - Non-anomalous normal signal does not over-veto
  const resCompNormal = kernel.evaluate(normalProviders, { atrRatio: 0.30, lhds: 0.50 });
  assert(resCompNormal.eef === true, '3.4 LHDS 0.50 is NOT vetoed under compression (no over-aggression)', `Limit was ${resCompNormal.dynamic_limits.lhdsVetoLimit}`);

  // 3.5 Volatility Expansion - Opportunity Extraction (False Veto Elimination):
  // Under expansion (atrRatio = 2.50), limit expands to > 0.85
  // A wide-spread momentum tick with LHDS = 0.84 passes cleanly
  const resExpOpp = kernel.evaluate(normalProviders, { atrRatio: 2.50, lhds: 0.84 });
  assert(resExpOpp.eef === true, '3.5 LHDS 0.84 PASSES under expansion (false veto eliminated)', `Limit was ${resExpOpp.dynamic_limits.lhdsVetoLimit}`);
  assert(resExpOpp.epistemic_authority === 'OBSERVED', '3.5 Epistemic authority is OBSERVED on expanded opportunity');

  // 3.6 Black Swan Shock - Unbypassable Constitutional Safety Upper Bound:
  // Even with atrRatio = 50.0, LHDS = 0.96 MUST BE VETOED
  const resShockLhdsVeto = kernel.evaluate(normalProviders, { atrRatio: 50.0, lhds: 0.96 });
  assert(resShockLhdsVeto.eef === false, '3.6 LHDS 0.96 is VETOED in extreme shock (safety upper bound 0.95 holds)', `Limit was ${resShockLhdsVeto.dynamic_limits.lhdsVetoLimit}`);
  assert(resShockLhdsVeto.reason_codes.includes('VETO_REALITY_DIVERGENCE'), '3.6 Reason is VETO_REALITY_DIVERGENCE');

  // 3.7 Black Swan Shock - Ontological Collapse Upper Bound:
  // Even with atrRatio = 50.0 (Collapse ceiling 0.90), SDS=0.85 and TRG=0.92 MUST trigger Ontological Collapse Veto
  // Signal with high TRG:
  const shockProviders = {
    v1: { signal: 'long', confidence: 100 },
    v2: { signal: 'short', confidence: 100 } // high residual TRG
  };
  const resShockCollapse = kernel.evaluate(shockProviders, {
    atrRatio: 50.0,
    scaleDivergence: 0.85,
    lhds: 0.50
  });
  assert(resShockCollapse.eef === false, '3.7 Ontological Collapse triggers when TRG >= 0.90 under SDS > 0.7 during black swan shock', `TRG was ${resShockCollapse.trg}, limit was ${resShockCollapse.dynamic_limits.ontologicalCollapseTrg}`);
  assert(resShockCollapse.reason_codes.includes('VETO_ONTOLOGICAL_COLLAPSE'), '3.7 Reason is VETO_ONTOLOGICAL_COLLAPSE');
}

// ============================================================================
// SUITE 4: Adversarial Input Fuzzing & Numerical Poisoning
// ============================================================================
console.log('\n>>> SUITE 4: Adversarial Input Fuzzing & Numerical Poisoning');

{
  const kernel = new TruthKernel();
  const poisonMicroList = [
    { atrRatio: NaN },
    { atrRatio: Infinity },
    { atrRatio: -Infinity },
    { atrRatio: -5.0 },
    { atrRatio: 0 },
    { volatilityRatio: NaN },
    { volatilityRatio: -1.0 },
    { expansionFactor: NaN },
    { atr14_pct: NaN },
    { atr14_pct: -0.001 },
    { oppScore: NaN },
    { oppScore: 'three' },
    { regime: null },
    { regime: 12345 },
    { regime: {} },
    { weights: null },
    { weights: { activeRegime: null } },
    null,
    undefined,
    'corrupt string',
    12345,
    true,
    false,
    {},
    { randomKey: 'irrelevant' }
  ];

  let fuzzErrors = 0;
  let corruptedLimits = 0;

  for (let idx = 0; idx < poisonMicroList.length; idx++) {
    const micro = poisonMicroList[idx];
    try {
      const res = kernel.computeDynamicLimits(micro);
      if (!Number.isFinite(res.lhdsVetoLimit) || !Number.isFinite(res.ontologicalCollapseTrg)) {
        corruptedLimits++;
      }
      if (res.lhdsVetoLimit < 0.50 || res.lhdsVetoLimit > 0.95) {
        corruptedLimits++;
      }
    } catch (err) {
      fuzzErrors++;
      console.error(`Fuzz error on input #${idx}:`, err);
    }
  }

  assert(fuzzErrors === 0, `4.1 Zero exceptions across ${poisonMicroList.length} poisoned inputs`, `Encountered ${fuzzErrors} errors`);
  assert(corruptedLimits === 0, `4.2 Zero corrupted/out-of-bounds limits across ${poisonMicroList.length} poisoned inputs`, `Corrupted count: ${corruptedLimits}`);

  // Test full evaluate() pipeline under malicious poisoned objects
  let evaluateErrors = 0;
  for (const micro of poisonMicroList) {
    try {
      const evalRes = kernel.evaluate({}, micro);
      if (!evalRes.dynamic_limits || !evalRes.raw_metrics) {
        evaluateErrors++;
      }
    } catch (err) {
      evaluateErrors++;
    }
  }
  assert(evaluateErrors === 0, '4.3 evaluate() pipeline survives all poisoned inputs without error');
}

// ============================================================================
// SUITE 5: Stochastic Volatility Hysteresis & Continuous Transition
// ============================================================================
console.log('\n>>> SUITE 5: Continuous Transition & Smooth Regime Hysteresis (1,000 Steps)');

{
  const kernel = new TruthKernel();
  let maxStepJumpLhds = 0;
  let maxStepJumpCollapse = 0;
  let prevLhds = null;
  let prevCollapse = null;

  // Simulate smooth sinusoidal volatility wave with noise over 1,000 steps
  for (let t = 0; t < 1000; t++) {
    // Volatility oscillates smoothly between 0.2 and 3.5
    const baseWave = 1.85 + 1.65 * Math.sin(t * 2 * Math.PI / 200);
    const noise = (Math.random() - 0.5) * 0.05;
    const atrRatio = Math.max(0.05, baseWave + noise);

    const limits = kernel.computeDynamicLimits({ atrRatio });

    if (prevLhds !== null) {
      const jumpL = Math.abs(limits.lhdsVetoLimit - prevLhds);
      const jumpC = Math.abs(limits.ontologicalCollapseTrg - prevCollapse);
      maxStepJumpLhds = Math.max(maxStepJumpLhds, jumpL);
      maxStepJumpCollapse = Math.max(maxStepJumpCollapse, jumpC);
    }

    prevLhds = limits.lhdsVetoLimit;
    prevCollapse = limits.ontologicalCollapseTrg;
  }

  // Smooth sinusoidal continuous step should have smooth limit adjustments
  assert(maxStepJumpLhds < 0.05, `5.1 Maximum step jump in dynamic LHDS is smooth (< 0.05)`, `Max jump was ${maxStepJumpLhds.toFixed(5)}`);
  assert(maxStepJumpCollapse < 0.05, `5.2 Maximum step jump in dynamic Collapse TRG is smooth (< 0.05)`, `Max jump was ${maxStepJumpCollapse.toFixed(5)}`);
}

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS EXECUTED : ${totalTests}`);
console.log(`TESTS PASSED         : ${passedTests}`);
console.log(`TESTS FAILED         : ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failures.forEach((f, idx) => {
    console.error(`  ${idx + 1}. [${f.testName}]: ${f.details}`);
  });
  process.exit(1);
} else {
  console.log('\n>>> EMPIRICAL CHALLENGER VERDICT: 100% PASS - ALL CLAMPING INVARIANTS & VETO ACCURACY RIGIDLY VERIFIED <<<');
  process.exit(0);
}
