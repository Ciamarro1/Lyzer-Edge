/**
 * ALPHA FACTORY — UNIFIED INFERENCE & MULTIPLICITY BATTERY
 * Module: inference_battery.js
 * 
 * Formal Methodological Implementations:
 * 1. 14-Day Calendar Block Bootstrap under Centered H0 (Hall, 1992).
 * 2. Exact Trade-Weighted Mean Estimator (rejects window-average bias).
 * 3. Formal Micro-Sample Degeneracy Detection (N <= 4).
 * 4. Benjamini-Yekutieli (BY, 2001) FDR Control under Arbitrary Dependence.
 * 5. Benjamini-Hochberg (BH, 1995) FDR Control Benchmark.
 * 6. Deterministic Topological Basin & Geodesic Medoid Discovery.
 */

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 14-Day Calendar Block Bootstrap with Trade-Weighted Estimator
 */
export function runCalendarBlockBootstrap(trades, options = {}) {
  const B = options.replications || 10000;
  const seed = options.seed || 888888;
  const epochStartMs = options.epochStartMs || 1672531200000; // 2023-01-01T00:00:00.000Z
  const windowMs = options.windowMs || (14 * 24 * 3600 * 1000); // 1,209,600,000 ms

  const n = trades.length;

  // Case 0: Empty Sample
  if (n === 0) {
    return {
      nTrades: 0,
      meanNetR: 0,
      ci95Lower: 0,
      ci95Upper: 0,
      pBlock: 1.0,
      profitFactor: 0,
      mddR: 0,
      totalNetR: 0,
      isDegenerate: false,
      degeneracyReason: null
    };
  }

  const netRs = trades.map(t => t.netR);
  const sampleMeanNetR = netRs.reduce((a, b) => a + b, 0) / n;

  // Case 1: Micro-Sample Degeneracy Detection (N <= 4)
  // When N=1, Y_1 = X_1 - X_1 = 0, causing T* = 0 constantly and mechanically yielding p = 1 / (B + 1)
  const isDegenerate = n <= 4;
  const degeneracyReason = isDegenerate
    ? `CENTRALIZED_BOOTSTRAP_DEGENERACY_MICRO_SAMPLE: N=${n} produces mechanically compressed null variance`
    : null;

  const centeredY = netRs.map(x => x - sampleMeanNetR);

  // Group trades into calendar windows by exit timestamp
  const windowMap = new Map();
  for (let i = 0; i < n; i++) {
    const tExit = Number(trades[i].exitTime || trades[i].exitTimestamp);
    const windowIdx = Math.floor((tExit - epochStartMs) / windowMs);
    if (!windowMap.has(windowIdx)) {
      windowMap.set(windowIdx, { raw: [], centered: [] });
    }
    windowMap.get(windowIdx).raw.push(netRs[i]);
    windowMap.get(windowIdx).centered.push(centeredY[i]);
  }

  const windows = Array.from(windowMap.values());
  const numWindows = windows.length;

  const rng = mulberry32(seed);
  let nullExceedCount = 0;
  const bootMeans = new Float64Array(B);

  for (let b = 0; b < B; b++) {
    let sumCentered = 0;
    let sumRaw = 0;
    let totalTrades = 0;

    for (let w = 0; w < numWindows; w++) {
      const randIdx = Math.floor(rng() * numWindows);
      const win = windows[randIdx];
      const winSize = win.centered.length;

      for (let k = 0; k < winSize; k++) {
        sumCentered += win.centered[k];
        sumRaw += win.raw[k];
      }
      totalTrades += winSize;
    }

    // Trade-weighted mean estimator (unbiased)
    const tradeWeightedMeanCentered = sumCentered / totalTrades;
    const tradeWeightedMeanRaw = sumRaw / totalTrades;

    bootMeans[b] = tradeWeightedMeanRaw;
    if (tradeWeightedMeanCentered >= sampleMeanNetR) {
      nullExceedCount++;
    }
  }

  bootMeans.sort();
  const ci95Lower = Number(bootMeans[Math.floor(0.025 * B)].toFixed(3));
  const ci95Upper = Number(bootMeans[Math.floor(0.975 * B)].toFixed(3));
  const pBlock = Number(((nullExceedCount + 1) / (B + 1)).toFixed(4));

  let winsSum = 0, lossesSum = 0;
  let peak = 0, running = 0, maxDD = 0;
  for (let i = 0; i < n; i++) {
    const r = netRs[i];
    if (r > 0) winsSum += r;
    else lossesSum += Math.abs(r);

    running += r;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }
  const profitFactor = lossesSum === 0 ? (winsSum > 0 ? 99.0 : 0) : Number((winsSum / lossesSum).toFixed(2));

  return {
    nTrades: n,
    meanNetR: Number(sampleMeanNetR.toFixed(3)),
    ci95Lower,
    ci95Upper,
    pBlock,
    profitFactor,
    mddR: Number(maxDD.toFixed(2)),
    totalNetR: Number(netRs.reduce((a, b) => a + b, 0).toFixed(2)),
    isDegenerate,
    degeneracyReason
  };
}

/**
 * Computes exact Benjamini-Yekutieli (BY, 2001) adjusted q-values.
 * Controls FDR under arbitrary dependence across tests.
 */
export function computeBenjaminiYekutieli(pValues, alpha = 0.05) {
  const M = pValues.length;
  if (M === 0) return [];

  // Harmonic penalty c(M) = sum_{i=1}^M (1 / i)
  let cM = 0;
  for (let i = 1; i <= M; i++) cM += 1 / i;
  const cConstant = M * cM;

  const indexed = pValues.map((p, idx) => ({ p: Number(p), idx }));
  indexed.sort((a, b) => a.p - b.p);

  const qValues = new Float64Array(M);
  let minNext = Infinity;

  for (let rank = M; rank >= 1; rank--) {
    const pVal = indexed[rank - 1].p;
    const currentQ = (cConstant * pVal) / rank;
    if (currentQ < minNext) minNext = currentQ;
    qValues[indexed[rank - 1].idx] = Math.min(1.0, Number(minNext.toFixed(4)));
  }

  return Array.from(qValues).map(q => ({
    qValue: q,
    pass: q < alpha,
    harmonicConstant: cM,
    globalMultiplier: cConstant
  }));
}

/**
 * Computes standard Benjamini-Hochberg (BH, 1995) adjusted q-values.
 */
export function computeBenjaminiHochberg(pValues, alpha = 0.05) {
  const M = pValues.length;
  if (M === 0) return [];

  const indexed = pValues.map((p, idx) => ({ p: Number(p), idx }));
  indexed.sort((a, b) => a.p - b.p);

  const qValues = new Float64Array(M);
  let minNext = Infinity;

  for (let rank = M; rank >= 1; rank--) {
    const pVal = indexed[rank - 1].p;
    const currentQ = (M * pVal) / rank;
    if (currentQ < minNext) minNext = currentQ;
    qValues[indexed[rank - 1].idx] = Math.min(1.0, Number(minNext.toFixed(4)));
  }

  return Array.from(qValues).map(q => ({
    qValue: q,
    pass: q < alpha
  }));
}

/**
 * Identifies connected basins on an adjacency graph and calculates deterministic geodesic medoid.
 */
export function findTopologicalBasinsAndMedoid(results, adjacencyList, options = {}) {
  const nMin = options.nMin || 60;
  const qCutoff = options.qCutoff || 0.0500;
  const minNetR = options.minNetR || 0.150;

  const eligibleSet = new Set();
  const eligibleMap = new Map();

  for (const r of results) {
    const qVal = r.qBY !== undefined ? r.qBY : r.qValue;
    const isDegenerate = r.isDegenerate || r.nTrades <= 4;
    // Must pass BY FDR, sample floor (not degenerate), and economic floor
    if (qVal < qCutoff && r.nTrades >= nMin && r.meanNetR >= minNetR && !isDegenerate) {
      eligibleSet.add(r.id);
      eligibleMap.set(r.id, r);
    }
  }

  if (eligibleSet.size === 0) {
    return {
      hasBasin: false,
      reason: 'ZERO_ELIGIBLE_NODES',
      eligibleCount: 0,
      basins: [],
      winningBasin: null,
      medoid: null
    };
  }

  // Find connected components in eligibleSet
  const visited = new Set();
  const basins = [];

  for (const nodeId of eligibleSet) {
    if (!visited.has(nodeId)) {
      const component = [];
      const queue = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const curr = queue.shift();
        component.push(curr);

        const neighbors = adjacencyList[curr] || [];
        for (const nbr of neighbors) {
          if (eligibleSet.has(nbr) && !visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        }
      }
      basins.push(component);
    }
  }

  // Deterministic Basin Tie-Break:
  // 1. Cardinality (descending)
  // 2. Mean q-value (ascending)
  // 3. Min lexical ID (ascending)
  basins.sort((A, B) => {
    if (B.length !== A.length) return B.length - A.length;
    const meanQA = A.reduce((s, id) => s + (eligibleMap.get(id).qBY || eligibleMap.get(id).qValue), 0) / A.length;
    const meanQB = B.reduce((s, id) => s + (eligibleMap.get(id).qBY || eligibleMap.get(id).qValue), 0) / B.length;
    if (Math.abs(meanQA - meanQB) > 1e-6) return meanQA - meanQB;
    const minIdA = A.slice().sort()[0];
    const minIdB = B.slice().sort()[0];
    return minIdA.localeCompare(minIdB);
  });

  const winningBasin = basins[0];

  // Geodesic distance in Graph G
  function shortestPath(start, target) {
    if (start === target) return 0;
    const dist = new Map();
    dist.set(start, 0);
    const q = [start];
    while (q.length > 0) {
      const u = q.shift();
      const d = dist.get(u);
      for (const v of adjacencyList[u] || []) {
        if (!dist.has(v)) {
          dist.set(v, d + 1);
          if (v === target) return d + 1;
          q.push(v);
        }
      }
    }
    return 999;
  }

  const candidateMedoids = [];
  for (const u of winningBasin) {
    let sumD = 0;
    for (const v of winningBasin) {
      sumD += shortestPath(u, v);
    }
    const item = eligibleMap.get(u);
    const qVal = item.qBY !== undefined ? item.qBY : item.qValue;
    candidateMedoids.push({ id: u, sumD, qVal, nTrades: item.nTrades });
  }

  // Medoid Tie-Break:
  // 1. Min geodesic sumD
  // 2. Lowest individual q-value
  // 3. Highest sample size
  // 4. Lowest lexical ID
  candidateMedoids.sort((a, b) => {
    if (a.sumD !== b.sumD) return a.sumD - b.sumD;
    if (Math.abs(a.qVal - b.qVal) > 1e-6) return a.qVal - b.qVal;
    if (b.nTrades !== a.nTrades) return b.nTrades - a.nTrades;
    return a.id.localeCompare(b.id);
  });

  const medoidId = candidateMedoids[0].id;
  const medoid = eligibleMap.get(medoidId);

  return {
    hasBasin: true,
    eligibleCount: eligibleSet.size,
    basinsCount: basins.length,
    basins,
    winningBasin,
    medoid
  };
}
