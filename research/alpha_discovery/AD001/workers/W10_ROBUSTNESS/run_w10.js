import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, calculateNeweyWestHAC, createMulberry32 } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W10_ROBUSTNESS] Starting Robustness Controls & Null Experiments Worker...');
const startTime = Date.now();

// Load candidates from other workers if available, or test canonical discovery features
const btcPath = path.join(rootDir, 'research/datasets/batch039/BTCUSDT_1h.json');
const candles = JSON.parse(fs.readFileSync(btcPath, 'utf8'));
const n = candles.length;

const closes = new Float64Array(n);
const ofi = new Float64Array(n);
for (let i = 0; i < n; i++) {
  closes[i] = candles[i].close;
  const buy = candles[i].taker_buy_volume;
  const sell = candles[i].volume - buy;
  ofi[i] = (buy + sell) > 0 ? (buy - sell) / (buy + sell) : 0;
}

// Canonical Discovery Signals to stress-test:
// 1. OFI Momentum (Lookback 6, Horizon 4)
// 2. Passive Absorption Reversal (Lookback 48, Horizon 8)
const signals = [
  {
    name: 'OFI_Momentum_H4',
    horizon: 4,
    generator: () => {
      const sig = new Float64Array(n);
      for (let t = 6; t < n; t++) {
        let s = 0; for (let k = 0; k < 6; k++) s += ofi[t - k];
        sig[t] = s / 6;
      }
      return sig;
    }
  },
  {
    name: 'Absorption_Reversal_H8',
    horizon: 8,
    generator: () => {
      const sig = new Float64Array(n);
      for (let t = 48; t < n; t++) {
        const flow = ofi[t];
        const barRet = Math.log(closes[t] / closes[t - 1]);
        if (flow > 0.20 && barRet < 0.002) sig[t] = -1;
        else if (flow < -0.20 && barRet > -0.002) sig[t] = 1;
        else sig[t] = 0;
      }
      return sig;
    }
  }
];

const robustnessResults = [];
const prng = createMulberry32(424242);

for (const s of signals) {
  const feat = s.generator();
  const H = s.horizon;

  // Real empirical baseline
  const xReal = [];
  const yReal = [];
  for (let t = 48; t + H < n; t += H) {
    xReal.push(feat[t]);
    yReal.push(Math.log(closes[t + H] / closes[t]));
  }
  const realIC = pearsonCorr(xReal, yReal);

  // 1. Temporal Shuffle Control (500 permutations)
  const shuffleICs = [];
  for (let iter = 0; iter < 500; iter++) {
    const xShuffled = [...xReal];
    for (let i = xShuffled.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const tmp = xShuffled[i];
      xShuffled[i] = xShuffled[j];
      xShuffled[j] = tmp;
    }
    shuffleICs.push(pearsonCorr(xShuffled, yReal));
  }
  const meanShuffleIC = shuffleICs.reduce((a, b) => a + b, 0) / 500;
  const pValShuffle = shuffleICs.filter(ic => Math.abs(ic) >= Math.abs(realIC)).length / 500;

  // 2. Sign Permutation Control (500 permutations)
  const signICs = [];
  for (let iter = 0; iter < 500; iter++) {
    const xFlipped = xReal.map(x => (prng() > 0.5 ? x : -x));
    signICs.push(pearsonCorr(xFlipped, yReal));
  }
  const meanSignIC = signICs.reduce((a, b) => a + b, 0) / 500;
  const pValSign = signICs.filter(ic => Math.abs(ic) >= Math.abs(realIC)).length / 500;

  // 3. Block Shuffle Control (blocks of 10 bars)
  const blockICs = [];
  const blockSize = 10;
  const numBlocks = Math.floor(xReal.length / blockSize);
  for (let iter = 0; iter < 500; iter++) {
    const blockIndices = [];
    for (let b = 0; b < numBlocks; b++) blockIndices.push(b);
    for (let i = blockIndices.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const tmp = blockIndices[i];
      blockIndices[i] = blockIndices[j];
      blockIndices[j] = tmp;
    }
    const xBlocked = [];
    for (const b of blockIndices) {
      for (let k = 0; k < blockSize; k++) xBlocked.push(xReal[b * blockSize + k]);
    }
    blockICs.push(pearsonCorr(xBlocked, yReal.slice(0, xBlocked.length)));
  }
  const meanBlockIC = blockICs.reduce((a, b) => a + b, 0) / 500;
  const pValBlock = blockICs.filter(ic => Math.abs(ic) >= Math.abs(realIC)).length / 500;

  const passedAllControls = pValShuffle < 0.05 && pValSign < 0.05 && pValBlock < 0.05;

  robustnessResults.push({
    signalName: s.name,
    horizon: H,
    realIC: Number(realIC.toFixed(4)),
    temporalShuffle: {
      meanNullIC: Number(meanShuffleIC.toFixed(4)),
      empiricalPValue: Number(pValShuffle.toFixed(4)),
      passed: pValShuffle < 0.05
    },
    signPermutation: {
      meanNullIC: Number(meanSignIC.toFixed(4)),
      empiricalPValue: Number(pValSign.toFixed(4)),
      passed: pValSign < 0.05
    },
    blockShuffle: {
      meanNullIC: Number(meanBlockIC.toFixed(4)),
      empiricalPValue: Number(pValBlock.toFixed(4)),
      passed: pValBlock < 0.05
    },
    robustnessVerdict: passedAllControls ? 'SURVIVED_ALL_NULLS' : 'FAILED_NULL_CONTROL'
  });
}

const elapsedMs = Date.now() - startTime;
console.log(`✔ [W10_ROBUSTNESS] Finished in ${elapsedMs}ms: 1,500 null permutations evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W10_ROBUSTNESS',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  permutationsPerTest: 500,
  controls: robustnessResults
}, null, 2));

let summaryMd = `# W10_ROBUSTNESS — Robustness & Null Controls Summary
**Worker**: \`W10_ROBUSTNESS\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Permutations Per Test**: 500  

---

## Empirical Null Distribution Controls

| Signal Name | Horizon | Real IC | Shuffle Null IC ($p$-val) | Sign Perm Null IC ($p$-val) | Block Shuffle Null IC ($p$-val) | Verdict |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
`;

for (const r of robustnessResults) {
  summaryMd += `| **${r.signalName}** | ${r.horizon}h | **${r.realIC.toFixed(4)}** | ${r.temporalShuffle.meanNullIC} ($p=${r.temporalShuffle.empiricalPValue}$) | ${r.signPermutation.meanNullIC} ($p=${r.signPermutation.empiricalPValue}$) | ${r.blockShuffle.meanNullIC} ($p=${r.blockShuffle.empiricalPValue}$) | **${r.robustnessVerdict}** |\n`;
}

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W10_ROBUSTNESS] Artifacts persisted.');
