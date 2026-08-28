import { parentPort, workerData } from 'worker_threads';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from '../frozenConfig.js';

export function runBootstrapTask(providedLedger = [], iterations = 20000) {
  const ledger = providedLedger;
  const n = ledger.length;

  const bootExpectancy = [];
  const bootPF = [];
  const bootWR = [];
  let nonPositiveExpCount = 0;

  for (let b = 0; b < iterations; b++) {
    const sample = [];
    for (let i = 0; i < n; i++) {
      sample.push(ledger[Math.floor(Math.random() * n)].trueNetPnL);
    }
    const mean = sample.reduce((s, x) => s + x, 0) / n;
    if (mean <= 0) nonPositiveExpCount++;

    const wins = sample.filter(x => x > 0);
    const losses = sample.filter(x => x <= 0);
    const wSum = wins.reduce((s, x) => s + x, 0);
    const lSum = Math.abs(losses.reduce((s, x) => s + x, 0));
    const pf = lSum > 0 ? (wSum / lSum) : (wSum > 0 ? 10 : 0);
    const wr = (wins.length / n) * 100;

    bootExpectancy.push(mean);
    bootPF.push(pf);
    bootWR.push(wr);
  }

  bootExpectancy.sort((a, b) => a - b);
  bootPF.sort((a, b) => a - b);
  bootWR.sort((a, b) => a - b);

  const ciExp = [
    Number(bootExpectancy[Math.floor(iterations * 0.025)].toFixed(3)),
    Number(bootExpectancy[Math.floor(iterations * 0.975)].toFixed(3))
  ];
  const ciPF = [
    Number(bootPF[Math.floor(iterations * 0.025)].toFixed(2)),
    Number(bootPF[Math.floor(iterations * 0.975)].toFixed(2))
  ];
  const ciWR = [
    Number(bootWR[Math.floor(iterations * 0.025)].toFixed(2)),
    Number(bootWR[Math.floor(iterations * 0.975)].toFixed(2))
  ];

  const probExpNonPositive = Number(((nonPositiveExpCount / iterations) * 100).toFixed(2));
  const strictlyPositive = ciExp[0] > 0 && ciPF[0] > 1.0;

  return {
    workerName: 'bootstrapWorker',
    configHash: FROZEN_CONFIG_HASH,
    sampleSizeN: n,
    iterations,
    confidenceIntervals95: {
      expectancyUSD: ciExp,
      profitFactor: ciPF,
      winRatePct: ciWR
    },
    riskAssessment: {
      probabilityExpectancyLeqZeroPct: probExpNonPositive,
      strictlyPositiveLowerBound: strictlyPositive,
      scientificInterpretation: strictlyPositive 
        ? 'CONFIRMATORY: Lower bound strictly positive at 95% confidence' 
        : 'INCONCLUSIVE: Lower bound crosses null hypothesis (Exp <= 0 / PF <= 1.0). Requires prospective N >= 50.'
    },
    gateD_BootstrapStatus: strictlyPositive ? 'PASS_CONFIRMATORY' : 'INCONCLUSIVE_RETAINS_SHADOW'
  };
}

if (parentPort) {
  const result = runBootstrapTask(workerData?.ledger, workerData?.iterations || 20000);
  parentPort.postMessage(result);
}
