import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot } from '../datasetSnapshot.js';

function evaluateWFA(events, dataLength, wfaCount = 10) {
  const windowSize = Math.floor(dataLength / wfaCount);
  const windows = [];
  
  for (let w = 0; w < wfaCount; w++) {
    const startIdx = w * windowSize;
    const endIdx = w === wfaCount - 1 ? dataLength : (w + 1) * windowSize;
    
    const windowEvents = events.filter(e => e.idx >= startIdx && e.idx < endIdx);
    if (windowEvents.length === 0) {
      windows.push({ n: 0, net: 0, pf: 0, wr: 0 });
      continue;
    }
    
    const grossWin = windowEvents.reduce((acc, e) => acc + (e.netPct > 0 ? e.netPct : 0), 0);
    const grossLoss = windowEvents.reduce((acc, e) => acc + (e.netPct < 0 ? Math.abs(e.netPct) : 0), 0);
    const pf = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
    const net = windowEvents.reduce((acc, e) => acc + e.netPct, 0) / windowEvents.length;
    const wr = (windowEvents.filter(e => e.netPct > 0).length / windowEvents.length) * 100;
    
    windows.push({ n: windowEvents.length, net, pf, wr });
  }
  return windows;
}

// 10k Permutation (Random Selection of N candles)
function runPlaceboPermutation(data, targetN, horizon, totalFriction, observedNet, iterations = 10000) {
  const validIndices = data.length - horizon - 1;
  let countGreater = 0;
  const results = [];
  
  for (let iter = 0; iter < iterations; iter++) {
    let sumNet = 0;
    for (let i = 0; i < targetN; i++) {
      const idx = Math.floor(Math.random() * validIndices);
      const entryPrice = data[idx+1].open;
      const exitPrice = data[idx+horizon].close;
      sumNet += ((exitPrice - entryPrice) / entryPrice) - totalFriction;
    }
    const meanNet = sumNet / targetN;
    results.push(meanNet);
    if (meanNet >= observedNet) countGreater++;
  }
  
  results.sort((a,b) => a - b);
  return {
    pValue: countGreater / iterations,
    p5: results[Math.floor(iterations * 0.05)],
    p50: results[Math.floor(iterations * 0.50)],
    p95: results[Math.floor(iterations * 0.95)],
    p99: results[Math.floor(iterations * 0.99)],
    max: results[iterations - 1]
  };
}

async function run() {
  try {
    const config = workerData;
    const lookback = 60;
    const volumeZScoreLimit = config.volumeZScore || 2.5;
    const minPierceATR = config.minPierceATR || 1.0;
    const mode = config.mode || 'REAL_SPRING';
    const horizon = config.horizon || 24;
    const feePct = config.feePct || 0.0008;
    const slippagePct = config.slippagePct || 0;
    const totalFriction = (feePct + slippagePct) * 2;
    const onePositionMode = config.onePosition === true;

    const snapshot = getDatasetSnapshot();
    const data = snapshot.candles;
    
    const events = [];
    let lookbackBuffer = [];
    let positionLockedUntil = -1;
    let discardedOverlap = 0;
    
    for (let i = 0; i < data.length - horizon - 1; i++) {
      const bar = data[i];
      lookbackBuffer.push(bar);
      if (lookbackBuffer.length > lookback) {
        lookbackBuffer.shift();
      }
      
      if (lookbackBuffer.length < lookback) continue;
      
      let minLow = Infinity;
      let sumVol = 0;
      let sumRange = 0;
      const previousBars = lookbackBuffer.slice(0, -1);
      
      for (const p of previousBars) {
        if (p.low < minLow) minLow = p.low;
        sumVol += p.volume;
        sumRange += (p.high - p.low);
      }
      
      const avgVol = sumVol / previousBars.length;
      const avgRange = sumRange / previousBars.length;
      let volVar = 0;
      for (const p of previousBars) {
        volVar += Math.pow(p.volume - avgVol, 2);
      }
      const volStdDev = Math.sqrt(volVar / previousBars.length);
      const currentZ = volStdDev > 0 ? (bar.volume - avgVol) / volStdDev : 0;
      const pierceDistance = avgRange * minPierceATR;
      
      const springPierce = bar.low < (minLow - pierceDistance);
      const springReversal = bar.close > minLow;
      
      let match = false;
      
      if (mode === 'REAL_SPRING') {
        match = springPierce && springReversal && currentZ >= volumeZScoreLimit;
      } else if (mode === 'PRICE_ONLY') {
        match = springPierce && springReversal && currentZ <= 1.0;
      } else if (mode === 'VOL_ONLY') {
        match = currentZ >= volumeZScoreLimit;
      } else if (mode === 'CONTINUATION') {
        match = springPierce && !springReversal && currentZ <= 1.0;
      }
      
      if (match) {
        if (onePositionMode && i <= positionLockedUntil) {
          discardedOverlap++;
          continue;
        }
        
        const entryPrice = data[i+1].open;
        const exitPrice = data[i+horizon].close;
        const grossPct = (exitPrice - entryPrice) / entryPrice;
        const netPct = grossPct - totalFriction;
        
        events.push({ idx: i, netPct });
        
        if (onePositionMode) {
          positionLockedUntil = i + horizon;
        } else {
          i += 12; // Simple 12 bar debounce for standard mode
        }
      }
    }
    
    const nEvents = events.length;
    let meanNet = 0;
    let winRate = 0;
    let pf = 0;
    let wfaData = [];
    let permutation = null;
    let overlapDiscardRate = 0;
    
    if (nEvents > 0) {
      meanNet = events.reduce((sum, e) => sum + e.netPct, 0) / nEvents;
      winRate = (events.filter(e => e.netPct > 0).length / nEvents) * 100;
      
      const grossWin = events.reduce((acc, e) => acc + (e.netPct > 0 ? e.netPct : 0), 0);
      const grossLoss = events.reduce((acc, e) => acc + (e.netPct < 0 ? Math.abs(e.netPct) : 0), 0);
      pf = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
      
      wfaData = evaluateWFA(events, data.length);
      
      if (config.runPermutation) {
        permutation = runPlaceboPermutation(data, nEvents, horizon, totalFriction, meanNet);
      }
      
      if (onePositionMode) {
        overlapDiscardRate = (discardedOverlap / (nEvents + discardedOverlap)) * 100;
      }
    }

    parentPort.postMessage({
      status: 'SUCCESS',
      result: {
        config,
        nEvents,
        meanNet,
        winRate,
        pf,
        wfaData,
        permutation,
        overlapDiscardRate
      }
    });
    
  } catch (err) {
    parentPort.postMessage({ status: 'ERROR', error: err.message });
  }
}

run();
