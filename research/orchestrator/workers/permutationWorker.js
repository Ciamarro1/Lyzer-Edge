import { parentPort, workerData } from 'worker_threads';
import { getDatasetSnapshot, getLatestFundingRate } from '../datasetSnapshot.js';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from '../frozenConfig.js';
import { WyckoffVolumeProfileEngine } from '../../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

export function runPermutationTask(iterations = 10000) {
  const { candles, funding } = getDatasetSnapshot();

  const v5Engine = new WyckoffVolumeProfileEngine({
    lookback: FROZEN_V5_CONFIG.lookbackBars,
    volumeZScore: FROZEN_V5_CONFIG.volumeZScore,
    minPierceATR: FROZEN_V5_CONFIG.minPierceATR,
    pocProximity: FROZEN_V5_CONFIG.pocProximity,
    requireVolume: FROZEN_V5_CONFIG.requireVolume,
    requirePierce: FROZEN_V5_CONFIG.requirePierce,
    requirePOC: FROZEN_V5_CONFIG.requirePOC,
    requireReversal: FROZEN_V5_CONFIG.requireReversal
  });

  const lookbackBuffer = [];
  const springs = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    lookbackBuffer.push(c);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();
    if (i < 48 || lookbackBuffer.length < 30) continue;

    const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
    const nar = v5Engine.reconstruct(mtf);

    if (nar && nar.signal && nar.signal === 'LONG') {
      const rawEntry = candles[i + 1] ? candles[i + 1].open : c.close;
      const rawExit = candles[Math.min(candles.length - 1, i + 6)].close;
      const fwdRet = ((rawExit - rawEntry) / rawEntry) * 100;
      const fundingRate = getLatestFundingRate(funding, c.closeTime);

      springs.push({
        index: i,
        fwdRet,
        fundingRate,
        isNegFunding: fundingRate < 0
      });
    }
  }

  const trueCellA = springs.filter(s => s.isNegFunding);
  const trueCellB = springs.filter(s => !s.isNegFunding);

  const meanRetCellA = trueCellA.reduce((s, x) => s + x.fwdRet, 0) / trueCellA.length;
  const meanRetCellB = trueCellB.reduce((s, x) => s + x.fwdRet, 0) / trueCellB.length;
  const observedDiff = meanRetCellA - meanRetCellB;

  const nA = trueCellA.length;
  const allReturns = springs.map(s => s.fwdRet);
  const totalSprings = allReturns.length;

  let extremeCount = 0;
  for (let b = 0; b < iterations; b++) {
    // Fisher-Yates partial shuffle to pick nA random elements
    const shuffled = [...allReturns];
    let sumA = 0;
    for (let i = 0; i < nA; i++) {
      const r = i + Math.floor(Math.random() * (totalSprings - i));
      const temp = shuffled[i];
      shuffled[i] = shuffled[r];
      shuffled[r] = temp;
      sumA += shuffled[i];
    }
    const permMeanA = sumA / nA;
    let sumB = 0;
    for (let i = nA; i < totalSprings; i++) {
      sumB += shuffled[i];
    }
    const permMeanB = sumB / (totalSprings - nA);
    const permDiff = permMeanA - permMeanB;

    if (permDiff >= observedDiff) extremeCount++;
  }

  const rawPValue = Number((extremeCount / iterations).toFixed(4));
  const bonferroniHypothesisCount = 8; // Number of tested state splits
  const bonferroniPValue = Number(Math.min(1.0, rawPValue * bonferroniHypothesisCount).toFixed(4));

  return {
    workerName: 'permutationWorker',
    configHash: FROZEN_CONFIG_HASH,
    totalSpringsEvaluated: totalSprings,
    cellASampleSize: nA,
    cellBSampleSize: totalSprings - nA,
    observedSpreadPct: Number(observedDiff.toFixed(3)),
    permutationIterations: iterations,
    rawPValue,
    bonferroniAdjustedPValue: bonferroniPValue,
    significanceVerdict: bonferroniPValue < 0.05 
      ? 'CONFIRMATORY: Significant after Bonferroni correction (p < 0.05)' 
      : 'NON_CONFIRMATORY: Promising raw p-value, but non-significant under strict FWER control (p_adj = ' + bonferroniPValue + ')'
  };
}

if (parentPort) {
  const result = runPermutationTask(workerData?.iterations || 10000);
  parentPort.postMessage(result);
}
