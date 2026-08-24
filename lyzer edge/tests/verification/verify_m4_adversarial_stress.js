import { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';
import { StreamEngine } from '../../backend/streamEngine.js';

console.log('================================================================');
console.log('   CHALLENGER 2: ADVERSARIAL STRESS TEST HARNESS (M4 - R4)     ');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: Edge Cases 1 & 2 - Boundary, Null, Type, and Corrupt Matrix
// -----------------------------------------------------------------------------
console.log('>>> 1. PROBING TRUTHKERNEL WITH NULL, UNDEFINED, CORRUPT & ADVERSARIAL INPUTS');

const kernel = new TruthKernel({
  lhdsVetoLimit: 0.8,
  ontologicalCollapseTrg: 0.7,
  minLhdsVetoLimit: 0.50,
  maxLhdsVetoLimit: 0.95,
  minOntologicalCollapseTrg: 0.40,
  maxOntologicalCollapseTrg: 0.90
});

const adversarialInputs = [
  { name: 'null', input: null, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'undefined', input: undefined, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'empty object {}', input: {}, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'empty array []', input: [], expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'primitive string "corrupt"', input: "corrupt", expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'primitive number 12345', input: 12345, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'primitive boolean false', input: false, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'function', input: () => {}, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atrRatio: NaN', input: { atrRatio: NaN }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atrRatio: Infinity', input: { atrRatio: Infinity }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atrRatio: -Infinity', input: { atrRatio: -Infinity }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atrRatio: -5.0 (negative)', input: { atrRatio: -5.0 }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atrRatio: 0 (zero)', input: { atrRatio: 0 }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atrRatio string "2.5"', input: { atrRatio: "2.5" }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'volatilityRatio: NaN', input: { volatilityRatio: NaN }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'volatilityRatio: -100', input: { volatilityRatio: -100 }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'volatilityRatio: Infinity', input: { volatilityRatio: Infinity }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'expansionFactor: -1.0', input: { expansionFactor: -1.0 }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'expansionFactor: NaN', input: { expansionFactor: NaN }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atr14_pct: NaN', input: { atr14_pct: NaN }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'atr14_pct: -0.05', input: { atr14_pct: -0.05 }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'oppScore: NaN', input: { oppScore: NaN }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'oppScore: Infinity', input: { oppScore: Infinity }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'oppScore: -Infinity', input: { oppScore: -Infinity }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'regime: non-string object', input: { regime: { bad: true } }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'weights.activeRegime: invalid number', input: { weights: { activeRegime: 999 } }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
  { name: 'unknown regime string', input: { regime: 'UNKNOWN_RANDOM_REGIME' }, expectedDynamic: false, expectedLhds: 0.8, expectedTrg: 0.7 },
];

for (const testCase of adversarialInputs) {
  let limits, evalRes;
  try {
    limits = kernel.computeDynamicLimits(testCase.input);
    evalRes = kernel.evaluate({ v1: { signal: 'long', confidence: 50 } }, testCase.input);
  } catch (err) {
    assert(false, `${testCase.name} threw exception: ${err.message}`);
    continue;
  }

  const isDynamicMatch = limits.isDynamic === testCase.expectedDynamic;
  const lhdsMatch = Math.abs(limits.lhdsVetoLimit - testCase.expectedLhds) < 1e-6;
  const trgMatch = Math.abs(limits.ontologicalCollapseTrg - testCase.expectedTrg) < 1e-6;
  const finiteCheck = Number.isFinite(limits.lhdsVetoLimit) && Number.isFinite(limits.ontologicalCollapseTrg);
  const evalDynamicMatch = evalRes.dynamic_limits.isDynamic === testCase.expectedDynamic;

  assert(
    isDynamicMatch && lhdsMatch && trgMatch && finiteCheck && evalDynamicMatch,
    `Adversarial input [${testCase.name}] -> isDynamic=${limits.isDynamic}, lhds=${limits.lhdsVetoLimit}, collapse=${limits.ontologicalCollapseTrg}`
  );
}

// -----------------------------------------------------------------------------
// TEST SUITE 2: Dynamic Bounding & Clamping Stress Tests
// -----------------------------------------------------------------------------
console.log('\n>>> 2. PROBING DYNAMIC SCALING & SAFETY CLAMP BOUNDARIES');

const extremeCases = [
  { name: 'Extreme High Volatility (atrRatio=1000)', input: { atrRatio: 1000 }, maxLhds: 0.95, maxTrg: 0.90 },
  { name: 'Extreme High oppScore (oppScore=50)', input: { oppScore: 50 }, maxLhds: 0.95, maxTrg: 0.90 },
  { name: 'Extreme Near-Zero Volatility (atrRatio=1e-8)', input: { atrRatio: 1e-8 }, minLhds: 0.50, minTrg: 0.40 },
  { name: 'Extreme Negative oppScore (oppScore=-50)', input: { oppScore: -50 }, minLhds: 0.50, minTrg: 0.40 },
  { name: 'Expansion Regime (regime="EXPANSION")', input: { regime: 'EXPANSION' }, expectedHigher: true },
  { name: 'News Shock Regime (regime="NEWS_SHOCK")', input: { regime: 'NEWS_SHOCK' }, expectedHigher: true },
  { name: 'Compression Regime (regime="COMPRESSION")', input: { regime: 'COMPRESSION' }, expectedLower: true },
];

for (const testCase of extremeCases) {
  const limits = kernel.computeDynamicLimits(testCase.input);
  assert(Number.isFinite(limits.lhdsVetoLimit), `${testCase.name} lhds is finite`);
  assert(Number.isFinite(limits.ontologicalCollapseTrg), `${testCase.name} trg is finite`);
  assert(limits.lhdsVetoLimit >= 0.50 && limits.lhdsVetoLimit <= 0.95, `${testCase.name} lhds within [0.50, 0.95] (got ${limits.lhdsVetoLimit})`);
  assert(limits.ontologicalCollapseTrg >= 0.40 && limits.ontologicalCollapseTrg <= 0.90, `${testCase.name} trg within [0.40, 0.90] (got ${limits.ontologicalCollapseTrg})`);
  assert(limits.isDynamic === true, `${testCase.name} isDynamic is true`);
}

// -----------------------------------------------------------------------------
// TEST SUITE 3: StreamEngine 6-Pair Simulation with Dynamic Volatility Feeds
// -----------------------------------------------------------------------------
console.log('\n>>> 3. STREAMENGINE 6-PAIR SIMULATION WITH DIVERSE VOLATILITY FEEDS');

const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'BTCUSDT', 'ETHUSDT'];
const volatilityProfiles = {
  EURUSD: { type: 'normal', atrMult: 1.0, shortAtr: 0.0010, longAtr: 0.0010 },
  GBPUSD: { type: 'expansion', atrMult: 2.2, shortAtr: 0.0033, longAtr: 0.0015 },
  USDJPY: { type: 'compression', atrMult: 0.45, shortAtr: 0.00045, longAtr: 0.0010 },
  AUDUSD: { type: 'news_shock', atrMult: 3.5, shortAtr: 0.0070, longAtr: 0.0020 },
  BTCUSDT: { type: 'hyper_expansion', atrMult: 5.0, shortAtr: 1500, longAtr: 300 },
  ETHUSDT: { type: 'corrupt_feed', corrupt: true }
};

function generateCandles(symbol, count = 50, profile) {
  const candles = [];
  let basePrice = symbol.includes('BTC') ? 60000 : (symbol.includes('ETH') ? 3000 : (symbol.includes('JPY') ? 150 : 1.1000));
  const now = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const time = now + i * 60000;
    let range;
    if (profile.corrupt && i === count - 1) {
      range = NaN;
    } else if (i >= count - 10) {
      range = profile.shortAtr || (basePrice * 0.001);
    } else {
      range = profile.longAtr || (basePrice * 0.001);
    }

    if (!Number.isFinite(range)) range = 0.001; // protect candle generation

    const open = basePrice + (Math.sin(i / 5) * range);
    const high = open + range;
    const low = open - range;
    const close = open + ((i % 2 === 0 ? 0.5 : -0.5) * range);

    candles.push({
      timestamp: time,
      openTime: time,
      closeTime: time + 59999,
      time: time,
      open,
      high,
      low,
      close,
      volume: 100 + i * 10,
      is_bullish: close >= open
    });
  }
  return candles;
}

async function runStreamEngineSimulation() {
  for (const symbol of symbols) {
    const profile = volatilityProfiles[symbol];
    const engine = new StreamEngine({
      symbol,
      interval: '1m',
      mode: 'SIMULATION',
      court: {
        observeState: (res) => {},
        cclist: { peekStress: () => ({ stressLevel: 0.1, isLethalIllusion: false }) },
        requestPermission: async () => ({ approved: true })
      }
    });

    const candles = generateCandles(symbol, 45, profile);

    try {
      // Process historical sequence through engine
      for (let i = 0; i < candles.length; i++) {
        await engine.processCandle(candles[i], i);
      }
      assert(true, `StreamEngine [${symbol}] processed 45 candles successfully (Profile: ${profile.type})`);
    } catch (err) {
      assert(false, `StreamEngine [${symbol}] failed: ${err.message}\n${err.stack}`);
    }
  }
}

await runStreamEngineSimulation();

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
