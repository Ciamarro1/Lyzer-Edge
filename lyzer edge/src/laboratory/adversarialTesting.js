import fs from 'fs';
import { getHistoricalCandles } from '../db/historicalData.js';
import { SignalEngine } from '../engine/signalEngine.js';
import { TruthKernel } from '../engine/kernel.js';
import { ConstitutionalCourt } from '../eca/court.js';
import { RealityAnchor } from '../eca/realityAnchor.js';
import { IrreversibilityVault } from '../eca/vault.js';
import { ConstitutionalLedger } from '../eca/ledger.js';
import { ProposalBudget } from '../eca/proposalBudget.js';
import { ExperimentMetrics, EvidenceLogger } from './experimentRunner.js';

function calculateCorrelation(arr1, arr2) {
  if (arr1.length === 0 || arr2.length === 0) return 1.0;
  const n = Math.min(arr1.length, arr2.length);
  const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;
  let num = 0, den1 = 0, den2 = 0;
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

// Minimal runner for testing governed vs ungoverned
function runSimulation(candles, opponentCandles, isGoverned) {
  const signalEngine = new SignalEngine();
  const truthKernel = new TruthKernel();
  
  // ECA components
  const realityAnchor = new RealityAnchor();
  const vault = new IrreversibilityVault();
  const ledger = new ConstitutionalLedger();
  const proposalBudget = new ProposalBudget();
  const court = new ConstitutionalCourt(realityAnchor, vault, ledger, proposalBudget);
  
  let balance = 10000;
  const initialBalance = 10000;
  let peakBalance = 10000;
  let position = null;

  for (let i = 51; i < candles.length; i++) {
    const currentCandle = candles[i];
    
    // Evaluate Signals
    const history = candles.slice(0, i + 1);
    const sigResult = signalEngine.evaluate(history, i);
    
    let kernelVerdict = { signal: 'caution', confidence: 0 };
    let ecaPassed = true;
    
    if (isGoverned) {
      // Assemble Context Inputs
      const recentSelf = candles.slice(Math.max(0, i - 10), i + 1).map(c => c.close);
      const recentOpp = opponentCandles.slice(Math.max(0, i - 10), i + 1).map(c => c.close);
      const correlationVal = calculateCorrelation(recentSelf, recentOpp);
      
      const ema100 = signalEngine.calculateEMA(history, 100);
      
      const enginesInput = {
        regime: { signal: sigResult.signal, confidence: sigResult.confidence },
        timeframe: { signal: currentCandle.close > ema100 ? 'go' : 'no-go', confidence: 75 },
        correlation: { signal: correlationVal > 0.65 ? 'go' : 'no-go', confidence: Math.abs(correlationVal) * 100 },
        behavior: { signal: sigResult.rsi < 35 ? 'go' : 'no-go', confidence: 80 }
      };
      
      kernelVerdict = truthKernel.evaluate(enginesInput);
      
      // Run ECA Governance Trial occasionally
      if (i % 8 === 0) {
        const proposal = { layers: ['eca'], decisionWeights: { epe: 0.1 } };
        const realityVector = { rdi: 0.22, walkForward: 0.78 };
        const causalContext = { originating_layer: 'fmc' };
        const courtResult = court.evaluateProposal(proposal, realityVector, causalContext, 5);
        ecaPassed = courtResult.approved;
      }
    } else {
      // Ungoverned: naive interpretation
      if (sigResult.signal !== 'caution') {
        kernelVerdict = { signal: sigResult.signal, confidence: sigResult.confidence };
      }
    }

    // Execute trading
    if (position) {
      let closed = false;
      let exitPrice = 0;
      
      if (position.type === 'LONG') {
        if (currentCandle.low <= position.stopLoss) { closed = true; exitPrice = position.stopLoss; }
        else if (currentCandle.high >= position.takeProfit) { closed = true; exitPrice = position.takeProfit; }
        else if (kernelVerdict.signal === 'no-go') { closed = true; exitPrice = currentCandle.close; }
      } else {
        if (currentCandle.high >= position.stopLoss) { closed = true; exitPrice = position.stopLoss; }
        else if (currentCandle.low <= position.takeProfit) { closed = true; exitPrice = position.takeProfit; }
        else if (kernelVerdict.signal === 'go') { closed = true; exitPrice = currentCandle.close; }
      }
      
      if (closed) {
        const pnl = position.type === 'LONG' ? (exitPrice - position.entryPrice) * position.amount : (position.entryPrice - exitPrice) * position.amount;
        balance += pnl;
        position = null;
      }
    }

    if (!position && kernelVerdict.signal !== 'caution' && kernelVerdict.confidence >= 50 && ecaPassed) {
      const entryPrice = currentCandle.close;
      const R = entryPrice * 0.10;
      const size = balance * 0.25;
      
      if (kernelVerdict.signal === 'go') {
        position = { type: 'LONG', entryPrice, amount: size / entryPrice, takeProfit: entryPrice + 2 * R, stopLoss: entryPrice - R };
      } else {
        position = { type: 'SHORT', entryPrice, amount: size / entryPrice, takeProfit: entryPrice - 2 * R, stopLoss: entryPrice + R };
      }
    }

    let currentEquity = balance;
    if (position) {
      currentEquity += position.type === 'LONG' ? (currentCandle.close - position.entryPrice) * position.amount : (position.entryPrice - currentCandle.close) * position.amount;
    }
    if (currentEquity > peakBalance) peakBalance = currentEquity;
  }
  
  if (position) {
    const finalCandle = candles[candles.length - 1];
    balance += position.type === 'LONG' ? (finalCandle.close - position.entryPrice) * position.amount : (position.entryPrice - finalCandle.close) * position.amount;
  }
  
  return {
    finalCapital: balance,
    maxDrawdown: (peakBalance - balance) / peakBalance,
    survived: balance > 0
  };
}

const data = getHistoricalCandles();
const baseCandles = data.BTCUSDT;
const oppCandles = data.ETHUSDT;

// The 7 distinct structural failure models
const classes = {
  baseline: { btc: baseCandles, eth: oppCandles },
  classA: { // Correlation Collapse
    btc: baseCandles,
    eth: baseCandles // perfect correlation
  },
  classB: { // Liquidity Collapse (massive gap down)
    btc: baseCandles.map((c, i) => i > 250 ? { ...c, close: c.close * 0.5, low: c.low * 0.5, high: c.high * 0.5 } : c),
    eth: oppCandles
  },
  classC: { // Volatility Cascade (huge wicks)
    btc: baseCandles.map(c => ({ ...c, high: c.high * 1.5, low: c.low * 0.5 })),
    eth: oppCandles
  },
  classD: { // Information Corruption (random noise)
    btc: baseCandles.map(c => ({ ...c, close: c.close * (1 + (Math.random() - 0.5) * 0.5) })),
    eth: oppCandles
  },
  classE: { // Infrastructure Failure (flat feed)
    btc: baseCandles.map(c => ({ ...c, close: baseCandles[0].close, high: baseCandles[0].close, low: baseCandles[0].close })),
    eth: oppCandles
  },
  classF: { // Regime Inversion (reversed)
    btc: [...baseCandles].reverse(),
    eth: [...oppCandles].reverse()
  },
  classG: { // Unknown Unknown (extreme mutation)
    btc: baseCandles.map((c, i) => i % 5 === 0 ? { ...c, close: c.close * 2 } : { ...c, close: c.close * 0.5 }),
    eth: oppCandles
  }
};

const logger = new EvidenceLogger("Phase D Structural Failure Generation");
const results = {};

for (const [cls, dataset] of Object.entries(classes)) {
  const gov = runSimulation(dataset.btc, dataset.eth, true);
  const ungov = runSimulation(dataset.btc, dataset.eth, false);
  const aa = ExperimentMetrics.calculateAdaptiveAdvantage(gov, ungov, 10000);
  
  results[cls] = { gov, ungov, aa };
  logger.logHypothesis(`Does architecture survive ${cls}?`, "It will fail.");
  logger.logResult(`${cls} AA`, aa, aa > 0);
}

fs.writeFileSync('adversarial_testing_results.json', JSON.stringify(results, null, 2));
console.log("Written JSON results.");
