import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';

// Fast, deterministic 32-bit XorShift Pseudo-Random Number Generator
class FastXorShift32 {
  constructor(seed = 123456789) {
    this.state = seed | 0 || 123456789;
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
  const { ledgerPnl, chunkIterations, seedOffset } = workerData;
  const n = ledgerPnl.length;
  const rng = new FastXorShift32(seedOffset);

  const localExp = new Float32Array(chunkIterations);
  const localPF = new Float32Array(chunkIterations);
  const localWR = new Float32Array(chunkIterations);
  let nonPositiveExpCount = 0;

  for (let b = 0; b < chunkIterations; b++) {
    let sum = 0;
    let wSum = 0;
    let lSum = 0;
    let winCount = 0;

    for (let i = 0; i < n; i++) {
      const rIdx = Math.floor(rng.nextFloat() * n);
      const val = ledgerPnl[rIdx];
      sum += val;
      if (val > 0) {
        winCount++;
        wSum += val;
      } else {
        lSum += Math.abs(val);
      }
    }

    const mean = sum / n;
    if (mean <= 0) nonPositiveExpCount++;

    const pf = lSum > 0 ? (wSum / lSum) : (wSum > 0 ? 10 : 0);
    const wr = (winCount / n) * 100;

    localExp[b] = mean;
    localPF[b] = pf;
    localWR[b] = wr;
  }

  parentPort.postMessage({
    expArray: Array.from(localExp),
    pfArray: Array.from(localPF),
    wrArray: Array.from(localWR),
    nonPositiveExpCount
  });
}

/**
 * Main Thread Coordinator for Intra-Task Parallel Bootstrap
 */
export async function runIntraTaskParallelBootstrap({
  ledger,
  totalIterations = 50000,
  workerCount = 8,
  baseSeed = 42
}) {
  const ledgerPnl = ledger.map(t => t.trueNetPnL);
  const chunkIterations = Math.floor(totalIterations / workerCount);
  const actualTotalIterations = chunkIterations * workerCount;

  const currentFile = fileURLToPath(import.meta.url);

  const workerPromises = [];
  for (let k = 0; k < workerCount; k++) {
    const seedOffset = baseSeed + k * 10007 + 1;
    const p = new Promise((resolveWorker, rejectWorker) => {
      const worker = new Worker(currentFile, {
        workerData: {
          ledgerPnl,
          chunkIterations,
          seedOffset
        }
      });
      worker.on('message', resolveWorker);
      worker.on('error', rejectWorker);
      worker.on('exit', (code) => {
        if (code !== 0) rejectWorker(new Error(`Bootstrap worker ${k} exited with code ${code}`));
      });
    });
    workerPromises.push(p);
  }

  const results = await Promise.all(workerPromises);

  // Aggregate distributions
  let allExp = [];
  let allPF = [];
  let allWR = [];
  let totalNonPositive = 0;

  for (const r of results) {
    allExp.push(...r.expArray);
    allPF.push(...r.pfArray);
    allWR.push(...r.wrArray);
    totalNonPositive += r.nonPositiveExpCount;
  }

  allExp.sort((a, b) => a - b);
  allPF.sort((a, b) => a - b);
  allWR.sort((a, b) => a - b);

  const ciExp = [
    Number(allExp[Math.floor(actualTotalIterations * 0.025)].toFixed(3)),
    Number(allExp[Math.floor(actualTotalIterations * 0.975)].toFixed(3))
  ];
  const ciPF = [
    Number(allPF[Math.floor(actualTotalIterations * 0.025)].toFixed(2)),
    Number(allPF[Math.floor(actualTotalIterations * 0.975)].toFixed(2))
  ];
  const ciWR = [
    Number(allWR[Math.floor(actualTotalIterations * 0.025)].toFixed(2)),
    Number(allWR[Math.floor(actualTotalIterations * 0.975)].toFixed(2))
  ];

  const probExpLeqZero = Number(((totalNonPositive / actualTotalIterations) * 100).toFixed(2));
  const strictlyPositive = ciExp[0] > 0 && ciPF[0] > 1.0;

  return {
    engine: 'INTRA_TASK_PARALLEL_BOOTSTRAP',
    workerCount,
    totalIterations: actualTotalIterations,
    confidenceIntervals95: {
      expectancyUSD: ciExp,
      profitFactor: ciPF,
      winRatePct: ciWR
    },
    riskAssessment: {
      probabilityExpectancyLeqZeroPct: probExpLeqZero,
      strictlyPositiveLowerBound: strictlyPositive
    },
    gateD_Status: strictlyPositive ? 'PASS_CONFIRMATORY' : 'INCONCLUSIVE_RETAINS_SHADOW'
  };
}
