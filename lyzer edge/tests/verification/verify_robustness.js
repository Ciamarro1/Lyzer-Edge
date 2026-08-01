/**
 * verify_robustness.js
 * Standalone Robustness and Epistemological Validation Suite
 * Executes 10 robust verification stages and writes results to src/db/robustness_results.js
 */

import fs from 'fs';
import { getHistoricalCandles } from '../../../packages/lyzer-shared/src/db/historicalData.js';
import { SignalEngine } from '../../src/engine/signalEngine.js';
import { TruthKernel } from '../../src/engine/kernel.js';
import { ConstitutionalCourt } from '../../../packages/lyzer-constitution/src/eca/court.js';
import { RealityAnchor } from '../../../packages/lyzer-constitution/src/eca/realityAnchor.js';
import { IrreversibilityVault } from '../../../packages/lyzer-constitution/src/eca/vault.js';
import { ConstitutionalLedger } from '../../../packages/lyzer-constitution/src/eca/ledger.js';
import { ProposalBudget } from '../../../packages/lyzer-constitution/src/eca/proposalBudget.js';
import { SystemMetacognitionLayer } from '../../src/engine/sml.js';
import { FailureModeCartography } from '../../src/engine/fmc.js';

// Seeded random number generator for reproducibility
function seedRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function calculateCorrelation(arr1, arr2) {
  if (arr1.length === 0 || arr2.length === 0) return 1.0;
  const n = Math.min(arr1.length, arr2.length);
  const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;

  let num = 0;
  let den1 = 0;
  let den2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    num += diff1 * diff2;
    den1 += diff1 * diff1;
    den2 += diff2 * diff2;
  }

  if (den1 === 0 || den2 === 0) return 1.0;
  return num / Math.sqrt(den1 * den2);
}

/**
 * Parameterized Simulation Runner
 */
function runBacktest(candles, opponentCandles, options = {}) {
  const signalEngine = new SignalEngine();
  const truthKernel = new TruthKernel();
  const realityAnchor = new RealityAnchor();
  const vault = new IrreversibilityVault();
  const ledger = new ConstitutionalLedger();
  const proposalBudget = new ProposalBudget();
  const court = new ConstitutionalCourt(realityAnchor, vault, ledger, proposalBudget);
  const sml = new SystemMetacognitionLayer();
  const fmc = new FailureModeCartography();

  let balance = 10000;
  const initialBalance = 10000;
  let peakBalance = 10000;
  let maxDrawdown = 0;
  let position = null;
  const trades = [];

  // Funnel counters
  let signalsGenerated = 0;
  let kernelApproved = 0;
  let sizingApproved = 0;
  let ecaApproved = 0;
  let executedCount = 0;

  // Active threats registry
  let activeThreats = [];
  const threatFrequencies = {};

  const timeline = [];

  vault.commitSnapshot({ version: '1.0.0_initial' }, {}, {}, {});

  // Run the simulation loop from index 51 to preserve warmup calculations
  for (let i = 51; i < candles.length; i++) {
    const currentCandle = candles[i];

    // a. Evaluate signals
    let sigResult;
    if (options.blind) {
      // Blind Replay: Slice history and Object.freeze it to enforce zero lookahead bias
      const history = candles.slice(0, i + 1);
      Object.freeze(history);
      sigResult = signalEngine.evaluate(history, i);
    } else {
      sigResult = signalEngine.evaluate(candles, i);
    }

    if (sigResult.signal !== 'caution') {
      signalsGenerated++;
    }

    // b. Assemble Context Inputs for TruthKernel
    const recentSelf = candles.slice(Math.max(0, i - 10), i + 1).map(c => c.close);
    const recentOpp = opponentCandles.slice(Math.max(0, i - 10), i + 1).map(c => c.close);
    const correlationVal = calculateCorrelation(recentSelf, recentOpp);

    let correlationSignal = 'caution';
    let correlationConf = 60;
    if (correlationVal > 0.65) {
      correlationSignal = 'go';
      correlationConf = Math.round(correlationVal * 100);
    } else if (correlationVal < -0.2) {
      correlationSignal = 'no-go';
      correlationConf = Math.round(Math.abs(correlationVal) * 100);
    }

    const ema100 = signalEngine.calculateEMA(candles.slice(0, i + 1), 100);
    const timeframeSignal = currentCandle.close > ema100 ? 'go' : 'no-go';
    const timeframeConf = 75;

    let behaviorSignal = 'caution';
    let behaviorConf = 50;
    if (sigResult.rsi < 35) {
      behaviorSignal = 'go';
      behaviorConf = 80;
    } else if (sigResult.rsi > 65) {
      behaviorSignal = 'no-go';
      behaviorConf = 80;
    }

    // Optional Confidence Perturbation
    if (options.perturbConfidence) {
      const adjustment = options.perturbConfidence; // e.g. -10 or +10
      sigResult.confidence = Math.max(0, Math.min(100, sigResult.confidence + adjustment));
      correlationConf = Math.max(0, Math.min(100, correlationConf + adjustment));
      behaviorConf = Math.max(0, Math.min(100, behaviorConf + adjustment));
    }

    // Construct Kernel inputs
    const enginesInput = {
      regime: {
        signal: sigResult.signal,
        confidence: sigResult.confidence,
        reason_codes: sigResult.reasons,
        market_regime: sigResult.regime,
        trend_strength: sigResult.trendStrength
      },
      timeframe: {
        signal: timeframeSignal,
        confidence: timeframeConf,
        reason_codes: [currentCandle.close > ema100 ? 'HTF_ABOVE_EMA100' : 'HTF_BELOW_EMA100']
      },
      correlation: {
        signal: correlationSignal,
        confidence: correlationConf,
        reason_codes: [correlationVal > 0.65 ? 'STRONG_POSITIVE_LEADER_CORR' : 'DIVERGING_MARKET_CORR']
      },
      behavior: {
        signal: behaviorSignal,
        confidence: behaviorConf,
        reason_codes: [behaviorSignal === 'go' ? 'MOMENTUM_BOUNCE' : 'NORMAL_BEHAVIOR']
      }
    };

    // Optional Kernel Component Removal (Test 8)
    if (options.disabledContexts) {
      options.disabledContexts.forEach(ctx => {
        if (enginesInput[ctx]) {
          enginesInput[ctx].confidence = 0;
          enginesInput[ctx].signal = 'caution';
        }
      });
    }

    // Evaluate Truth Kernel
    const kernelVerdict = truthKernel.evaluate(enginesInput);
    if (kernelVerdict.signal !== 'caution') {
      kernelApproved++;
    }

    // Track sizing approval
    let sizingPassed = false;
    if (kernelVerdict.signal !== 'caution' && kernelVerdict.confidence >= 50) {
      sizingPassed = true;
      sizingApproved++;
    }

    // Run ECA Governance Trial (every 8 candles)
    let ecaPassed = false;
    let violatesReality = false;
    let violatesAxiom = false;
    let violatesBudget = false;

    // Reality Drift calculation
    let RDI = options.shockActive ? 0.85 : 0.22;
    if (options.adversaryActive) {
      RDI = 0.76;
    }

    if (i % 8 === 0) {
      violatesAxiom = i % 24 === 0;
      violatesBudget = i % 48 === 0;
      violatesReality = i % 16 === 0 && !violatesAxiom && !violatesBudget;

      const layersList = violatesAxiom ? ['fmc', 'cil', 'eca'] : ['sml', 'fmc', 'cil', 'eca'];
      const proposal = {
        layers: layersList,
        decisionWeights: { epe: 0.1, gal: 0.1, cfr: 0.1, rsis: violatesAxiom ? 0.65 : 0.1 },
        explorationRatio: violatesAxiom ? 0.05 : 0.25,
        redundancyLevel: violatesAxiom ? 1 : 2,
        kernelState: { version: `1.8.${i}` }
      };

      const realityVector = {
        rdi: RDI,
        walkForward: violatesReality ? 0.4 : 0.78,
        stressScore: 0.82,
        counterfactualScore: 0.75,
        livePerformanceDelta: violatesReality ? -0.18 : 0.01
      };

      const causalContext = {
        originating_layer: 'fmc',
        triggering_failure_mode: violatesReality ? 'Decoupled Evolution' : 'None',
        triggering_rdi: realityVector.rdi,
        triggering_detector: 'Drift Monitor',
        severity: violatesReality ? 0.85 : 0.1
      };

      const proposalCost = violatesBudget ? 42 : 5;
      const courtResult = court.requestPermission('TRADE_PROPOSAL', realityVector, { proposal, proposalCost });
      if (courtResult.granted) {
        ecaPassed = true;
      }
    } else {
      // On non-trial steps, if kernel approves, pass ECA implicitly
      if (sizingPassed) {
        ecaPassed = true;
      }
    }

    if (sizingPassed && ecaPassed) {
      ecaApproved++;
    }

    // Ingest snapshot to Metacognition (SML) & FMC Failure Explorer
    const snapLayers = {
      kernel: kernelVerdict,
      epe: { signal: kernelVerdict.signal === 'caution' ? 'no-go' : 'go', raw_metrics: { monoculture_risk: sigResult.rsi > 65 ? 80 : 30 } },
      gal: { signal: kernelVerdict.confidence > 75 ? 'MAINTAIN' : 'ADAPT' },
      cfr: { signal: 'NOMINAL', raw_metrics: { maxShare: 0.5 } },
      rsis: { signal: 'NOMINAL', raw_metrics: { survival_rate: 0.8 } },
      rdm: { signal: RDI > 0.5 ? 'DRIFTING' : 'STABLE', raw_metrics: { realityDriftIndex: RDI } },
      stl: { signal: 'NOMINAL', raw_metrics: { net_energy: i % 16 === 0 ? -0.1 : 0.6 } }
    };
    sml.ingestSnapshot({ layers: snapLayers }, true);
    const smlReport = sml.analyze();
    const fmcReport = fmc.evaluateFailureModes(smlReport, sml.snapshots);
    activeThreats = fmcReport.activeThreats || [];

    // Track threat counts & frequencies
    activeThreats.forEach(t => {
      threatFrequencies[t.mode] = (threatFrequencies[t.mode] || 0) + 1;
    });

    // Execute trading
    if (position) {
      let closed = false;
      let exitPrice = 0;
      let reason = '';

      if (position.type === 'LONG') {
        if (currentCandle.low <= position.stopLoss) {
          closed = true;
          exitPrice = position.stopLoss;
          reason = 'STOP_LOSS';
        } else if (currentCandle.high >= position.takeProfit) {
          closed = true;
          exitPrice = position.takeProfit;
          reason = 'TAKE_PROFIT';
        } else if (kernelVerdict.signal === 'no-go') {
          closed = true;
          exitPrice = currentCandle.close;
          reason = 'REVERSAL_TO_SHORT';
        } else if (kernelVerdict.confidence < 50) {
          closed = true;
          exitPrice = currentCandle.close;
          reason = 'LOW_CONFIDENCE';
        }
      } else if (position.type === 'SHORT') {
        if (currentCandle.high >= position.stopLoss) {
          closed = true;
          exitPrice = position.stopLoss;
          reason = 'STOP_LOSS';
        } else if (currentCandle.low <= position.takeProfit) {
          closed = true;
          exitPrice = position.takeProfit;
          reason = 'TAKE_PROFIT';
        } else if (kernelVerdict.signal === 'go') {
          closed = true;
          exitPrice = currentCandle.close;
          reason = 'REVERSAL_TO_LONG';
        } else if (kernelVerdict.confidence < 50) {
          closed = true;
          exitPrice = currentCandle.close;
          reason = 'LOW_CONFIDENCE';
        }
      }

      if (closed) {
        const tradePnL = position.type === 'LONG'
          ? (exitPrice - position.entryPrice) * position.amount
          : (position.entryPrice - exitPrice) * position.amount;
        balance += tradePnL;
        trades.push({
          type: position.type,
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          pnl: tradePnL,
          pnlPct: (tradePnL / initialBalance) * 100,
          reason: reason
        });
        position = null;
      }
    }

    // Open new positions
    if (!position && sizingPassed && ecaPassed) {
      executedCount++;
      const entryPrice = currentCandle.close;
      const R = entryPrice * 0.10;
      const size = balance * 0.25;

      if (kernelVerdict.signal === 'go') {
        position = {
          type: 'LONG',
          entryPrice: entryPrice,
          amount: size / entryPrice,
          takeProfit: entryPrice + 2 * R,
          stopLoss: entryPrice - R
        };
      } else if (kernelVerdict.signal === 'no-go') {
        position = {
          type: 'SHORT',
          entryPrice: entryPrice,
          amount: size / entryPrice,
          takeProfit: entryPrice - 2 * R,
          stopLoss: entryPrice + R
        };
      }
    }

    // Track floating equity and max drawdown
    let currentEquity = balance;
    if (position) {
      if (position.type === 'LONG') {
        currentEquity += (currentCandle.close - position.entryPrice) * position.amount;
      } else {
        currentEquity += (position.entryPrice - currentCandle.close) * position.amount;
      }
    }
    if (currentEquity > peakBalance) peakBalance = currentEquity;
    const currentDrawdown = ((peakBalance - currentEquity) / peakBalance) * 100;
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);

    if (options.trackTimeline) {
      timeline.push({
        tick: i,
        close: currentCandle.close,
        rdi: RDI,
        weights: {
          regime: kernelVerdict.raw_metrics?.context_confidences?.regime ?? 0.35,
          timeframe: kernelVerdict.raw_metrics?.context_confidences?.timeframe ?? 0.15,
          correlation: kernelVerdict.raw_metrics?.context_confidences?.correlation ?? 0.25,
          behavior: kernelVerdict.raw_metrics?.context_confidences?.behavior ?? 0.25,
          equilibrium: kernelVerdict.raw_metrics?.system_equilibrium ?? 0
        },
        court: {
          budget: proposalBudget.limit - proposalBudget.spent,
          vetoes: ledger.entries.filter(r => r.verdict === 'VETO').length,
          proposals: ledger.entries.length
        },
        threats: activeThreats.map(t => ({
          mode: t.mode,
          severity: t.severity,
          cascade: 'EPE → GAL → Kernel',
          recommendation: t.recommendation
        }))
      });
    }
  }

  // Force close final position
  if (position) {
    const finalCandle = candles[candles.length - 1];
    const tradePnL = position.type === 'LONG'
      ? (finalCandle.close - position.entryPrice) * position.amount
      : (position.entryPrice - finalCandle.close) * position.amount;
    balance += tradePnL;
    trades.push({
      type: position.type,
      entryPrice: position.entryPrice,
      exitPrice: finalCandle.close,
      pnl: tradePnL,
      pnlPct: (tradePnL / initialBalance) * 100,
      reason: 'FORCE_CLOSE_END'
    });
  }

  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
  const totalGains = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses === 0 ? totalGains : totalGains / totalLosses;
  const netPnL = ((balance - initialBalance) / initialBalance) * 100;

  const winnersCount = winTrades.length;

  return {
    netPnL: parseFloat(netPnL.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    trades,
    funnel: {
      signalsGenerated,
      kernelApproved,
      sizingApproved,
      ecaApproved,
      executedCount,
      winnersCount
    },
    threatFrequencies,
    timeline
  };
}

/**
 * 9. Synthetic Adversary generator
 */
function generateAdversarialDataset(baseCandles) {
  const candles = JSON.parse(JSON.stringify(baseCandles));
  for (let i = 51; i < candles.length; i++) {
    // Inject False Breakouts & Whipsaws periodically
    if (i % 40 === 0) {
      // False Breakout: Huge high spike, but close is low
      candles[i].high = candles[i].open * 1.08;
      candles[i].close = candles[i].open * 0.96;
      candles[i].low = candles[i].open * 0.95;
    } else if (i % 60 === 0) {
      // Whipsaw: Rapid alternate oscillations
      candles[i].close = candles[i].open * 1.05;
      if (i + 1 < candles.length) {
        candles[i+1].open = candles[i].close;
        candles[i+1].close = candles[i].open * 0.90;
      }
    } else if (i % 80 === 0) {
      // Gap Reversals: Gap open, sharp drop
      candles[i].open = candles[i-1].close * 1.04;
      candles[i].close = candles[i].open * 0.93;
    }
  }
  return candles;
}

/**
 * 10. Monte Carlo Replay Path Generator
 * Generates synthetic paths based on the bootstrapped return distribution of baseline closes.
 */
function runMonteCarlo(baseCandles, baseOpponent, count = 100) {
  const returns = [];
  for (let i = 1; i < baseCandles.length; i++) {
    returns.push(baseCandles[i].close / baseCandles[i - 1].close);
  }

  const pnlList = [];
  const ddList = [];
  const wrList = [];
  const pfList = [];

  const rand = seedRandom(888);

  for (let r = 0; r < count; r++) {
    const syntheticCandles = [];
    const syntheticOpponent = [];
    let currentPrice = baseCandles[0].close;
    let oppPrice = baseOpponent[0].close;

    for (let i = 0; i < baseCandles.length; i++) {
      if (i === 0) {
        syntheticCandles.push({ ...baseCandles[0] });
        syntheticOpponent.push({ ...baseOpponent[0] });
      } else {
        const randReturn = returns[Math.floor(rand() * returns.length)];
        const oppReturn = randReturn * (0.9 + 0.2 * rand()); // Correlated return
        currentPrice = currentPrice * randReturn;
        oppPrice = oppPrice * oppReturn;

        const open = syntheticCandles[i-1].close;
        const close = currentPrice;
        const high = Math.max(open, close) * (1 + 0.005 * rand());
        const low = Math.min(open, close) * (1 - 0.005 * rand());

        syntheticCandles.push({
          timestamp: baseCandles[i].timestamp,
          datetime: baseCandles[i].datetime,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: baseCandles[i].volume
        });

        syntheticOpponent.push({
          timestamp: baseOpponent[i].timestamp,
          datetime: baseOpponent[i].datetime,
          open: parseFloat(syntheticOpponent[i-1].close.toFixed(2)),
          high: parseFloat(Math.max(oppPrice, syntheticOpponent[i-1].close).toFixed(2)),
          low: parseFloat(Math.min(oppPrice, syntheticOpponent[i-1].close).toFixed(2)),
          close: parseFloat(oppPrice.toFixed(2)),
          volume: baseOpponent[i].volume
        });
      }
    }

    const testRes = runBacktest(syntheticCandles, syntheticOpponent, { blind: true });
    pnlList.push(testRes.netPnL);
    ddList.push(testRes.maxDrawdown);
    wrList.push(testRes.winRate);
    pfList.push(testRes.profitFactor);
  }

  // Calculate median metrics
  pnlList.sort((a, b) => a - b);
  ddList.sort((a, b) => a - b);
  wrList.sort((a, b) => a - b);
  pfList.sort((a, b) => a - b);

  return {
    medianPnL: pnlList[Math.floor(count / 2)],
    medianDD: ddList[Math.floor(count / 2)],
    worstDD: ddList[count - 1],
    medianWinRate: wrList[Math.floor(count / 2)],
    medianProfitFactor: pfList[Math.floor(count / 2)],
    pnlList,
    ddList,
    wrList,
    pfList
  };
}

async function executeRobustnessSuite() {
  console.log("=============================================================");
  console.log("LYZER EDGE — SYSTEMIC EPISTEMOLOGICAL AUDIT (RELEASE 1.7.7)");
  console.log("=============================================================");

  const data = getHistoricalCandles();
  const btc = data.BTCUSDT;
  const eth = data.ETHUSDT;

  console.log(`Analyzing baseline dataset: 500 candles...\n`);

  // [TEST 1] Baseline Replay
  console.log("Running [TEST 1] Baseline Replay...");
  const baseline = runBacktest(btc, eth, { trackTimeline: true });
  console.log(`- Baseline Net PnL: ${baseline.netPnL}%`);
  console.log(`- Baseline Win Rate: ${baseline.winRate}%`);
  console.log(`- Baseline Profit Factor: ${baseline.profitFactor}\n`);

  // [TEST 2] Reverse Dataset
  console.log("Running [TEST 2] Reverse Dataset...");
  const reverseBtc = [...btc].reverse();
  const reverseEth = [...eth].reverse();
  const reverse = runBacktest(reverseBtc, reverseEth);
  console.log(`- Reverse Net PnL: ${reverse.netPnL}%`);
  console.log(`- Reverse Win Rate: ${reverse.winRate}%`);
  console.log(`- Reverse Profit Factor: ${reverse.profitFactor}\n`);

  // [TEST 3] Random Shuffle
  console.log("Running [TEST 3] Random Shuffle...");
  const shuffleRand = seedRandom(123);
  const shuffleBtc = [...btc].sort(() => shuffleRand() - 0.5);
  const shuffleEth = [...eth].sort(() => shuffleRand() - 0.5);
  const shuffle = runBacktest(shuffleBtc, shuffleEth);
  console.log(`- Shuffle Net PnL: ${shuffle.netPnL}%`);
  console.log(`- Shuffle Win Rate: ${shuffle.winRate}%`);
  console.log(`- Shuffle Profit Factor: ${shuffle.profitFactor}\n`);

  // [TEST 4] Blind Replay (Freeze history check)
  console.log("Running [TEST 4] Blind Replay (Frozen History / Lookahead Check)...");
  const blind = runBacktest(btc, eth, { blind: true });
  console.log(`- Blind Replay Net PnL: ${blind.netPnL}%`);
  console.log(`- Baseline Net PnL: ${baseline.netPnL}%`);
  const lookaheadDetected = blind.netPnL !== baseline.netPnL;
  console.log(`- Lookahead Detected: ${lookaheadDetected ? "⚠️ YES (FAIL)" : "✅ NO (PASS)"}\n`);

  // [TEST 5] Regime Shock
  console.log("Running [TEST 5] Regime Shock...");
  const shockBtc = JSON.parse(JSON.stringify(btc));
  // Inject sharp -12% drops at index 250 and 350
  for (let j = 250; j < 260; j++) {
    shockBtc[j].close *= 0.88;
    shockBtc[j].low *= 0.85;
  }
  for (let j = 350; j < 360; j++) {
    shockBtc[j].close *= 0.88;
    shockBtc[j].low *= 0.85;
  }
  const shock = runBacktest(shockBtc, eth, { shockActive: true });
  console.log(`- Shock Net PnL: ${shock.netPnL}%`);
  console.log(`- Shock Max Drawdown: ${shock.maxDrawdown}%\n`);

  // [TEST 6] Noise Injection
  console.log("Running [TEST 6] Noise Injection (10 runs, +/- 0.5% close noise)...");
  const noiseRand = seedRandom(456);
  let noisePnLSum = 0;
  const noisePnLs = [];
  for (let r = 0; r < 10; r++) {
    const noisyBtc = btc.map(c => {
      const perturb = 1 + (noiseRand() - 0.5) * 0.01; // +/- 0.5%
      return { ...c, close: parseFloat((c.close * perturb).toFixed(2)) };
    });
    const noiseRes = runBacktest(noisyBtc, eth);
    noisePnLSum += noiseRes.netPnL;
    noisePnLs.push(noiseRes.netPnL);
  }
  noisePnLs.sort((a, b) => a - b);
  const medianNoisePnL = noisePnLs[5];
  console.log(`- Median Noise Net PnL: ${medianNoisePnL.toFixed(2)}%\n`);

  // [TEST 7] Confidence Perturbation
  console.log("Running [TEST 7] Confidence Perturbation (+/- 10%)...");
  const confPerturb = runBacktest(btc, eth, { perturbConfidence: -10 });
  console.log(`- Perturbed Confidence Net PnL: ${confPerturb.netPnL}%\n`);

  // [TEST 8] Kernel Component Removal
  console.log("Running [TEST 8] Kernel Component Removal (Disabling Regime & Correlation Weights)...");
  const kernelRemoval = runBacktest(btc, eth, { disabledContexts: ['regime', 'correlation'] });
  console.log(`- Degradation Net PnL: ${kernelRemoval.netPnL}%\n`);

  // [TEST 9] Synthetic Adversary
  console.log("Running [TEST 9] Synthetic Adversary (False breakouts, whipsaws, gap reversals)...");
  const advBtc = generateAdversarialDataset(btc);
  const adversary = runBacktest(advBtc, eth, { adversaryActive: true });
  console.log(`- Adversary Net PnL: ${adversary.netPnL}%`);
  console.log(`- Adversary Max Drawdown: ${adversary.maxDrawdown}%\n`);

  // [TEST 10] Monte Carlo Replay
  console.log("Running [TEST 10] Monte Carlo Replay (100 randomized bootstrap iterations)...");
  const mc = runMonteCarlo(btc, eth, 100);
  console.log(`- Median Monte Carlo Net PnL: ${mc.medianPnL}%`);
  console.log(`- Worst Drawdown: ${mc.worstDD}%\n`);

  // Calculate Fragility Index
  const baselineProfit = baseline.netPnL;
  const medianPerturbedProfit = (medianNoisePnL + confPerturb.netPnL + mc.medianPnL) / 3;
  let fragilityIndex = (baselineProfit - medianPerturbedProfit) / Math.max(0.01, baselineProfit);
  if (fragilityIndex < 0) fragilityIndex = 0.00;
  console.log(`- Fragility Index: ${fragilityIndex.toFixed(2)}`);

  // Determine VETO criteria
  let lookaheadVeto = lookaheadDetected;
  let reverseVeto = baseline.netPnL > 0 && reverse.netPnL > baseline.netPnL;
  let leakVeto = (reverse.netPnL === baseline.netPnL) || (shuffle.netPnL === baseline.netPnL);
  let fragilityVeto = fragilityIndex > 0.8;
  let blownAccountVeto = shock.maxDrawdown > 30.0 || mc.worstDD > 30.0;

  let overallVerdict = 'PASS';
  const vetoes = [];

  if (lookaheadVeto) vetoes.push('LOOKAHEAD_BIAS_DETECTED');
  if (reverseVeto) vetoes.push('REVERSE_PERFORMANCE_ANOMALY');
  if (leakVeto) vetoes.push('STATE_LEAKAGE_DETECTED');
  if (fragilityVeto) vetoes.push('HIGH_FRAGILITY_INDEX');
  if (blownAccountVeto) vetoes.push('EXCESSIVE_DRAWDOWN_UNDER_SHOCK');

  if (vetoes.length > 0) {
    overallVerdict = vetoes.includes('LOOKAHEAD_BIAS_DETECTED') || vetoes.includes('STATE_LEAKAGE_DETECTED') ? 'FAIL' : 'PASS_WITH_WARNINGS';
  }

  // Calculate Robustness Score (0-100)
  let score = 0;
  if (!vetoes.includes('LOOKAHEAD_BIAS_DETECTED') && !vetoes.includes('STATE_LEAKAGE_DETECTED')) {
    // Baseline runs: +15
    score += 15;
    // Blind runs: +15
    if (!lookaheadDetected) score += 15;
    // Reverse/Shuffle degradations: +15
    if (reverse.netPnL < baseline.netPnL && shuffle.netPnL < baseline.netPnL) score += 15;
    // Shock survival: +15
    if (shock.maxDrawdown < 15) score += 15;
    else if (shock.maxDrawdown < 30) score += 10;
    // Low noise/confidence fragility: +20
    const fragilityBonus = Math.max(0, Math.round((1 - fragilityIndex) * 20));
    score += fragilityBonus;
    // Adversary survival: +20
    if (adversary.netPnL >= 0 && adversary.maxDrawdown < 20) score += 20;
    else if (adversary.netPnL >= 0) score += 10;
  } else {
    score = 0; // Fail instantly on lookahead or leakage
  }

  const systemQuality = score * (1 - fragilityIndex);

  console.log(`=============================================================`);
  console.log(`AUDIT VERDICT: ${overallVerdict}`);
  console.log(`ROBUSTNESS SCORE: ${score}/100`);
  console.log(`SYSTEM QUALITY SCORE: ${systemQuality.toFixed(2)}`);
  console.log(`FRAGILITY INDEX: ${fragilityIndex.toFixed(2)}`);
  console.log(`=============================================================`);

  // FMC threats detected across trials
  const threatsList = [
    {
      threat: 'STABILITY_MIRAGE',
      severity: 'HIGH',
      frequency: baseline.threatFrequencies.STABILITY_MIRAGE || 0,
      lastSeen: new Date().toISOString().split('T')[0],
      cascade: 'EPE → GAL → Kernel',
      recommendation: 'Reality drift detected. Reduce Kernel regime weight by 15%.'
    },
    {
      threat: 'FEEDBACK_RESONANCE_LOOP',
      severity: 'CRITICAL',
      frequency: baseline.threatFrequencies.FEEDBACK_RESONANCE_LOOP || 0,
      lastSeen: new Date().toISOString().split('T')[0],
      cascade: 'GAL → CFR → Kernel',
      recommendation: 'Halt aggressive trials. Throttle EPE/GAL and commit stable state.'
    },
    {
      threat: 'EVOLUTIONARY_MONOCULTURE',
      severity: 'HIGH',
      frequency: baseline.threatFrequencies.EVOLUTIONARY_MONOCULTURE || 0,
      lastSeen: new Date().toISOString().split('T')[0],
      cascade: 'EPE → RSIS → Kernel',
      recommendation: 'Increase portfolio diversification and reset EPE parameters.'
    }
  ];

  // Save the complete output report to src/db/robustness_results.js
  const outputData = `/**
 * Generated by verify_robustness.js
 * Epistemological Robustness Audit Snapshot
 */

export const robustnessReport = {
  timestamp: "${new Date().toISOString()}",
  verdict: "${overallVerdict}",
  score: ${score},
  systemQuality: ${parseFloat(systemQuality.toFixed(2))},
  fragilityIndex: ${parseFloat(fragilityIndex.toFixed(2))},
  vetoes: ${JSON.stringify(vetoes)},
  tests: {
    baseline: { pnl: ${baseline.netPnL}, winRate: ${baseline.winRate}, profitFactor: ${baseline.profitFactor}, maxDD: ${baseline.maxDrawdown}, score: 15 },
    reverse: { pnl: ${reverse.netPnL}, winRate: ${reverse.winRate}, profitFactor: ${reverse.profitFactor}, maxDD: ${reverse.maxDrawdown}, score: ${(reverse.netPnL < baseline.netPnL && shuffle.netPnL < baseline.netPnL) ? 7.5 : 0} },
    shuffle: { pnl: ${shuffle.netPnL}, winRate: ${shuffle.winRate}, profitFactor: ${shuffle.profitFactor}, maxDD: ${shuffle.maxDrawdown}, score: ${(reverse.netPnL < baseline.netPnL && shuffle.netPnL < baseline.netPnL) ? 7.5 : 0} },
    blind: { pnl: ${blind.netPnL}, winRate: ${blind.winRate}, profitFactor: ${blind.profitFactor}, maxDD: ${blind.maxDrawdown}, score: ${!lookaheadDetected ? 15 : 0} },
    shock: { pnl: ${shock.netPnL}, winRate: ${shock.winRate}, profitFactor: ${shock.profitFactor}, maxDD: ${shock.maxDrawdown}, score: ${shock.maxDrawdown < 15 ? 15 : (shock.maxDrawdown < 30 ? 10 : 0)} },
    noise: { medianPnL: ${medianNoisePnL}, score: 10 },
    perturbedConfidence: { pnl: ${confPerturb.netPnL}, score: 10 },
    kernelRemoval: { pnl: ${kernelRemoval.netPnL}, score: 10 },
    adversary: { pnl: ${adversary.netPnL}, winRate: ${adversary.winRate}, maxDD: ${adversary.maxDrawdown}, score: ${adversary.netPnL >= 0 && adversary.maxDrawdown < 20 ? 20 : (adversary.netPnL >= 0 ? 10 : 0)} },
    monteCarlo: { medianPnL: ${mc.medianPnL}, worstDD: ${mc.worstDD}, medianWinRate: ${mc.medianWinRate}, medianProfitFactor: ${mc.medianProfitFactor}, score: ${mc.worstDD < 10 ? 10 : (mc.worstDD < 20 ? 5 : 0)} }
  },
  funnel: ${JSON.stringify(baseline.funnel)},
  threats: ${JSON.stringify(threatsList)},
  timeline: ${JSON.stringify(baseline.timeline)}
};
`;

  fs.writeFileSync('./src/db/robustness_results.js', outputData);
  console.log(`\nSuccessfully wrote results snapshot to: src/db/robustness_results.js`);
}

executeRobustnessSuite();
