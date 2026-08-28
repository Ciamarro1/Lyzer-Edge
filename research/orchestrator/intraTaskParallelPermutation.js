import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';

// Fast, deterministic 32-bit XorShift Pseudo-Random Number Generator
class FastXorShift32 {
  constructor(seed = 987654321) {
    this.state = seed | 0 || 987654321;
  }
  nextFloat() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 4294967296;
  }
}

/**
 * Worker thread execution block
 */
if (!isMainThread && parentPort) {
  const { allReturns, nA, observedDiff, chunkIterations, seedOffset } = workerData;
  const total = allReturns.length;
  const rng = new FastXorShift32(seedOffset);

  let localExtremeCount = 0;

  for (let b = 0; b < chunkIterations; b++) {
    // Fisher-Yates partial shuffle
    const shuffled = [...allReturns];
    let sumA = 0;
    for (let i = 0; i < nA; i++) {
      const r = i + Math.floor(rng.nextFloat() * (total - i));
      const temp = shuffled[i];
      shuffled[i] = shuffled[r];
      shuffled[r] = temp;
      sumA += shuffled[i];
    }
    const permMeanA = sumA / nA;
    let sumB = 0;
    for (let i = nA; i < total; i++) {
      sumB += shuffled[i];
    }
    const permMeanB = sumB / (total - nA);
    const permDiff = permMeanA - permMeanB;

    if (permDiff >= observedDiff) localExtremeCount++;
  }

  parentPort.postMessage({
    extremeCount: localExtremeCount,
    chunkIterations
  });
}

/**
 * Main Thread Coordinator for Intra-Task Parallel Permutation Tests
 */
export async function runIntraTaskParallelPermutation({
  springsData,
  totalIterations = 20000,
  workerCount = 8,
  baseSeed = 101
}) {
  const trueCellA = springsData.filter(s => s.isNegFunding);
  const trueCellB = springsData.filter(s => !s.isNegFunding);

  const meanRetCellA = trueCellA.reduce((s, x) => s + x.fwdRet, 0) / trueCellA.length;
  const meanRetCellB = trueCellB.reduce((s, x) => s + x.fwdRet, 0) / trueCellB.length;
  const observedDiff = meanRetCellA - meanRetCellB;

  const nA = trueCellA.length;
  const allReturns = springsData.map(s => s.fwdRet);
  const chunkIterations = Math.floor(totalIterations / workerCount);
  const actualTotalIterations = chunkIterations * workerCount;

  const currentFile = fileURLToPath(import.meta.url);

  const workerPromises = [];
  for (let k = 0; k < workerCount; k++) {
    const seedOffset = baseSeed + k * 20011 + 7;
    const p = new Promise((resolveWorker, rejectWorker) => {
      const worker = new Worker(currentFile, {
        workerData: {
          allReturns,
          nA,
          observedDiff,
          chunkIterations,
          seedOffset
        }
      });
      worker.on('message', resolveWorker);
      worker.on('error', rejectWorker);
      worker.on('exit', (code) => {
        if (code !== 0) rejectWorker(new Error(`Permutation worker ${k} exited with code ${code}`));
      });
    });
    workerPromises.push(p);
  }

  const results = await Promise.all(workerPromises);

  let totalExtreme = 0;
  for (const r of results) {
    totalExtreme += r.extremeCount;
  }

  const rawPValue = Number((totalExtreme / actualTotalIterations).toFixed(4));
  const bonferroniPValue = Number(Math.min(1.0, rawPValue * 8).toFixed(4));

  return {
    engine: 'INTRA_TASK_PARALLEL_PERMUTATION',
    workerCount,
    totalIterations: actualTotalIterations,
    observedSpreadPct: Number(observedDiff.toFixed(3)),
    totalExtremeCount: totalExtreme,
    rawPValue,
    bonferroniAdjustedPValue: bonferroniPValue,
    significanceVerdict: bonferroniPValue < 0.05
      ? 'CONFIRMATORY: Significant after Bonferroni correction (p < 0.05)'
      : 'NON_CONFIRMATORY: Promising raw p-value, but non-significant under strict FWER control (p_adj = ' + bonferroniPValue + ')'
  };
}
