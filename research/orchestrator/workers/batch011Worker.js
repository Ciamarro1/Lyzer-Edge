import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot } from '../datasetSnapshot.js';
import { computeATR } from '../causalSignalEngine.js';

// --- STATS UTILS ---
function calculateMaxDD(equityCurve) {
  let peak = 0;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// Cluster permutation: permutes cluster entries across the null universe
function runClusterPermutation(clusters, nullUniverseIndices, data, horizon, totalFriction, iterations = 10000) {
  if (clusters.length === 0 || nullUniverseIndices.length === 0) return 1.0;
  
  const obsGrossWin = clusters.reduce((acc, c) => acc + (c.netPct > 0 ? c.netPct : 0), 0);
  const obsGrossLoss = clusters.reduce((acc, c) => acc + (c.netPct < 0 ? Math.abs(c.netPct) : 0), 0);
  const obsPF = obsGrossLoss === 0 ? (obsGrossWin > 0 ? 99 : 0) : (obsGrossWin / obsGrossLoss);
  
  let count = 0;
  const N = clusters.length;
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

async function run() {
  try {
    const config = workerData;
    
    // Baseline V8.2 Params
    const thresholdAtr = 2.0;
    const thresholdBody = 0.65;
    const thresholdRangeAtr = 1.8;
    const feePct = config.feePct || 0.0008; // 0.08%
    const slippagePct = config.slippagePct || 0;
    const totalFriction = (feePct + slippagePct) * 2;
    
    const horizon = config.horizon || 72;
    const clusterGap = config.clusterGap || 24; // in bars/hours
    const execMode = config.execMode || 'ONE_POSITION'; 
    // Modes: 'ONE_POSITION', 'INDEPENDENT', 'PYRAMID_1_05_025', 'PYRAMID_1_05_05_05', 'PYRAMID_1_075_05'
    
    let pyramidWeights = [1.0];
    if (execMode === 'PYRAMID_1_05_025') pyramidWeights = [1.0, 0.5, 0.25];
    if (execMode === 'PYRAMID_1_05_05_05') pyramidWeights = [1.0, 0.5, 0.5, 0.5];
    if (execMode === 'PYRAMID_1_075_05') pyramidWeights = [1.0, 0.75, 0.5];
    if (execMode === 'INDEPENDENT') pyramidWeights = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]; // pseudo infinite

    const snapshot = getDatasetSnapshot();
    const data = snapshot.candles;
    
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
    
    const allSignals = [];
    const nullUniverseIndices = [];
    const lookbackBuffer = [];
    
    // 1. Scan all signals
    for (let i = 0; i < data.length - horizon - 1; i++) {
      const bar = data[i];
      lookbackBuffer.push(bar);
      if (lookbackBuffer.length > 300) lookbackBuffer.shift();
      if (i < 50) continue;

      const trendPass = ema20[i] > ema50[i];
      if (trendPass) nullUniverseIndices.push(i);
      
      const atr = computeATR(lookbackBuffer, 14) || (bar.high - bar.low);
      const body = Math.abs(bar.close - bar.open);
      const range = bar.high - bar.low;
      const isBull = bar.close > bar.open;
      
      if (atr === 0 || range === 0) continue;
      const isDisplacement = (body/atr >= thresholdAtr) && (body/range >= thresholdBody) && (range/atr >= thresholdRangeAtr) && isBull;
      
      if (isDisplacement && trendPass) {
        allSignals.push({ idx: i, atr });
      }
    }
    
    // 2. Cluster Formation
    const clusters = [];
    let currentCluster = null;
    
    for (const sig of allSignals) {
      if (!currentCluster) {
        currentCluster = { signals: [sig], startIdx: sig.idx, endIdx: sig.idx };
      } else {
        if (sig.idx - currentCluster.endIdx <= clusterGap) {
          // Belongs to current cluster
          currentCluster.signals.push(sig);
          currentCluster.endIdx = sig.idx;
        } else {
          // New cluster
          clusters.push(currentCluster);
          currentCluster = { signals: [sig], startIdx: sig.idx, endIdx: sig.idx };
        }
      }
    }
    if (currentCluster) clusters.push(currentCluster);

    // 3. Execution Engine
    const executedClusters = [];
    let lastExitIdx = -1;
    let portfolioEquity = 0;
    const equityCurve = [0];
    
    for (const cluster of clusters) {
      if (execMode === 'ONE_POSITION' && cluster.startIdx <= lastExitIdx) {
        // Skip entirely if we are already in a position and mode is strictly ONE_POSITION
        // Wait, ONE_POSITION means we ignore signals while holding. 
        // If the cluster starts while we are holding a PREVIOUS cluster, we skip.
        continue;
      }
      
      // Calculate cluster execution
      let clusterNet = 0;
      let clusterRiskUnits = 0;
      let maxDrawdownInCluster = 0;
      let highestUnrealized = 0;
      
      // We process signals in the cluster up to the length of pyramidWeights
      const executableSignals = cluster.signals.filter(s => s.idx > lastExitIdx).slice(0, pyramidWeights.length);
      
      if (executableSignals.length === 0) continue; // all signals were skipped due to previous cluster overlap
      
      const clusterBaseEntryIdx = executableSignals[0].idx + 1;
      const clusterBaseExitIdx = executableSignals[0].idx + horizon; 
      
      for (let j = 0; j < executableSignals.length; j++) {
        const sig = executableSignals[j];
        const weight = pyramidWeights[j];
        
        const entryBar = data[sig.idx + 1];
        // In pyramiding, all additions exit at the maturation horizon of the FIRST event of the cluster.
        // Or do they exit at their own horizon? "saída seja ditada por exaustão macro". 
        // Let's assume all pieces of the cluster exit together at `clusterBaseExitIdx`.
        const exitIdx = Math.min(clusterBaseExitIdx, data.length - 1);
        if (exitIdx <= sig.idx + 1) continue; // Can't enter if exit is already passed
        
        const exitBar = data[exitIdx];
        
        const gross = (exitBar.close - entryBar.open) / entryBar.open;
        const net = gross - totalFriction;
        
        clusterNet += (net * weight);
        clusterRiskUnits += weight;
      }
      
      // Normalize cluster net by 1.0 unit of base capital to allow comparison.
      // E.g., if we added 0.5 and 0.25, our return is (1.0*r1 + 0.5*r2 + 0.25*r3) / 1.0 (Capital exposed)
      // Actually, if we use more capital, the return on the BASE capital is higher.
      const returnOnBaseCapital = clusterNet; 
      
      lastExitIdx = clusterBaseExitIdx;
      portfolioEquity += returnOnBaseCapital;
      equityCurve.push(portfolioEquity);
      
      executedClusters.push({
        startIdx: clusterBaseEntryIdx,
        exitIdx: clusterBaseExitIdx,
        netPct: returnOnBaseCapital,
        riskUnits: clusterRiskUnits,
        signalCount: executableSignals.length
      });
    }
    
    // 4. Statistics
    const nClusters = executedClusters.length;
    let grossWin = 0;
    let grossLoss = 0;
    let winCount = 0;
    
    for (const c of executedClusters) {
      if (c.netPct > 0) {
        grossWin += c.netPct;
        winCount++;
      } else {
        grossLoss += Math.abs(c.netPct);
      }
    }
    
    const pf = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);
    const winRate = nClusters > 0 ? (winCount / nClusters) * 100 : 0;
    const meanNet = nClusters > 0 ? (grossWin - grossLoss) / nClusters : 0;
    const maxDD = calculateMaxDD(equityCurve);
    
    // WFA
    const totalBars = data.length;
    const windowSize = Math.floor(totalBars / 10);
    const windows = Array.from({ length: 10 }, () => ({ n: 0, net: 0, wins: 0 }));
    for (const c of executedClusters) {
      const wIdx = Math.min(Math.floor(c.startIdx / windowSize), 9);
      windows[wIdx].n++;
      windows[wIdx].net += c.netPct;
      if (c.netPct > 0) windows[wIdx].wins++;
    }
    let positiveWindows = 0;
    for (const w of windows) {
      if (w.n > 0 && w.net > 0) positiveWindows++;
    }
    
    // P-value
    let pValue = 1.0;
    if (config.runPermutation) {
      pValue = runClusterPermutation(executedClusters, nullUniverseIndices, data, horizon, totalFriction, 10000);
    }
    
    // H2 Analysis: Return by signal count
    const signalCountStats = {};
    for (const c of executedClusters) {
      const sc = c.signalCount;
      if (!signalCountStats[sc]) signalCountStats[sc] = { n: 0, net: 0 };
      signalCountStats[sc].n++;
      signalCountStats[sc].net += c.netPct;
    }
    
    parentPort.postMessage({
      status: 'SUCCESS',
      result: {
        config,
        nClusters,
        meanNet,
        winRate,
        pf,
        maxDD,
        wfaScore: positiveWindows,
        pValue,
        signalCountStats,
        portfolioEquity
      }
    });
    
  } catch (error) {
    parentPort.postMessage({ status: 'ERROR', error: error.message });
  }
}

run();
