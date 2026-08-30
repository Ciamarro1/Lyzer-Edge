import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot } from '../datasetSnapshot.js';
import { computeATR } from '../causalSignalEngine.js';

// WFA Function (Standard 10-window)
function evaluateWFA(events, dataLength, wfaCount = 10) {
  const windowSize = Math.floor(dataLength / wfaCount);
  let positiveWindows = 0;
  
  for (let w = 0; w < wfaCount; w++) {
    const startIdx = w * windowSize;
    const endIdx = w === wfaCount - 1 ? dataLength : (w + 1) * windowSize;
    
    const windowEvents = events.filter(e => e.idx >= startIdx && e.idx < endIdx);
    if (windowEvents.length === 0) continue;
    
    const grossWin = windowEvents.reduce((acc, e) => acc + (e.netPct > 0 ? e.netPct : 0), 0);
    const grossLoss = windowEvents.reduce((acc, e) => acc + (e.netPct < 0 ? Math.abs(e.netPct) : 0), 0);
    const pf = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
    
    if (pf > 1.0) positiveWindows++;
  }
  return positiveWindows;
}

// OLS Function
function calculateOLS(events) {
  if (events.length < 2) return { slope: 0, r2: 0, pValue: 1.0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = events.length;
  
  for (const e of events) {
    const x = e.dose; // Z-Score
    const y = e.netPct;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }
  
  const denom = (n * sumX2 - sumX * sumX);
  if (denom === 0) return { slope: 0, r2: 0, pValue: 1.0 };
  
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  
  // R2
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const e of events) {
    ssTot += Math.pow(e.netPct - yMean, 2);
    ssRes += Math.pow(e.netPct - (slope * e.dose + intercept), 2);
  }
  const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  
  return { slope, r2 };
}

async function run() {
  try {
    const config = workerData;
    const lookback = config.lookback || 60;
    const volumeZScoreLimit = config.volumeZScore || 2.5;
    const minPierceATR = config.minPierceATR || 1.0;
    const pocProximity = config.pocProximity || 0.0005;
    
    const mode = config.mode || 'SPRING'; // SPRING, CONTROL_CONT, CONTROL_NULL
    const horizon = config.horizon || 24;
    const feePct = config.feePct || 0.0008;
    const slippagePct = config.slippagePct || 0;
    const totalFriction = (feePct + slippagePct) * 2;

    const snapshot = getDatasetSnapshot();
    const data = snapshot.candles;
    
    const events = [];
    
    // Circular buffer for lookback
    let lookbackBuffer = [];
    
    for (let i = 0; i < data.length - horizon - 1; i++) {
      const bar = data[i];
      lookbackBuffer.push(bar);
      if (lookbackBuffer.length > lookback) {
        lookbackBuffer.shift();
      }
      
      if (lookbackBuffer.length < lookback) continue;
      
      // Calculate POC & Volume metrics
      let minLow = Infinity;
      let maxHigh = -Infinity;
      const previousBars = lookbackBuffer.slice(0, -1);
      
      let sumVol = 0;
      let sumRange = 0;
      
      for (const p of previousBars) {
        if (p.low < minLow) minLow = p.low;
        if (p.high > maxHigh) maxHigh = p.high;
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
      
      let isSpring = false;
      let isContinuation = false;
      let isNull = false;
      
      // Spring Definition
      const springPierce = bar.low < (minLow - pierceDistance);
      const springReversal = bar.close > minLow; // Closes back inside the structure
      const highVol = currentZ > volumeZScoreLimit;
      
      // We aren't doing the complex POC calculation for performance, 
      // Instead we use the structural Swing Low (minLow) as the anchor.
      
      if (mode === 'SPRING') {
        if (springPierce && springReversal && highVol) {
           isSpring = true;
        }
      } else if (mode === 'CONTROL_CONT') {
        // Negative Control: Breakout Continuation
        // Pierces support, but closes below it, on LOW volume.
        const closesBelow = bar.close < minLow;
        const lowVol = currentZ < 1.0;
        if (springPierce && closesBelow && lowVol) {
          isContinuation = true;
        }
      } else if (mode === 'CONTROL_NULL') {
        // Randomly pick a candle (~1% chance to match the typical frequency of springs)
        if (Math.random() < 0.01) {
          isNull = true;
        }
      }
      
      if (isSpring || isContinuation || isNull) {
        const entryPrice = data[i+1].open;
        const exitPrice = data[i+horizon].close;
        const grossPct = (exitPrice - entryPrice) / entryPrice;
        const netPct = grossPct - totalFriction;
        
        events.push({
          idx: i,
          dose: currentZ,
          netPct
        });
        
        // Skip ahead by 12 bars to avoid overlapping/clustered events in the same move
        i += 12;
      }
    }
    
    const nEvents = events.length;
    let meanNet = 0;
    let winRate = 0;
    let pf = 0;
    let wfaScore = evaluateWFA(events, data.length);
    let ols = { slope: 0, r2: 0 };
    
    if (nEvents > 0) {
      meanNet = events.reduce((sum, e) => sum + e.netPct, 0) / nEvents;
      winRate = (events.filter(e => e.netPct > 0).length / nEvents) * 100;
      
      const grossWin = events.reduce((acc, e) => acc + (e.netPct > 0 ? e.netPct : 0), 0);
      const grossLoss = events.reduce((acc, e) => acc + (e.netPct < 0 ? Math.abs(e.netPct) : 0), 0);
      pf = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
      
      if (mode === 'SPRING') {
        ols = calculateOLS(events);
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
        wfaScore,
        ols
      }
    });
    
  } catch (err) {
    parentPort.postMessage({ status: 'ERROR', error: err.message });
  }
}

run();
