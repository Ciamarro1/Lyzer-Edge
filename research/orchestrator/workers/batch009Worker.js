import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot } from '../datasetSnapshot.js';
import { evaluateBar, computeATR } from '../causalSignalEngine.js';

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

function runPermutation(trades, nullUniverse, horizon, feePct, iterations = 10000) {
  if (trades.length === 0 || nullUniverse.length === 0) return 1.0;
  const obsPF = calculateProfitFactor(trades);
  let count = 0;
  const N = trades.length;
  const nullSize = nullUniverse.length;
  
  for (let i = 0; i < iterations; i++) {
    let grossWin = 0;
    let grossLoss = 0;
    for (let j = 0; j < N; j++) {
      const randIdx = Math.floor(Math.random() * nullSize);
      const entryBar = nullUniverse[randIdx];
      
      // Need to find the exit bar properly in the null universe?
      // No, we should just shift indices. It's better to store original indices in nullUniverse
      const entryIdx = entryBar._idx;
      // Assume entryBar is open of t+1, exit is close of t+horizon
      // Actually pass the full data array and use indices.
    }
  }
  return count / iterations;
}

async function run() {
  try {
    const { trendFilter, fvgFilter, horizon, feePct } = workerData;
    
    // 1. Independent data copy
    const snapshot = getDatasetSnapshot();
    const data = snapshot.candles;
    
    // Calculate EMAs locally
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
    
    for (let i = 0; i < data.length - horizon; i++) {
      const bar = data[i];
      lookbackBuffer.push(bar);
      if (lookbackBuffer.length > 300) lookbackBuffer.shift();
      
      if (i < 50) continue;

      const atr = computeATR(lookbackBuffer, 14) || (bar.high - bar.low);
      const body = Math.abs(bar.close - bar.open);
      const range = bar.high - bar.low;
      
      const isBull = bar.close > bar.open;
      
      // Trend Filter Evaluation
      let trendPass = false;
      if (trendFilter === 'NONE') trendPass = true;
      else if (trendFilter === 'BULL_SIMPLE') trendPass = ema20[i] > ema50[i];
      else if (trendFilter === 'BULL_STRICT') trendPass = ema20[i] > ema50[i] * 1.002;
      
      if (trendPass) {
        nullUniverseIndices.push(i);
      }
      
      // Displacement criteria
      if (atr === 0 || range === 0) continue;
      const bodyAtr = body / atr;
      const bodyRange = body / range;
      const rangeAtr = range / atr;
      
      const isDisplacement = bodyAtr >= 2.0 && bodyRange >= 0.65 && rangeAtr >= 1.8 && isBull;
      
      if (!isDisplacement) continue;
      
      // FVG criteria
      let fvgPass = true;
      if (fvgFilter === 'REQUIRED') {
        const preds = evaluateBar(i, data, lookbackBuffer, snapshot.funding, {
          lookbackBars: 24, displacementAtrMult: 2.0, fvgMinSizeAtr: 0.20, swingLeft: 3, swingRight: 2, holdBars: 12
        });
        fvgPass = preds?.fvg?.detected && preds?.fvg?.type === 'bullish_fvg';
      }
      
      if (trendPass && fvgPass) {
        const entryBar = data[i + 1];
        const exitBar = data[i + horizon];
        const gross = (exitBar.close - entryBar.open) / entryBar.open;
        const net = gross - feePct;
        
        trades.push({
          entryIdx: i + 1,
          netPct: net,
          grossPct: gross
        });
      }
    }
    
    const obsPF = calculateProfitFactor(trades);
    const wfaResult = wfa(trades, data.length);
    const meanNet = mean(trades.map(t => t.netPct));
    const winRate = mean(trades.map(t => t.netPct > 0 ? 1 : 0)) * 100;
    
    // Run permutation
    let pValue = 1.0;
    if (trades.length > 0 && nullUniverseIndices.length > 0) {
      let count = 0;
      const N = trades.length;
      const nullSize = nullUniverseIndices.length;
      
      for (let iter = 0; iter < 10000; iter++) {
        let grossWin = 0;
        let grossLoss = 0;
        for (let j = 0; j < N; j++) {
          const randIdx = Math.floor(Math.random() * nullSize);
          const iBase = nullUniverseIndices[randIdx];
          // Ensure we don't overflow
          if (iBase + horizon >= data.length) continue;
          
          const entryBar = data[iBase + 1];
          const exitBar = data[iBase + horizon];
          const gross = (exitBar.close - entryBar.open) / entryBar.open;
          const net = gross - feePct;
          
          if (net > 0) grossWin += net;
          else grossLoss += Math.abs(net);
        }
        const simPF = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
        if (simPF >= obsPF) count++;
      }
      pValue = count / 10000;
    }
    
    parentPort.postMessage({
      status: 'SUCCESS',
      result: {
        config: workerData,
        n: trades.length,
        meanNet,
        winRate,
        pf: obsPF,
        wfaScore: wfaResult.positiveCount,
        pValue
      }
    });
    
  } catch (error) {
    parentPort.postMessage({ status: 'ERROR', error: error.message });
  }
}

run();
