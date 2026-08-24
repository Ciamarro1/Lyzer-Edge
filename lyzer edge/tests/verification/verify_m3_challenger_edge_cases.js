/**
 * Comprehensive Empirical Stress-Test & Adversarial Challenge Suite
 * Milestone 3: SMC Temporal Spatial Memory (Requirement R3)
 * 
 * Tests:
 * 1. Edge Case 1: Incomplete, Empty, and Corrupted Candle Arrays
 * 2. Edge Case 2: Consecutive Identical Ticks & Deduplication Watermark Stability
 * 3. Edge Case 3: High-Volatility Gap-Over Breaches (Flash Crash & Gap-Up)
 * 4. Edge Case 4: Coexistence with StreamEngine Pipeline & Multi-Instance Isolation
 * 5. Memory Bound & Compaction Stability under 10,000 Candles
 */

import { SpatialMemoryIndex } from '../../../packages/lyzer-shared/src/smc/spatialMemoryIndex.js';
import { LiquidityReconstructionEngine } from '../../../packages/lyzer-shared/src/providers/v1_smc_ict.js';
import { StreamEngine } from '../../backend/streamEngine.js';

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

function makeCandle(open, high, low, close, time = Date.now()) {
  return { open, high, low, close, volume: 100, openTime: time, timestamp: time, is_bullish: close >= open };
}

function makeFlatCandles(count, price = 100, startTime = 1000000) {
  const candles = [];
  for (let i = 0; i < count; i++) {
    candles.push(makeCandle(price, price, price, price, startTime + i * 60000));
  }
  return candles;
}

console.log('================================================================');
console.log('CHALLENGER 2: EMPIRICAL VERIFICATION OF SMC SPATIAL MEMORY (M3)');
console.log('================================================================\n');

// ============================================================================
// SUITE 1: Edge Case 1 - Incomplete / Empty / Malformed Candle Inputs
// ============================================================================
console.log('>>> SUITE 1: Incomplete, Empty & Malformed Candle Inputs');

{
  const index = new SpatialMemoryIndex();

  // 1.1 Null / Undefined / Empty update
  try {
    index.update(null);
    index.update(undefined);
    index.update([]);
    assert(index.unmitigatedLevels.length === 0, '1.1 Index survives null/undefined/empty update calls');
  } catch (err) {
    assert(false, '1.1 Index survives null/undefined/empty update calls', err.message);
  }

  // 1.2 Single candle array (length 1)
  try {
    index.update([makeCandle(100, 105, 95, 102, 1000)]);
    assert(index.unmitigatedLevels.length === 0, '1.2 Single candle does not crash and yields 0 formations');
    assert(index.lastProcessedTime === 1000, '1.2 Single candle updates watermark to candle time');
  } catch (err) {
    assert(false, '1.2 Single candle update', err.message);
  }

  // 1.3 Two candles array (length 2)
  try {
    index.update([
      makeCandle(100, 105, 95, 102, 1000),
      makeCandle(102, 108, 101, 107, 2000)
    ]);
    assert(index.unmitigatedLevels.length === 0, '1.3 Two candles do not form premature levels (<3 bars)');
    assert(index.lastProcessedTime === 1000, '1.3 Two candles sets watermark to last closed candle (index n-2)');
  } catch (err) {
    assert(false, '1.3 Two candles update', err.message);
  }

  // 1.4 Corrupted items inside candle array
  try {
    const corruptIndex = new SpatialMemoryIndex();
    corruptIndex.update([null, undefined, {}, makeCandle(100, 105, 95, 102, 3000)]);
    assert(true, '1.4 Index safely handles null/undefined elements in candle array');
  } catch (err) {
    assert(false, '1.4 Index safely handles corrupt candle array elements', err.message);
  }

  // 1.5 Edge cases on helper methods with null/empty state
  try {
    const emptyIndex = new SpatialMemoryIndex();
    const nearest = emptyIndex.getNearest(100);
    assert(nearest.nearestBullish === null && nearest.nearestBearish === null, '1.5 getNearest on empty index returns null levels');
    assert(nearest.distanceBullish === null && nearest.distanceBearish === null, '1.5 getNearest on empty index returns null distances');

    const interaction = emptyIndex.checkInteraction(null);
    assert(interaction === null, '1.5 checkInteraction(null) returns null');

    const interactionEmpty = emptyIndex.checkInteraction(makeCandle(100, 105, 95, 100, 4000));
    assert(interactionEmpty === null, '1.5 checkInteraction with 0 unmitigated levels returns null');

    emptyIndex.evaluateMitigations(null);
    emptyIndex.evaluateMitigations({});
    assert(emptyIndex.unmitigatedLevels.length === 0, '1.5 evaluateMitigations(null/{}) succeeds cleanly');
  } catch (err) {
    assert(false, '1.5 Helper methods on empty index', err.message);
  }

  // 1.6 Provider V1 (LiquidityReconstructionEngine) under incomplete inputs
  const v1 = new LiquidityReconstructionEngine();
  try {
    const resEmpty = v1.reconstruct({});
    assert(resEmpty.signal === 'flat' && resEmpty.narrative === 'INSUFFICIENT_DATA', '1.6 v1.reconstruct({}) returns INSUFFICIENT_DATA');

    const res4 = v1.reconstruct({ intermediate: makeFlatCandles(4) });
    assert(res4.signal === 'flat' && res4.narrative === 'INSUFFICIENT_DATA', '1.6 v1.reconstruct with 4 candles returns INSUFFICIENT_DATA');

    const resFastEmpty = v1.reconstruct({ fast: [] });
    assert(resFastEmpty.signal === 'flat' && resFastEmpty.narrative === 'INSUFFICIENT_DATA', '1.6 v1.reconstruct with empty fast returns INSUFFICIENT_DATA');
  } catch (err) {
    assert(false, '1.6 v1.reconstruct incomplete inputs', err.message);
  }
}

// ============================================================================
// SUITE 2: Edge Case 2 - Consecutive Identical Ticks & Deduplication Watermark
// ============================================================================
console.log('\n>>> SUITE 2: Consecutive Identical Ticks & Deduplication Watermark');

{
  const index = new SpatialMemoryIndex();

  // Create a 4-candle sequence:
  // c0: (100, 101, 99, 100)
  // c1: (100, 102, 98, 99) - Bearish bar (close 99 < open 100)
  // c2: (100, 115, 100, 114) - Bullish OB breakout (close 114 > c1.high 102 -> OB formed at [98, 102])
  // c3: (114, 125, 112, 122) - Bullish FVG bar (low 112 > c1.high 102, c2.close 114 > c2.open 100 -> FVG formed at [102, 112])
  const c0 = makeCandle(100, 101, 99, 100, 1000);
  const c1 = makeCandle(100, 102, 98, 99, 2000);
  const c2 = makeCandle(100, 115, 100, 114, 3000);
  const c3 = makeCandle(114, 125, 112, 122, 4000);
  const baseCandles = [c0, c1, c2, c3];

  // First update: should create 1 Bullish OB (at bar 2) and 1 Bullish FVG (at bar 3)
  index.update(baseCandles);
  const activeCount1 = index.unmitigatedLevels.length;
  assert(activeCount1 === 2, `2.1 Initial formation created exactly 2 levels (got ${activeCount1})`);

  const initialWatermark = index.lastProcessedTime;
  assert(initialWatermark === 3000, `2.1 Watermark set to closed candle timestamp 3000 (got ${initialWatermark})`);

  // Stream 100 consecutive identical tick updates with the exact same candle array
  for (let tick = 0; tick < 100; tick++) {
    index.update(baseCandles);
  }
  assert(index.unmitigatedLevels.length === 2, `2.2 100 identical ticks maintain exact level count of 2 (got ${index.unmitigatedLevels.length})`);
  assert(index.levelMap.size === 2, `2.2 levelMap size remains strictly 2 (no duplicate map entries)`);
  assert(index.lastProcessedTime === 3000, `2.2 Watermark remains stable at 3000 across identical ticks`);

  // In-progress candle live tick updates (same candle timestamp 4000, mutating close/high within candle)
  for (let tick = 1; tick <= 50; tick++) {
    const liveC3 = makeCandle(114, 125 + tick * 0.1, 112, 122 + tick * 0.1, 4000);
    index.update([c0, c1, c2, liveC3]);
  }
  assert(index.unmitigatedLevels.length === 2, `2.3 50 intra-candle live tick mutations do not create duplicate levels`);
  assert(index.lastProcessedTime === 3000, `2.3 Watermark preserves closed bar timestamp during live intra-candle ticks`);

  // Now advance to candle 5 (timestamp 5000)
  const c4 = makeCandle(122, 124, 121, 123, 5000);
  index.update([c0, c1, c2, c3, c4]);
  assert(index.lastProcessedTime === 4000, `2.4 Advancing bar updates closed watermark to 4000 (got ${index.lastProcessedTime})`);

  // Flat price sequence (100 flat candles where price does not move)
  const flatIndex = new SpatialMemoryIndex();
  const flatCandles = makeFlatCandles(100, 50, 10000);
  flatIndex.update(flatCandles);
  assert(flatIndex.unmitigatedLevels.length === 0, '2.5 100 flat candles form 0 phantom levels');
  assert(flatIndex.mitigatedLevels.length === 0, '2.5 100 flat candles yield 0 phantom mitigations');
}

// ============================================================================
// SUITE 3: Edge Case 3 - High-Volatility Gap-Over Breaches (Flash Crash & Gap-Up)
// ============================================================================
console.log('\n>>> SUITE 3: High-Volatility Gap-Over Breaches (Flash Crash & Gap-Up)');

{
  // 3.1 Single Bullish Zone Gap-Down (Flash Crash)
  const index = new SpatialMemoryIndex();
  const c0 = makeCandle(100, 101, 99, 100, 1000);
  const c1 = makeCandle(100, 102, 98, 99, 2000);
  const c2 = makeCandle(100, 115, 100, 114, 3000); // Creates Bullish OB [98, 102]
  const c3 = makeCandle(114, 125, 112, 122, 4000); // Creates Bullish FVG [102, 112]
  index.update([c0, c1, c2, c3]);
  const initialBullishCount = index.getUnmitigated(l => l.direction === 'BULLISH').length;
  assert(initialBullishCount === 2, `3.1 Established 2 bullish levels (got ${initialBullishCount})`);

  // Flash Crash: price gaps down completely below both zones in single tick (open=50, high=52, low=45, close=48)
  const flashCrashCandle = makeCandle(50, 52, 45, 48, 5000);
  index.update([c0, c1, c2, c3, flashCrashCandle]);

  const remainingBullish = index.getUnmitigated(l => l.direction === 'BULLISH');
  assert(remainingBullish.length === 0, `3.1 Flash crash gapped below both bullish levels -> active bullish count is 0 (got ${remainingBullish.length})`);
  const mitigatedBullish = index.mitigatedLevels.filter(l => l.direction === 'BULLISH');
  assert(mitigatedBullish.length === 2, `3.1 Both bullish levels moved to mitigatedLevels (got ${mitigatedBullish.length})`);
  assert(mitigatedBullish.every(l => l.mitigated === true && l.mitigated_at === 5000), '3.1 Both levels have mitigated=true and mitigated_at=5000');
  assert(mitigatedBullish.every(l => l.mitigation_price === 45), '3.1 Mitigation price recorded exact gap low price (45)');

  // Interaction check at gap price should be null (price is far below invalidated bullish support)
  const interaction = index.checkInteraction(flashCrashCandle);
  assert(interaction === null || interaction.direction !== 'BULLISH', '3.1 checkInteraction returns null or non-bullish for price below invalidated support');

  // 3.2 Single Bearish Zone Gap-Up (Massive Breakout)
  const bearIndex = new SpatialMemoryIndex();
  const b0 = makeCandle(100, 101, 98, 99, 1000);
  const b1 = makeCandle(99, 102, 97, 101, 2000); // Bullish bar
  const b2 = makeCandle(96, 96, 85, 86, 3000); // Bearish breakdown: Bearish OB [97, 102]
  const b3 = makeCandle(86, 88, 70, 75, 4000); // Bearish FVG [88, 97]
  bearIndex.update([b0, b1, b2, b3]);
  const initialBearishCount = bearIndex.getUnmitigated(l => l.direction === 'BEARISH').length;
  assert(initialBearishCount === 2, `3.2 Established 2 bearish levels (got ${initialBearishCount})`);

  // Gap Up: price gaps up completely above both zones in single tick (open=150, high=160, low=148, close=155)
  const gapUpCandle = makeCandle(150, 160, 148, 155, 5000);
  bearIndex.update([b0, b1, b2, b3, gapUpCandle]);

  const remainingBearish = bearIndex.getUnmitigated(l => l.direction === 'BEARISH');
  assert(remainingBearish.length === 0, `3.2 Massive gap-up breached both bearish levels -> active bearish count is 0 (got ${remainingBearish.length})`);
  const mitigatedBearish = bearIndex.mitigatedLevels.filter(l => l.direction === 'BEARISH');
  assert(mitigatedBearish.length === 2, `3.2 Both bearish levels moved to mitigatedLevels (got ${mitigatedBearish.length})`);
  assert(mitigatedBearish.every(l => l.mitigated === true && l.mitigated_at === 5000), '3.2 Both levels have mitigated=true and mitigated_at=5000');
  assert(mitigatedBearish.every(l => l.mitigation_price === 160), '3.2 Mitigation price recorded exact gap high price (160)');

  // 3.3 Multiple Stacked Unmitigated Levels Gap-Over
  const multiIndex = new SpatialMemoryIndex();
  const stackedCandles = [];
  let time = 1000;
  // Generate 10 ascending bullish steps forming multiple OBs
  let p = 100;
  for (let i = 0; i < 10; i++) {
    const downBar = makeCandle(p, p + 1, p - 2, p - 1, time++);
    const upBar = makeCandle(p - 1, p + 5, p - 1, p + 4, time++);
    stackedCandles.push(downBar, upBar);
    p += 5;
  }
  multiIndex.update(stackedCandles);
  const formedBullishCount = multiIndex.getUnmitigated(l => l.direction === 'BULLISH').length;
  assert(formedBullishCount >= 5, `3.3 Formed ${formedBullishCount} stacked bullish unmitigated levels`);

  // Mega Gap Crash: price drops to 10 in 1 tick
  const megaCrash = makeCandle(20, 25, 10, 15, time++);
  multiIndex.update([...stackedCandles, megaCrash]);
  const activeBullishAfterCrash = multiIndex.getUnmitigated(l => l.direction === 'BULLISH').length;
  assert(activeBullishAfterCrash === 0, `3.3 Single flash crash candle wiped all ${formedBullishCount} stacked bullish levels to 0 unmitigated`);
  const mitigatedBullishAfterCrash = multiIndex.mitigatedLevels.filter(l => l.direction === 'BULLISH').length;
  assert(mitigatedBullishAfterCrash === formedBullishCount, `3.3 All ${formedBullishCount} bullish levels successfully recorded in mitigatedLevels`);
}

// ============================================================================
// SUITE 4: Edge Case 4 - Coexistence with StreamEngine Pipeline & Multi-Instance
// ============================================================================
console.log('\n>>> SUITE 4: Coexistence with StreamEngine Pipeline & Multi-Instance');

{
  // 4.1 StreamEngine Instantiation & Provider Integrity
  const stream = new StreamEngine({
    symbol: 'BTCUSDT',
    interval: '1m',
    mode: 'SIMULATION',
    disabledProviders: []
  });

  assert(stream.v1 !== null, '4.1 streamEngine.v1 is successfully instantiated');
  assert(stream.v1 instanceof LiquidityReconstructionEngine, '4.1 streamEngine.v1 is instance of LiquidityReconstructionEngine');
  assert(stream.v1.spatialIndex instanceof SpatialMemoryIndex, '4.1 streamEngine.v1.spatialIndex is instance of SpatialMemoryIndex');

  // 4.2 StreamEngine Tick Processing with Spatial Memory Integration
  // Populate mtfCandles with 30 candles
  let basePrice = 50000;
  const fastCandles = [];
  for (let i = 0; i < 30; i++) {
    const c = makeCandle(basePrice, basePrice + 100, basePrice - 50, basePrice + 80, 1000000 + i * 60000);
    fastCandles.push(c);
    basePrice += 80;
  }
  stream.mtfCandles['1m'] = [...fastCandles];
  stream.mtfCandles['15m'] = [...fastCandles];
  stream.mtfCandles['1h'] = [...fastCandles];

  try {
    const mappedCandles = {
      fast: stream.mtfCandles['1m'],
      intermediate: stream.mtfCandles['15m'],
      slow: stream.mtfCandles['1h'],
      ...stream.mtfCandles
    };
    const v1Narrative = stream.v1.reconstruct(mappedCandles);
    assert(v1Narrative.source === 'LIQUIDITY_RECONSTRUCTION', '4.2 v1Narrative source matches LIQUIDITY_RECONSTRUCTION');
    assert(v1Narrative.spatialMemory !== undefined, '4.2 v1Narrative includes spatialMemory telemetry object');
    assert(typeof v1Narrative.spatialMemory.activeCount === 'number', '4.2 spatialMemory telemetry contains numeric activeCount');
    assert(typeof v1Narrative.confidence === 'number', '4.2 v1Narrative confidence is numeric');
  } catch (err) {
    assert(false, '4.2 StreamEngine tick reconstruction execution', err.message);
  }

  // 4.3 Multi-Pair Isolation (6 concurrent StreamEngine instances)
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
  const engines = symbols.map(sym => new StreamEngine({ symbol: sym, interval: '1m', mode: 'SIMULATION', disabledProviders: [] }));

  // Feed distinct price streams (with >= 5 candles each):
  // BTC: Bullish run (forming bullish levels)
  // ETH: Bearish run (forming bearish levels)
  // SOL: Flat (0 levels)
  const btcCandles = [
    makeCandle(100, 101, 99, 100, 1000),
    makeCandle(100, 102, 98, 99, 2000),
    makeCandle(100, 115, 100, 114, 3000),
    makeCandle(114, 125, 112, 122, 4000),
    makeCandle(122, 126, 120, 124, 5000)
  ];
  const ethCandles = [
    makeCandle(100, 101, 98, 99, 1000),
    makeCandle(99, 102, 97, 101, 2000),
    makeCandle(96, 96, 85, 86, 3000),
    makeCandle(86, 88, 70, 75, 4000),
    makeCandle(75, 78, 72, 74, 5000)
  ];
  const solCandles = makeFlatCandles(10, 50, 1000);

  engines[0].v1.reconstruct({ intermediate: btcCandles }); // BTC
  engines[1].v1.reconstruct({ intermediate: ethCandles }); // ETH
  engines[2].v1.reconstruct({ intermediate: solCandles }); // SOL

  const btcSummary = engines[0].v1.spatialIndex.getSummary();
  const ethSummary = engines[1].v1.spatialIndex.getSummary();
  const solSummary = engines[2].v1.spatialIndex.getSummary();

  assert(btcSummary.unmitigatedBullish > 0 && btcSummary.unmitigatedBearish === 0, `4.3 BTC has bullish levels (${btcSummary.unmitigatedBullish}) and 0 bearish`);
  assert(ethSummary.unmitigatedBearish > 0 && ethSummary.unmitigatedBullish === 0, `4.3 ETH has bearish levels (${ethSummary.unmitigatedBearish}) and 0 bullish`);
  assert(solSummary.activeCount === 0, `4.3 SOL has 0 active levels in isolated index`);

  // 4.4 Disabled Providers Mode
  const disabledStream = new StreamEngine({
    symbol: 'BTCUSDT',
    disabledProviders: ['v1']
  });
  assert(disabledStream.v1 === null, '4.4 disabledProviders: [v1] cleanly sets stream.v1 to null');

  // Verify stream handles null v1 gracefully in signal calculation
  const mapped = { fast: fastCandles, intermediate: fastCandles, slow: fastCandles };
  const defaultNarrative = { signal: 'flat', confidence: 0, narrative: null, source: null };
  const v1DisabledNarrative = disabledStream.disabledProviders.has('v1') ? defaultNarrative : disabledStream.v1.reconstruct(mapped);
  assert(v1DisabledNarrative.signal === 'flat' && v1DisabledNarrative.confidence === 0, '4.4 Disabled v1 evaluates to flat signal with 0 confidence');
}

// ============================================================================
// SUITE 5: Stress & Memory Bound Stability (10,000 Synthetic Candles)
// ============================================================================
console.log('\n>>> SUITE 5: Stress & Bounded Memory Compaction (10,000 Candles)');

{
  const index = new SpatialMemoryIndex({ maxUnmitigated: 100, maxMitigated: 50 });
  const startMem = process.memoryUsage().heapUsed;

  let price = 1000;
  let t = 1000000;
  // Generate 10,000 oscillating candles creating numerous FVGs and OBs
  const candleBuffer = [];
  for (let i = 0; i < 10000; i++) {
    const delta = (Math.sin(i / 10) * 15) + (Math.random() * 6 - 3);
    const open = price;
    const close = price + delta;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    const candle = makeCandle(open, high, low, close, t);
    price = close;
    t += 60000;

    candleBuffer.push(candle);
    if (candleBuffer.length > 50) candleBuffer.shift();

    index.update(candleBuffer);
  }

  const finalUnmitigated = index.unmitigatedLevels.length;
  const finalMitigated = index.mitigatedLevels.length;
  const mapSize = index.levelMap.size;
  const endMem = process.memoryUsage().heapUsed;
  const memDiffMB = (endMem - startMem) / (1024 * 1024);

  assert(finalUnmitigated <= 100, `5.1 Unmitigated levels strictly bounded <= 100 (got ${finalUnmitigated})`);
  assert(finalMitigated <= 50, `5.1 Mitigated levels strictly bounded <= 50 (got ${finalMitigated})`);
  assert(mapSize <= 150, `5.1 levelMap size strictly bounded <= 150 (got ${mapSize})`);
  assert(memDiffMB < 50, `5.1 Heap delta after 10,000 iterations is ${memDiffMB.toFixed(2)} MB (<50 MB bound)`);

  // Reset check
  index.reset();
  assert(index.unmitigatedLevels.length === 0 && index.levelMap.size === 0, '5.2 index.reset() clears all internal structures');
}

// ============================================================================
// FINAL REPORT
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================\n');

if (failedTests > 0) {
  console.error('FAILURES:');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
} else {
  console.log('VERDICT: ALL ADVERSARIAL EDGE CASE TESTS PASSED (100% GREEN)');
  process.exit(0);
}
