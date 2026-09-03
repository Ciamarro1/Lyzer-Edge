import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W08_LEAD_LAG] Starting Systematic Horizon Response Mapping Worker...');
const startTime = Date.now();

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const allHorizons = [1, 2, 4, 8, 12, 24];

const hypothesesResults = [];
const responseCurves = {};

for (const asset of assets) {
  const dataPath = path.join(rootDir, `research/datasets/batch039/${asset}_1h.json`);
  if (!fs.existsSync(dataPath)) continue;
  const candles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const n = candles.length;
  if (n < 500) continue;

  const closes = new Float64Array(n);
  const volumes = new Float64Array(n);
  const takerBuys = new Float64Array(n);
  const ofi = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    volumes[i] = candles[i].volume;
    takerBuys[i] = candles[i].taker_buy_volume || (candles[i].volume * 0.5);
    const buy = takerBuys[i];
    const sell = volumes[i] - buy;
    ofi[i] = (buy + sell) > 0 ? (buy - sell) / (buy + sell) : 0;
  }

  // Feature 1: Fast Order Flow Imbalance (OFI-6)
  const ofi6 = new Float64Array(n);
  for (let t = 6; t < n; t++) {
    let s = 0; for (let k = 0; k < 6; k++) s += ofi[t - k];
    ofi6[t] = s / 6;
  }

  // Feature 2: Short-Term Price Momentum (Mom-12)
  const mom12 = new Float64Array(n);
  for (let t = 12; t < n; t++) {
    mom12[t] = Math.log(closes[t] / closes[t - 12]);
  }

  // Map response curves for OFI-6 and Mom-12
  const ofiCurve = [];
  const momCurve = [];

  for (const H of allHorizons) {
    const xOFI = [], yFwdOFI = [], tradesOFI = [];
    const xMom = [], yFwdMom = [], tradesMom = [];

    for (let t = 24; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);

      // OFI
      const fOFI = ofi6[t];
      xOFI.push(fOFI);
      yFwdOFI.push(fwdRet);
      if (Math.abs(fOFI) > 0.05) tradesOFI.push(Math.sign(fOFI) * fwdRet);

      // Mom
      const fMom = mom12[t];
      xMom.push(fMom);
      yFwdMom.push(fwdRet);
      if (Math.abs(fMom) > 0.005) tradesMom.push(Math.sign(fMom) * fwdRet);
    }

    const icOFI = pearsonCorr(xOFI, yFwdOFI);
    const hacOFI = calculateNeweyWestHAC(tradesOFI, 5);
    const costsOFI = calculateCostSensitivity(tradesOFI);

    ofiCurve.push({ horizon: H, ic: Number(icOFI.toFixed(4)), tHAC: Number(hacOFI.tHAC.toFixed(2)), pVal: Number(hacOFI.pValHAC.toFixed(3)) });

    let classOFI = 'REJECTED';
    if (hacOFI.pValHAC < 0.05 && costsOFI['cost_10bps']?.expectancyBps > 0) {
      classOFI = Math.abs(icOFI) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
    }

    hypothesesResults.push({
      id: `W08_OFI_HORIZON_${asset}_H${H}`,
      worker: 'W08_LEAD_LAG',
      mechanism: 'Order Flow Imbalance Temporal Decay',
      asset,
      horizon: H,
      sampleSize: tradesOFI.length,
      pearsonIC: Number(icOFI.toFixed(4)),
      tHAC: Number(hacOFI.tHAC.toFixed(4)),
      pValue: Number(hacOFI.pValHAC.toFixed(4)),
      costSensitivity: costsOFI,
      classification: classOFI
    });

    const icMom = pearsonCorr(xMom, yFwdMom);
    const hacMom = calculateNeweyWestHAC(tradesMom, 5);
    const costsMom = calculateCostSensitivity(tradesMom);

    momCurve.push({ horizon: H, ic: Number(icMom.toFixed(4)), tHAC: Number(hacMom.tHAC.toFixed(2)), pVal: Number(hacMom.pValHAC.toFixed(3)) });

    let classMom = 'REJECTED';
    if (hacMom.pValHAC < 0.05 && costsMom['cost_10bps']?.expectancyBps > 0) {
      classMom = Math.abs(icMom) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
    }

    hypothesesResults.push({
      id: `W08_MOM_HORIZON_${asset}_H${H}`,
      worker: 'W08_LEAD_LAG',
      mechanism: 'Price Momentum Temporal Curve',
      asset,
      horizon: H,
      sampleSize: tradesMom.length,
      pearsonIC: Number(icMom.toFixed(4)),
      tHAC: Number(hacMom.tHAC.toFixed(4)),
      pValue: Number(hacMom.pValHAC.toFixed(4)),
      costSensitivity: costsMom,
      classification: classMom
    });
  }

  responseCurves[asset] = { OFI_Decay: ofiCurve, Momentum_Decay: momCurve };
}

const elapsedMs = Date.now() - startTime;
console.log(`✔ [W08_LEAD_LAG] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated across 6 fixed horizons.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W08_LEAD_LAG',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  fixedHorizonsTested: allHorizons,
  responseCurves,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

let summaryMd = `# W08_LEAD_LAG — Temporal Horizon Mapping Worker Summary
**Worker**: \`W08_LEAD_LAG\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Fixed Horizons Tested**: $H \\in \\{1h, 2h, 4h, 8h, 12h, 24h\\}$  
**Total Hypotheses Tested**: ${hypothesesResults.length}  

---

## Temporal Response Curves (IC across Horizon H)

`;

for (const [asset, curves] of Object.entries(responseCurves)) {
  summaryMd += `### Asset: ${asset}\n\n`;
  summaryMd += `| Horizon ($H$) | OFI IC ($t$-stat, $p$-val) | Momentum IC ($t$-stat, $p$-val) |\n`;
  summaryMd += `|:---:|:---:|:---:|\n`;
  for (let i = 0; i < allHorizons.length; i++) {
    const o = curves.OFI_Decay[i];
    const m = curves.Momentum_Decay[i];
    summaryMd += `| **${o.horizon}h** | ${o.ic.toFixed(4)} ($t=${o.tHAC}$, $p=${o.pVal}$) | ${m.ic.toFixed(4)} ($t=${m.tHAC}$, $p=${m.pVal}$) |\n`;
  }
  summaryMd += `\n`;
}

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W08_LEAD_LAG] Artifacts persisted.');
