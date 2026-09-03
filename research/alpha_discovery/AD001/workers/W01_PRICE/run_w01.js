import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W01_PRICE] Starting Price Dynamics Discovery Worker...');
const startTime = Date.now();

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'XRPUSDT'];
const lookbacks = [6, 12, 24, 48, 72];
const horizons = [1, 2, 4, 8, 12, 24];

const hypothesesResults = [];

for (const asset of assets) {
  const dataPath = path.join(rootDir, `research/datasets/batch039/${asset}_1h.json`);
  if (!fs.existsSync(dataPath)) continue;
  const candles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const n = candles.length;
  if (n < 500) continue;

  const closes = new Float64Array(n);
  const highs = new Float64Array(n);
  const lows = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    highs[i] = candles[i].high;
    lows[i] = candles[i].low;
  }

  // 1. Momentum and Mean Reversion Hypotheses
  for (const L of lookbacks) {
    const featureMom = new Float64Array(n);
    for (let t = L; t < n; t++) {
      featureMom[t] = Math.log(closes[t] / closes[t - L]);
    }

    for (const H of horizons) {
      const xMom = [];
      const yFwd = [];
      const tradeReturnsMom = [];
      const tradeReturnsRev = [];

      for (let t = L; t + H < n; t += H) {
        const fwdRet = Math.log(closes[t + H] / closes[t]);
        const feat = featureMom[t];
        xMom.push(feat);
        yFwd.push(fwdRet);

        // Directional trades
        const dirMom = feat > 0 ? 1 : -1;
        tradeReturnsMom.push(dirMom * fwdRet);
        tradeReturnsRev.push(-dirMom * fwdRet);
      }

      // Momentum Hypothesis
      const icMom = pearsonCorr(xMom, yFwd);
      const spMom = spearmanCorr(xMom, yFwd);
      const hacMom = calculateNeweyWestHAC(tradeReturnsMom, 5);
      const costsMom = calculateCostSensitivity(tradeReturnsMom);

      let classMom = 'REJECTED';
      if (hacMom.pValHAC < 0.05 && costsMom['cost_10bps']?.expectancyBps > 0) {
        classMom = Math.abs(icMom) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W01_MOM_${asset}_L${L}_H${H}`,
        worker: 'W01_PRICE',
        mechanism: 'Time-Series Momentum',
        asset,
        lookback: L,
        horizon: H,
        sampleSize: tradeReturnsMom.length,
        pearsonIC: Number(icMom.toFixed(4)),
        spearmanIC: Number(spMom.toFixed(4)),
        tHAC: Number(hacMom.tHAC.toFixed(4)),
        pValue: Number(hacMom.pValHAC.toFixed(4)),
        costSensitivity: costsMom,
        classification: classMom
      });

      // Mean Reversion Hypothesis
      const icRev = -icMom;
      const spRev = -spMom;
      const hacRev = calculateNeweyWestHAC(tradeReturnsRev, 5);
      const costsRev = calculateCostSensitivity(tradeReturnsRev);

      let classRev = 'REJECTED';
      if (hacRev.pValHAC < 0.05 && costsRev['cost_10bps']?.expectancyBps > 0) {
        classRev = Math.abs(icRev) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W01_REV_${asset}_L${L}_H${H}`,
        worker: 'W01_PRICE',
        mechanism: 'Short-Term Mean Reversion',
        asset,
        lookback: L,
        horizon: H,
        sampleSize: tradeReturnsRev.length,
        pearsonIC: Number(icRev.toFixed(4)),
        spearmanIC: Number(spRev.toFixed(4)),
        tHAC: Number(hacRev.tHAC.toFixed(4)),
        pValue: Number(hacRev.pValHAC.toFixed(4)),
        costSensitivity: costsRev,
        classification: classRev
      });
    }
  }

  // 2. Return Acceleration Hypotheses (Mom(12) - Mom(24))
  const featureAcc = new Float64Array(n);
  for (let t = 24; t < n; t++) {
    featureAcc[t] = Math.log(closes[t] / closes[t - 12]) - Math.log(closes[t - 12] / closes[t - 24]);
  }

  for (const H of horizons) {
    const xAcc = [];
    const yFwd = [];
    const tradeReturnsAcc = [];

    for (let t = 24; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const feat = featureAcc[t];
      xAcc.push(feat);
      yFwd.push(fwdRet);
      const dir = feat > 0 ? 1 : -1;
      tradeReturnsAcc.push(dir * fwdRet);
    }

    const icAcc = pearsonCorr(xAcc, yFwd);
    const spAcc = spearmanCorr(xAcc, yFwd);
    const hacAcc = calculateNeweyWestHAC(tradeReturnsAcc, 5);
    const costsAcc = calculateCostSensitivity(tradeReturnsAcc);

    let classAcc = 'REJECTED';
    if (hacAcc.pValHAC < 0.05 && costsAcc['cost_10bps']?.expectancyBps > 0) {
      classAcc = Math.abs(icAcc) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
    }

    hypothesesResults.push({
      id: `W01_ACC_${asset}_H${H}`,
      worker: 'W01_PRICE',
      mechanism: 'Return Acceleration (Second Derivative of Log Price)',
      asset,
      lookback: 24,
      horizon: H,
      sampleSize: tradeReturnsAcc.length,
      pearsonIC: Number(icAcc.toFixed(4)),
      spearmanIC: Number(spAcc.toFixed(4)),
      tHAC: Number(hacAcc.tHAC.toFixed(4)),
      pValue: Number(hacAcc.pValHAC.toFixed(4)),
      costSensitivity: costsAcc,
      classification: classAcc
    });
  }
}

const elapsedMs = Date.now() - startTime;
console.log(`✔ [W01_PRICE] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

// Save results
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W01_PRICE',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

// Generate SUMMARY.md
const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W01_PRICE — Price Dynamics Discovery Worker Summary
**Worker**: \`W01_PRICE\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Price Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.lookback}h | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W01_PRICE] Artifacts persisted.');
