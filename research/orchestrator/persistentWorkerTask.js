import { parentPort, isMainThread, workerData } from 'worker_threads';

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

if (!isMainThread && parentPort) {
  parentPort.on('message', (task) => {
    const { type, data } = task;

    if (type === 'BOOTSTRAP_CHUNK') {
      const { ledgerPnl, chunkIterations, seedOffset } = data;
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
        type: 'BOOTSTRAP_RESULT',
        expArray: Array.from(localExp),
        pfArray: Array.from(localPF),
        wrArray: Array.from(localWR),
        nonPositiveExpCount,
        chunkIterations
      });
    } else if (type === 'PERMUTATION_CHUNK') {
      const { allReturns, nA, observedDiff, chunkIterations, seedOffset } = data;
      const total = allReturns.length;
      const rng = new FastXorShift32(seedOffset);
      let localExtremeCount = 0;

      for (let b = 0; b < chunkIterations; b++) {
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
        type: 'PERMUTATION_RESULT',
        extremeCount: localExtremeCount,
        chunkIterations
      });
    } else if (type === 'PING') {
      parentPort.postMessage({ type: 'PONG', workerId: workerData?.workerId });
    }
  });
}
