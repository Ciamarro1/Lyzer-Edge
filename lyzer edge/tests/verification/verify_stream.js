/**
 * verify_stream.js
 * Comprehensive integration test simulating the entire governed adaptive execution pipeline.
 */

import { getHistoricalCandles } from './src/db/historicalData.js';
import { SignalEngine } from './src/engine/signalEngine.js';
import { TruthKernel } from './src/engine/kernel.js';
import { ConstitutionalCourt } from './src/eca/court.js';
import { RealityAnchor } from './src/eca/realityAnchor.js';
import { IrreversibilityVault } from './src/eca/vault.js';
import { ConstitutionalLedger } from './src/eca/ledger.js';
import { ProposalBudget } from './src/eca/proposalBudget.js';
import { computeTradeEV } from './src/engine/evProfiler.js';
import { runEVOptimization } from './src/engine/evOptimizer.js';
import { evaluateExecution, calculateFillProbability } from './src/engine/executionReality.js';
import { ZSpaceEVOptimizer } from './src/engine/zSpaceEVOptimizer.js';
import { ZPolicyEngine } from './src/engine/zPolicyEngine.js';

// Global attribution memory tracking
const tradeHistoryByAsset = {
  BTCUSDT: [],
  ETHUSDT: []
};

const globalEVMemory = {
  signalBuckets: {},
  regimeBuckets: {},
  governanceStats: { allowed: 0, rejected: 0, capacityConstrained: 0 }
};

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

function calculateVolPct(candles, index) {
  if (index < 20) return 0.005; // Default vol fallback (0.5%)
  const recentCloses = candles.slice(index - 19, index + 1).map(c => c.close);
  const mean = recentCloses.reduce((a, b) => a + b, 0) / 20;
  const variance = recentCloses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

function runFullSimulation(symbol, candles, opponentCandles, config = {}, options = { silent: false }) {
  if (!options.silent) {
    console.log(`\n======================================================`);
    console.log(`SIMULATION RUN FOR: ${symbol} (500 Candle Replay)`);
    console.log(`======================================================`);
  }

  // 1. Initialise all engines and ECA components
  const signalEngine = new SignalEngine();
  const truthKernel = new TruthKernel({
    masterSwitchThreshold: config.confidenceThreshold ?? 50,
    chopPenalty: config.chopPenalty ?? 0.7
  });
  const realityAnchor = new RealityAnchor();
  const vault = new IrreversibilityVault();
  const ledger = new ConstitutionalLedger();
  const proposalBudget = new ProposalBudget();
  const court = new ConstitutionalCourt(realityAnchor, vault, ledger, proposalBudget);

  // Paper Account metrics
  let balance = 10000;
  const initialBalance = 10000;
  let peakBalance = 10000;
  let maxDrawdown = 0;
  let position = null;
  const trades = [];

  // Funnel counters
  let totalSignalsGenerated = 0;
  let totalKernelApproved = 0;
  let totalEcaApproved = 0;
  let totalEcaVetoed = 0;

  // EV Profiler logging structures
  const candidatesList = [];
  const kernelVerdicts = {}; // Map of index -> kernelVerdict
  let limitOrder = null;     // Microstructure limit order tracking

  // Initialise vault stable state
  vault.commitSnapshot({ version: '1.0.0_initial' }, {}, {}, {});

  // 2. Loop through candles starting at index 51 (warmup finished)
  for (let i = 51; i < candles.length; i++) {
    const currentCandle = candles[i];
    
    // a. Compute signals from SignalEngine
    const sigResult = signalEngine.evaluate(candles, i);
    let candidate = null;
    if (sigResult.signal !== 'caution') {
      if (globalPolicyEngine) {
        const policyVerdict = globalPolicyEngine.evaluatePolicy(sigResult.Z_t || 0);
        if (!policyVerdict.allowed) {
          sigResult.signal = 'caution';
          sigResult.reasons.push(policyVerdict.reason);
        }
      }
    }
    if (sigResult.signal !== 'caution') {
      totalSignalsGenerated++;

      // Compute local timing offset based on best price in next 3 candles
      let idealPrice = currentCandle.close;
      const lookahead = candles.slice(i, Math.min(candles.length, i + 3));
      if (sigResult.signal === 'go') {
        idealPrice = Math.min(...lookahead.map(c => c.low));
      } else {
        idealPrice = Math.max(...lookahead.map(c => c.high));
      }
      const timingOffset = Math.abs(currentCandle.close - idealPrice) / currentCandle.close;

      const recentCandles = candles.slice(Math.max(0, i - 19), i + 1);
      const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const volPct = calculateVolPct(candles, i);

      const execMetrics = evaluateExecution({
        orderType: (config.limitDiscountFactor ?? 0.0) > 0.0 ? 'LIMIT' : 'MARKET',
        price: currentCandle.close,
        size: 1.0,
        avgVolume,
        volPct,
        spread: 0.0001,
        limitOffset: (config.limitDiscountFactor ?? 0.0) * currentCandle.close * volPct,
        timeToExpiry: config.limitExpiry ?? 3,
        orderBookImbalance: 0.1,
        latencyMs: 15,
        queuePosition: 10,
        totalQueue: 100
      });

      candidate = {
        id: `${symbol}_${i}`,
        timestamp: i,
        symbol: symbol,
        direction: sigResult.signal === 'go' ? 'LONG' : 'SHORT',
        entryPrice: currentCandle.close,
        limitPrice: currentCandle.close, // Default to market (close)
        signal: {
          type: sigResult.signal === 'go' ? 'LONG' : 'SHORT',
          confidence: sigResult.confidence,
          reasons: sigResult.reasons
        },
        regime: sigResult.regime,
        wasRejected: false,
        governanceDecision: 'REJECT', // default
        reasonCodes: [...sigResult.reasons],
        slippage: execMetrics.slippage,
        spread: 0.0001,
        distortionFactor: execMetrics.distortionFactor,
        timingOffset: timingOffset
      };
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

    // c. Run TruthKernel
    const kernelVerdict = truthKernel.evaluate(enginesInput);
    kernelVerdicts[i] = kernelVerdict;
    if (kernelVerdict.signal !== 'caution') {
      totalKernelApproved++;
    }

    if (candidate) {
      if (kernelVerdict.signal !== 'caution') {
        candidate.reasonCodes = Array.from(new Set([...candidate.reasonCodes, ...kernelVerdict.reason_codes]));
        if (position) {
          candidate.governanceDecision = 'CAPACITY_CONSTRAINED';
          candidate.wasRejected = false;
        } else {
          candidate.governanceDecision = 'ALLOW';
          candidate.wasRejected = false;
        }
      } else {
        candidate.governanceDecision = 'REJECT';
        candidate.wasRejected = true;
        candidate.reasonCodes = Array.from(new Set([...candidate.reasonCodes, ...kernelVerdict.reason_codes]));
      }
      candidatesList.push(candidate);
    }

    // d. Execute Position Updates (Paper Trading with hybrid exit logic)
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
        const pnlPct = position.type === 'LONG'
          ? (exitPrice - position.entryPrice) / position.entryPrice
          : (position.entryPrice - exitPrice) / position.entryPrice;
        balance += tradePnL;
        trades.push({
          type: position.type,
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          pnl: tradePnL,
          pnlPct: (tradePnL / initialBalance) * 100,
          reason: reason
        });

        const cand = candidatesList.find(c => c.id === position.candidateId);
        if (cand) {
          cand.exitPrice = exitPrice;
          cand.pnl = pnlPct;
        }

        position = null;
      }
    }

    // Evaluate active Limit Order if no position exists
    if (!position && limitOrder) {
      let filled = false;
      const limitOffset = Math.abs(currentCandle.close - limitOrder.limitPrice);
      const volPct = calculateVolPct(candles, i);
      const timeToExpiry = Math.max(1, limitOrder.expiryIndex - i);
      const fillProb = calculateFillProbability(limitOffset, volPct, currentCandle.close, timeToExpiry);

      // Deterministic roll using index and limitPrice
      const roll = ((i * 12345 + Math.floor(limitOrder.limitPrice)) % 1000) / 1000;

      if (limitOrder.type === 'LONG' && currentCandle.low <= limitOrder.limitPrice) {
        if (roll <= fillProb) {
          filled = true;
        }
      } else if (limitOrder.type === 'SHORT' && currentCandle.high >= limitOrder.limitPrice) {
        if (roll <= fillProb) {
          filled = true;
        }
      }

      if (filled) {
        const entryPrice = limitOrder.limitPrice;
        const R = entryPrice * 0.10;
        const rr = config.riskReward ?? 2.0;

        position = {
          type: limitOrder.type,
          entryPrice: entryPrice,
          amount: (balance * 0.25) / entryPrice,
          takeProfit: limitOrder.type === 'LONG' ? entryPrice + rr * R : entryPrice - rr * R,
          stopLoss: limitOrder.type === 'LONG' ? entryPrice - R : entryPrice + R,
          candidateId: limitOrder.candidateId
        };

        limitOrder = null;
      } else if (i >= limitOrder.expiryIndex) {
        // Expiry - cancel the limit order
        const cand = candidatesList.find(c => c.id === limitOrder.candidateId);
        if (cand) {
          cand.governanceDecision = 'CANCELLED_LIMIT';
          cand.pnl = 0;
          cand.exitPrice = cand.entryPrice;
        }
        limitOrder = null;
      }
    }

    // Trigger new Limit Order placement if no position and no active limit order
    if (!position && !limitOrder) {
      if (kernelVerdict.signal === 'go' && kernelVerdict.confidence >= 50) {
        const entryPrice = currentCandle.close;
        const discountFactor = config.limitDiscountFactor ?? 0.0;

        if (discountFactor === 0.0) {
          // Market order: fill immediately
          const R = entryPrice * 0.10;
          const rr = config.riskReward ?? 2.0;
          position = {
            type: 'LONG',
            entryPrice: entryPrice,
            amount: (balance * 0.25) / entryPrice,
            takeProfit: entryPrice + rr * R,
            stopLoss: entryPrice - R,
            candidateId: `${symbol}_${i}`
          };
        } else {
          // Place limit order
          const volPct = calculateVolPct(candles, i);
          const pullbackOffset = entryPrice * volPct * discountFactor;
          const limitPrice = entryPrice - pullbackOffset;

          limitOrder = {
            type: 'LONG',
            limitPrice: limitPrice,
            expiryIndex: i + (config.limitExpiry ?? 3),
            candidateId: `${symbol}_${i}`
          };

          // Update corresponding candidate's limitPrice
          const cand = candidatesList.find(c => c.id === `${symbol}_${i}`);
          if (cand) {
            cand.limitPrice = limitPrice;
          }
        }
      } else if (kernelVerdict.signal === 'no-go' && kernelVerdict.confidence >= 50) {
        const entryPrice = currentCandle.close;
        const discountFactor = config.limitDiscountFactor ?? 0.0;

        if (discountFactor === 0.0) {
          // Market order: fill immediately
          const R = entryPrice * 0.10;
          const rr = config.riskReward ?? 2.0;
          position = {
            type: 'SHORT',
            entryPrice: entryPrice,
            amount: (balance * 0.25) / entryPrice,
            takeProfit: entryPrice - rr * R,
            stopLoss: entryPrice + R,
            candidateId: `${symbol}_${i}`
          };
        } else {
          // Place limit order
          const volPct = calculateVolPct(candles, i);
          const pullbackOffset = entryPrice * volPct * discountFactor;
          const limitPrice = entryPrice + pullbackOffset;

          limitOrder = {
            type: 'SHORT',
            limitPrice: limitPrice,
            expiryIndex: i + (config.limitExpiry ?? 3),
            candidateId: `${symbol}_${i}`
          };

          // Update corresponding candidate's limitPrice
          const cand = candidatesList.find(c => c.id === `${symbol}_${i}`);
          if (cand) {
            cand.limitPrice = limitPrice;
          }
        }
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

    // e. Run ECA Governance Trials (every 8 candles)
    if (i % 8 === 0) {
      const violatesAxiom = i % 24 === 0;
      const violatesBudget = i % 48 === 0;
      const violatesReality = i % 16 === 0 && !violatesAxiom && !violatesBudget;

      const layers = violatesAxiom ? ['fmc', 'cil', 'eca'] : ['sml', 'fmc', 'cil', 'eca'];
      const decisionWeights = { epe: 0.1, gal: 0.1, cfr: 0.1, rsis: violatesAxiom ? 0.65 : 0.1 };
      
      const proposal = {
        layers,
        decisionWeights,
        explorationRatio: violatesAxiom ? 0.05 : 0.25,
        redundancyLevel: violatesAxiom ? 1 : 2,
        kernelState: { version: `1.8.${i}` }
      };

      const realityVector = {
        rdi: violatesReality ? 0.85 : 0.22,
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
      const verdict = court.requestPermission('TRADE_PROPOSAL', realityVector, { proposal, proposalCost });
      if (verdict.granted) {
        totalEcaApproved++;
      } else {
        totalEcaVetoed++;
      }
    }
  }

  // Force close any open position at the end of simulation
  if (position) {
    const finalCandle = candles[candles.length - 1];
    const tradePnL = position.type === 'LONG'
      ? (finalCandle.close - position.entryPrice) * position.amount
      : (position.entryPrice - finalCandle.close) * position.amount;
    const pnlPct = position.type === 'LONG'
      ? (finalCandle.close - position.entryPrice) / position.entryPrice
      : (position.entryPrice - finalCandle.close) / position.entryPrice;
    balance += tradePnL;
    trades.push({
      type: position.type,
      entryPrice: position.entryPrice,
      exitPrice: finalCandle.close,
      pnl: tradePnL,
      pnlPct: (tradePnL / initialBalance) * 100,
      reason: 'FORCE_CLOSE_END'
    });

    const cand = candidatesList.find(c => c.id === position.candidateId);
    if (cand) {
      cand.exitPrice = finalCandle.close;
      cand.pnl = pnlPct;
    }
    position = null;
  }

  // 3. Shadow Replay Lazy Evaluation (Post-simulation batch pass)
  for (const cand of candidatesList) {
    if (cand.pnl !== undefined) {
      continue; // Already processed ALLOW trades
    }

    const entryIdx = cand.timestamp;
    const direction = cand.direction;
    const limitPrice = cand.limitPrice ?? cand.entryPrice;
    const limitExpiry = config.limitExpiry ?? 3;
    const rr = config.riskReward ?? 2.0;

    let filled = false;
    let filledIdx = entryIdx;

    if (cand.governanceDecision === 'CANCELLED_LIMIT') {
      // Find the first candle within the expiry window where the limit order is hit
      for (let j = entryIdx + 1; j <= Math.min(candles.length - 1, entryIdx + limitExpiry); j++) {
        const candle = candles[j];
        if (direction === 'LONG' && candle.low <= limitPrice) {
          const limitOffset = Math.abs(candles[entryIdx].close - limitPrice);
          const volPct = calculateVolPct(candles, entryIdx);
          const timeToExpiry = Math.max(1, entryIdx + limitExpiry - j);
          const fillProb = calculateFillProbability(limitOffset, volPct, candles[entryIdx].close, timeToExpiry);
          const roll = ((j * 12345 + Math.floor(limitPrice)) % 1000) / 1000;
          if (roll <= fillProb) {
            filled = true;
            filledIdx = j;
            break;
          }
        } else if (direction === 'SHORT' && candle.high >= limitPrice) {
          const limitOffset = Math.abs(candles[entryIdx].close - limitPrice);
          const volPct = calculateVolPct(candles, entryIdx);
          const timeToExpiry = Math.max(1, entryIdx + limitExpiry - j);
          const fillProb = calculateFillProbability(limitOffset, volPct, candles[entryIdx].close, timeToExpiry);
          const roll = ((j * 12345 + Math.floor(limitPrice)) % 1000) / 1000;
          if (roll <= fillProb) {
            filled = true;
            filledIdx = j;
            break;
          }
        }
      }
    } else {
      // REJECT candidates are simulated as market orders filled immediately
      filled = true;
      filledIdx = entryIdx;
    }

    if (!filled) {
      cand.exitPrice = cand.entryPrice;
      cand.pnl = 0;
      continue;
    }

    // Now run simulation of the position from filledIdx onwards
    const R = limitPrice * 0.10;
    const takeProfit = direction === 'LONG' ? limitPrice + rr * R : limitPrice - rr * R;
    const stopLoss = direction === 'LONG' ? limitPrice - R : limitPrice + R;

    let exitPrice = 0;
    let closed = false;

    for (let j = filledIdx + 1; j < candles.length; j++) {
      const candle = candles[j];
      const kv = kernelVerdicts[j] || { signal: 'caution', confidence: 0 };

      if (direction === 'LONG') {
        if (candle.low <= stopLoss) {
          closed = true;
          exitPrice = stopLoss;
        } else if (candle.high >= takeProfit) {
          closed = true;
          exitPrice = takeProfit;
        } else if (kv.signal === 'no-go') {
          closed = true;
          exitPrice = candle.close;
        } else if (kv.confidence < 50) {
          closed = true;
          exitPrice = candle.close;
        }
      } else {
        // SHORT
        if (candle.high >= stopLoss) {
          closed = true;
          exitPrice = stopLoss;
        } else if (candle.low <= takeProfit) {
          closed = true;
          exitPrice = takeProfit;
        } else if (kv.signal === 'go') {
          closed = true;
          exitPrice = candle.close;
        } else if (kv.confidence < 50) {
          closed = true;
          exitPrice = candle.close;
        }
      }

      if (closed) {
        break;
      }
    }

    if (!closed) {
      exitPrice = candles[candles.length - 1].close;
    }

    cand.exitPrice = exitPrice;
    cand.pnl = direction === 'LONG'
      ? (exitPrice - limitPrice) / limitPrice
      : (limitPrice - exitPrice) / limitPrice;
  }

  // 4. EV Attribution Attribution Run & History Memory Feeding
  const localHistory = [];
  for (const cand of candidatesList) {
    const evReport = computeTradeEV(cand, {}, localHistory, globalEVMemory);
    localHistory.push({
      ...cand,
      ev: evReport
    });
  }

  tradeHistoryByAsset[symbol] = localHistory;

  // Calculate stats
  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl < 0);
  const winRate = (winTrades.length / (trades.length || 1)) * 100;

  const totalGains = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses === 0 ? totalGains : totalGains / totalLosses;

  // Count exit reasons
  const reasonCounts = {};
  trades.forEach(t => {
    reasonCounts[t.reason] = (reasonCounts[t.reason] || 0) + 1;
  });

  if (!options.silent) {
    console.log(`\nSIMULATION RESULTS DETAIL:`);
    console.log(`- Exit Reasons:`, reasonCounts);
    if (trades.length > 0) {
      console.log(`- Sample Trades (first 10):`);
      trades.slice(0, 10).forEach((t, index) => {
        console.log(`  [${index + 1}] Type: ${t.type} | Entry: $${t.entryPrice.toFixed(2)} | Exit: $${t.exitPrice.toFixed(2)} | PnL: $${t.pnl.toFixed(2)} (${t.pnlPct.toFixed(2)}%) | Reason: ${t.reason}`);
      });
    }

    console.log(`\n500 candles\n`);
    console.log(`${totalSignalsGenerated} Signals (LONG/SHORT)`);
    console.log(`HOLD: ${candles.length - 51 - totalSignalsGenerated}\n`);
    console.log(`Trades: ${trades.length}`);
    console.log(`Wins: ${winTrades.length}`);
    console.log(`Losses: ${lossTrades.length}\n`);
    console.log(`Win Rate: ${winRate.toFixed(1)}%\n`);
    console.log(`Profit Factor: ${profitFactor.toFixed(2)}\n`);
    console.log(`Max Drawdown: ${maxDrawdown.toFixed(1)}%\n`);
    console.log(`Net PnL: ${(((balance - initialBalance) / initialBalance) * 100).toFixed(1)}%`);

    console.log(`\nGOVERNANCE FUNNEL SUMMARY:`);
    console.log(`- Raw Signals Generated: ${totalSignalsGenerated}`);
    console.log(`- Truth Kernel Approved:  ${totalKernelApproved}`);
    console.log(`- ECA Court Evaluations:  ${totalEcaApproved + totalEcaVetoed}`);
    console.log(`  * Proposals Approved:   ${totalEcaApproved}`);
    console.log(`  * Proposals Vetoed:     ${totalEcaVetoed}`);
    
    // Calculate and print Survival Rate & Constitutional Friction Index
    const survivalRate = totalSignalsGenerated > 0 ? (totalKernelApproved / totalSignalsGenerated) * 100 : 0;
    const cfi = totalSignalsGenerated > 0 ? (totalEcaVetoed / (totalEcaApproved + totalEcaVetoed || 1)) * 100 : 0;
    console.log(`- Decision Survival Rate: ${survivalRate.toFixed(1)}%`);
    console.log(`- Constitutional Friction Index (CFI): ${cfi.toFixed(1)}%`);

    // 5. Print Local EV Attribution Dashboard
    const totalSignals = localHistory.length;
    const allows = localHistory.filter(h => h.governanceDecision === 'ALLOW');
    const rejects = localHistory.filter(h => h.governanceDecision === 'REJECT');
    const capacityConstrained = localHistory.filter(h => h.governanceDecision === 'CAPACITY_CONSTRAINED');
    const cancelledLimit = localHistory.filter(h => h.governanceDecision === 'CANCELLED_LIMIT');

    const avgEV = (arr) => arr.length ? (arr.reduce((sum, h) => sum + h.ev.totalEV, 0) / arr.length * 100).toFixed(4) + '%' : '0.0000%';
    const avgPnlVal = (arr) => arr.length ? (arr.reduce((sum, h) => sum + h.pnl, 0) / arr.length * 100).toFixed(4) + '%' : '0.0000%';
    const avgComponent = (arr, component) => arr.length ? (arr.reduce((sum, h) => sum + h.ev.breakdown[component], 0) / arr.length * 100).toFixed(4) + '%' : '0.0000%';

    console.log(`\n======================================================`);
    console.log(`🧠 EV ATTRIBUTION PORTFOLIO DECOMPOSITION: ${symbol}`);
    console.log(`======================================================`);
    console.log(`Total Candidates Evaluated: ${totalSignals}`);
    console.log(`  * ALLOW (Executed):       ${allows.length}`);
    console.log(`  * REJECT (Shadow):        ${rejects.length}`);
    console.log(`  * CAPACITY_CONSTRAINED:   ${capacityConstrained.length}`);
    console.log(`  * CANCELLED_LIMIT (Shadow):${cancelledLimit.length}`);
    console.log(`------------------------------------------------------`);
    console.log(`AVERAGE PERFORMANCE BY DECISION TYPE:`);
    console.log(`  * ALLOW (Executed PnL):   ${avgPnlVal(allows)}  | Avg EV: ${avgEV(allows)}`);
    console.log(`  * REJECT (Shadow PnL):    ${avgPnlVal(rejects)}  | Avg EV: ${avgEV(rejects)}`);
    console.log(`  * CAPACITY_CONSTRAINED:   ${avgPnlVal(capacityConstrained)}  | Avg EV: ${avgEV(capacityConstrained)}`);
    console.log(`  * CANCELLED_LIMIT (Shadow):${avgPnlVal(cancelledLimit)}  | Avg EV: ${avgEV(cancelledLimit)}`);
    console.log(`------------------------------------------------------`);
    console.log(`CAUSAL ATTRIBUTION COMPONENT BREAKDOWN (All Signals):`);
    console.log(`  * Signal EV:     ${avgComponent(localHistory, 'signalEV')}`);
    console.log(`  * Regime EV:     ${avgComponent(localHistory, 'regimeEV')}`);
    console.log(`  * Governance EV: ${avgComponent(localHistory, 'governanceEV')}`);
    console.log(`  * Execution EV:  ${avgComponent(localHistory, 'executionEV')}`);
    console.log(`  * Timing EV:     ${avgComponent(localHistory, 'timingEV')}`);
    console.log(`------------------------------------------------------`);
    console.log(`DECISION AUDITING MATRIX (Classification Count):`);
    const counts = { TRUE_POSITIVE: 0, FALSE_POSITIVE: 0, TRUE_NEGATIVE: 0, FALSE_NEGATIVE: 0, CAPACITY_CONSTRAINED: 0, CANCELLED_LIMIT: 0 };
    localHistory.forEach(h => {
      counts[h.ev.classification] = (counts[h.ev.classification] || 0) + 1;
    });
    console.log(`  * True Positive (Correct Entry):   ${counts.TRUE_POSITIVE} (${(counts.TRUE_POSITIVE / (totalSignals || 1) * 100).toFixed(1)}%)`);
    console.log(`  * False Positive (Bad Entry):      ${counts.FALSE_POSITIVE} (${(counts.FALSE_POSITIVE / (totalSignals || 1) * 100).toFixed(1)}%)`);
    console.log(`  * True Negative (Correct Veto):    ${counts.TRUE_NEGATIVE} (${(counts.TRUE_NEGATIVE / (totalSignals || 1) * 100).toFixed(1)}%)`);
    console.log(`  * False Negative (Missed Profit):  ${counts.FALSE_NEGATIVE} (${(counts.FALSE_NEGATIVE / (totalSignals || 1) * 100).toFixed(1)}%)`);
    console.log(`  * Capacity Constrained:            ${counts.CAPACITY_CONSTRAINED} (${(counts.CAPACITY_CONSTRAINED / (totalSignals || 1) * 100).toFixed(1)}%)`);
    console.log(`  * Cancelled Limit Order:           ${counts.CANCELLED_LIMIT} (${(counts.CANCELLED_LIMIT / (totalSignals || 1) * 100).toFixed(1)}%)`);
    console.log(`======================================================\n`);
  }

  return localHistory;
}

const candlesRun = getHistoricalCandles();

console.log("======================================================");
console.log("📊 CALIBRATING CAUSAL Z-SPACE POLICY MAP (PRE-PASS)");
console.log("======================================================");
// Step 1: Run un-gated baseline simulation to collect ex-post trade Z-states
let globalPolicyEngine = null;
const baselineTrades = runFullSimulation("BTCUSDT", candlesRun.BTCUSDT, candlesRun.ETHUSDT, {}, { silent: true });

// Step 2: Extract states and optimize policy
const zOptimizer = new ZSpaceEVOptimizer(candlesRun.BTCUSDT, baselineTrades);
const policyResult = zOptimizer.run();

console.log("Top 3 Highly Profitable Z-State Bins Found:");
policyResult.topPositiveStates.slice(0, 3).forEach(b => {
  console.log(`  * Bin ${b.zBin.toString().padEnd(3)}: Expected PnL = ${(b.ev * 100).toFixed(4)}% (Samples: ${b.sampleSize})`);
});
console.log("Worst 3 Negative Z-State Bins Found:");
policyResult.worstStates.slice(-3).forEach(b => {
  console.log(`  * Bin ${b.zBin.toString().padEnd(3)}: Expected PnL = ${(b.ev * 100).toFixed(4)}% (Samples: ${b.sampleSize})`);
});

// Step 3: Instantiate global policy engine
globalPolicyEngine = new ZPolicyEngine(policyResult.fullRanking, { minSamples: 2, evThreshold: 0.0 });
console.log("Z-Space Policy Engine Calibrated & Gated (minSamples: 2, evThreshold: 0.0)\n");

// Step 4: Run actual policy-gated simulations
runFullSimulation("BTCUSDT", candlesRun.BTCUSDT, candlesRun.ETHUSDT);
runFullSimulation("ETHUSDT", candlesRun.ETHUSDT, candlesRun.BTCUSDT);

// 6. Global Memorized Summary
console.log(`======================================================`);
console.log(`🌐 GLOBAL CROSS-ASSET EV SUMMARY (MEMORIZED)`);
console.log(`======================================================`);
console.log(`Governance Stats:`);
console.log(`  * Total Decisions Allowed: ${globalEVMemory.governanceStats.allowed}`);
console.log(`  * Total Decisions Rejected: ${globalEVMemory.governanceStats.rejected}`);
console.log(`  * Capacity Constrained:     ${globalEVMemory.governanceStats.capacityConstrained}`);
console.log(`  * Cancelled Limit Orders:   ${globalEVMemory.governanceStats.cancelledLimit || 0}`);
console.log(`------------------------------------------------------`);
console.log(`Regime Performances:`);
for (const regime of Object.keys(globalEVMemory.regimeBuckets)) {
  const rb = globalEVMemory.regimeBuckets[regime];
  console.log(`  * ${regime.padEnd(20)}: Count=${rb.count} | Avg PnL=${(rb.avgPnL * 100).toFixed(4)}% | Avg Regime EV=${(rb.avgRegimeEV * 100).toFixed(4)}%`);
}
console.log(`------------------------------------------------------`);
console.log(`Confidence Performance Buckets:`);
for (const bucket of Object.keys(globalEVMemory.signalBuckets).sort((a,b) => Number(a)-Number(b))) {
  const sb = globalEVMemory.signalBuckets[bucket];
  console.log(`  * Confidence ${bucket}s      : Count=${sb.count} | Avg PnL=${(sb.avgPnL * 100).toFixed(4)}% | Avg EV=${(sb.avgEV * 100).toFixed(4)}%`);
}
console.log(`======================================================\n`);

// 7. System-wide EV Parameter Optimization
console.log(`======================================================`);
console.log(`🚀 RUNNING SYSTEM-WIDE EV OPTIMIZATION PIPELINE`);
console.log(`======================================================`);
console.log(`Running Parameter Grid Search (Anti-Overfitting & Cross-Asset Constraint)...`);

const optResult = runEVOptimization({
  assets: ["BTCUSDT", "ETHUSDT"],
  simulateFn: (symbol, config) => {
    const candlesRun = getHistoricalCandles();
    const symbolCandles = candlesRun[symbol];
    const oppSymbol = symbol === 'BTCUSDT' ? 'ETHUSDT' : 'BTCUSDT';
    const oppCandles = candlesRun[oppSymbol];
    return runFullSimulation(symbol, symbolCandles, oppCandles, config, { silent: true });
  },
  baseHistory: tradeHistoryByAsset
});

console.log(`\nOPTIMIZATION COMPLETED!`);
console.log(`Best Robust Configuration Found:`);
console.log(JSON.stringify(optResult.bestConfig, null, 2));

console.log(`\nDiagnostics:`);
console.log(`  * Best Combined EV:   ${(optResult.diagnostics.bestEV * 100).toFixed(4)}%`);
console.log(`  * Spread (Best-Worst): ${(optResult.diagnostics.spread * 100).toFixed(4)}%`);
console.log(`  * Cross-Asset Stability: ${(optResult.diagnostics.stability * 100).toFixed(2)}%`);
console.log(`======================================================\n`);
