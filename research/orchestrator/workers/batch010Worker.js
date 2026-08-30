import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot } from '../datasetSnapshot.js';
import { computeATR } from '../causalSignalEngine.js';

// --- STATS UTILS ---
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function wfa(trades, totalBars) {
  const windowSize = Math.floor(totalBars / 10);
  const windows = Array.from({ length: 10 }, () => ({ n: 0, net: 0, wr: 0, _wins: 0 }));
  
  for (const t of trades) {
    const wIdx = Math.min(Math.floor(t.entryIdx / windowSize), 9);
    windows[wIdx].n++;
    windows[wIdx].net += t.netPct;
    if (t.netPct > 0) windows[wIdx]._wins++;
  }
  
  let positiveCount = 0;
  for (const w of windows) {
    if (w.n > 0) {
      w.netMean = w.net / w.n;
      w.wr = (w._wins / w.n) * 100;
      if (w.netMean > 0) positiveCount++;
    } else {
      w.netMean = 0;
      w.wr = 0;
    }
  }
  return { windows, positiveCount };
}

function calculateProfitFactor(trades) {
  let grossWin = 0;
  let grossLoss = 0;
  for (const t of trades) {
    if (t.netPct > 0) grossWin += t.netPct;
    else grossLoss += Math.abs(t.netPct);
  }
  return grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
}

function calculateMaxDD(trades) {
  let peak = 0;
  let current = 0;
  let maxDD = 0;
  for (const t of trades) {
    current += t.netPct;
    if (current > peak) peak = current;
    const dd = peak - current;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function runPermutation(trades, nullUniverseIndices, data, horizon, totalFriction, iterations = 10000) {
  if (trades.length === 0 || nullUniverseIndices.length === 0) return 1.0;
  const obsPF = calculateProfitFactor(trades);
  let count = 0;
  const N = trades.length;
  const nullSize = nullUniverseIndices.length;
  
  for (let iter = 0; iter < iterations; iter++) {
    let grossWin = 0;
    let grossLoss = 0;
    for (let j = 0; j < N; j++) {
      const randIdx = Math.floor(Math.random() * nullSize);
      const iBase = nullUniverseIndices[randIdx];
      if (iBase + horizon >= data.length) continue;
      
      const entryBar = data[iBase + 1];
      const exitBar = data[iBase + horizon];
      const gross = (exitBar.close - entryBar.open) / entryBar.open;
      const net = gross - totalFriction;
      
      if (net > 0) grossWin += net;
      else grossLoss += Math.abs(net);
    }
    const simPF = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
    if (simPF >= obsPF) count++;
  }
  return count / iterations;
}

// --- WORKER MAIN ---
async function run() {
  try {
    const config = workerData;
    
    // Config Extraction with defaults for V8.2
    const horizon = config.horizon || 72;
    const feePct = config.feePct || 0;
    const slippagePct = config.slippagePct || 0;
    const totalFriction = (feePct + slippagePct) * 2; // Roundtrip
    
    const thresholdAtr = config.thresholdAtr || 2.0;
    const thresholdBody = config.thresholdBody || 0.65;
    const thresholdRangeAtr = config.thresholdRangeAtr || 1.8;
    const trendFilter = config.trendFilter || 'BULL_SIMPLE';
    const overlapMode = config.overlapMode || 'INDEPENDENT';
    const exitModel = config.exitModel || 'TIME_CLOSE'; // 'TIME_CLOSE', 'PESSIMISTIC_TRAILING_ATR'
    
    const snapshot = getDatasetSnapshot();
    const data = snapshot.candles;
    
    // Indicators Pre-computation
    const k20 = 2 / 21;
    const k50 = 2 / 51;
    const ema20 = new Array(data.length).fill(0);
    const ema50 = new Array(data.length).fill(0);
    ema20[0] = data[0].close;
    ema50[0] = data[0].close;
    for (let i = 1; i < data.length; i++) {
      ema20[i] = (data[i].close * k20) + (ema20[i - 1] * (1 - k20));
      ema50[i] = (data[i].close * k50) + (ema50[i - 1] * (1 - k50));
    }
    
    const trades = [];
    const nullUniverseIndices = [];
    const lookbackBuffer = [];
    let lastExitIdx = -1;
    
    for (let i = 0; i < data.length - horizon - 1; i++) {
      const bar = data[i];
      lookbackBuffer.push(bar);
      if (lookbackBuffer.length > 300) lookbackBuffer.shift();
      
      if (i < 50) continue;

      const atr = computeATR(lookbackBuffer, 14) || (bar.high - bar.low);
      const body = Math.abs(bar.close - bar.open);
      const range = bar.high - bar.low;
      const isBull = bar.close > bar.open;
      
      // Trend Filter
      let trendPass = false;
      if (trendFilter === 'NONE') trendPass = true;
      else if (trendFilter === 'BULL_SIMPLE') trendPass = ema20[i] > ema50[i];
      else if (trendFilter === 'BULL_STRICT') trendPass = ema20[i] > ema50[i] * 1.002;
      else if (trendFilter === 'BULL_SLOPE') trendPass = (ema20[i] > ema50[i]) && (ema20[i] > ema20[i-5]);
      
      if (trendPass) {
        nullUniverseIndices.push(i);
      }
      
      // Displacement
      if (atr === 0 || range === 0) continue;
      const isDisplacement = (body/atr >= thresholdAtr) && 
                             (body/range >= thresholdBody) && 
                             (range/atr >= thresholdRangeAtr) && 
                             isBull;
      
      if (!isDisplacement || !trendPass) continue;
      
      // Overlap Audit
      if (overlapMode === 'ONE_POSITION' && i <= lastExitIdx) {
        // Skip entry because we are already in a trade
        continue;
      }
      
      // Execution
      const entryBar = data[i + 1]; // Next Open
      const entryPrice = entryBar.open;
      
      let exitPrice = 0;
      let actualHorizon = horizon;
      
      if (exitModel === 'TIME_CLOSE') {
        const exitBar = data[i + horizon];
        exitPrice = exitBar.close;
      } else if (exitModel === 'PESSIMISTIC_TRAILING_ATR') {
        let trail = entryPrice - (1.5 * atr);
        let hitStop = false;
        for (let k = 1; k <= horizon; k++) {
           const evalBar = data[i + k];
           if (evalBar.low <= trail) {
             // Intrabar worst-case assumption: hit stop before high
             exitPrice = trail;
             actualHorizon = k;
             hitStop = true;
             break;
           }
           trail = Math.max(trail, evalBar.close - (1.5 * atr));
        }
        if (!hitStop) {
           exitPrice = data[i + horizon].close;
        }
      }
      
      const gross = (exitPrice - entryPrice) / entryPrice;
      const net = gross - totalFriction;
      
      lastExitIdx = i + actualHorizon;
      
      trades.push({
        entryIdx: i + 1,
        exitIdx: lastExitIdx,
        netPct: net,
        grossPct: gross
      });
    }
    
    const obsPF = calculateProfitFactor(trades);
    const wfaResult = wfa(trades, data.length);
    const meanNet = mean(trades.map(t => t.netPct));
    const winRate = mean(trades.map(t => t.netPct > 0 ? 1 : 0)) * 100;
    const maxDD = calculateMaxDD(trades);
    
    // Run permutation
    let pValue = 1.0;
    if (config.runPermutation !== false && trades.length > 0) {
       pValue = runPermutation(trades, nullUniverseIndices, data, horizon, totalFriction, 10000);
    }
    
    parentPort.postMessage({
      status: 'SUCCESS',
      result: {
        config: config,
        suite: config.suite,
        n: trades.length,
        meanNet,
        winRate,
        pf: obsPF,
        maxDD,
        wfaScore: wfaResult.positiveCount,
        pValue
      }
    });
    
  } catch (error) {
    parentPort.postMessage({ status: 'ERROR', error: error.message });
  }
}

run();
