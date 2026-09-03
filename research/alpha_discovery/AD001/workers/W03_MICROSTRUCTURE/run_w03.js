import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W03_MICROSTRUCTURE] Starting Microstructure & Order-Flow Worker...');
const startTime = Date.now();

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'XRPUSDT'];
const horizons = [1, 2, 4, 8, 12, 24];
const lookbacks = [3, 6, 12, 24];

const hypothesesResults = [];

for (const asset of assets) {
  const dataPath = path.join(rootDir, `research/datasets/batch039/${asset}_1h.json`);
  if (!fs.existsSync(dataPath)) continue;
  const candles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const n = candles.length;
  if (n < 500) continue;

  const closes = new Float64Array(n);
  const volumes = new Float64Array(n);
  const takerBuys = new Float64Array(n);
  const trades = new Float64Array(n);
  const ofi = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    volumes[i] = candles[i].volume;
    takerBuys[i] = candles[i].taker_buy_volume || (candles[i].volume * 0.5);
    trades[i] = candles[i].trades || 1;

    const buyVol = takerBuys[i];
    const sellVol = Math.max(0, volumes[i] - buyVol);
    const tot = buyVol + sellVol;
    ofi[i] = tot > 1e-8 ? (buyVol - sellVol) / tot : 0;
  }

  // 1. Cumulative OFI Momentum across lookbacks
  for (const L of lookbacks) {
    const cumOFI = new Float64Array(n);
    for (let t = L; t < n; t++) {
      let sum = 0;
      for (let k = 0; k < L; k++) sum += ofi[t - k];
      cumOFI[t] = sum / L;
    }

    for (const H of horizons) {
      const xOFI = [];
      const yFwd = [];
      const tradeReturns = [];

      for (let t = L; t + H < n; t += H) {
        const fwdRet = Math.log(closes[t + H] / closes[t]);
        const feat = cumOFI[t];
        xOFI.push(feat);
        yFwd.push(fwdRet);

        const dir = feat > 0.05 ? 1 : (feat < -0.05 ? -1 : 0);
        if (dir !== 0) {
          tradeReturns.push(dir * fwdRet);
        }
      }

      const ic = pearsonCorr(xOFI, yFwd);
      const sp = spearmanCorr(xOFI, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturns, 5);
      const costs = calculateCostSensitivity(tradeReturns);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W03_CUM_OFI_${asset}_L${L}_H${H}`,
        worker: 'W03_MICROSTRUCTURE',
        mechanism: 'Aggressive Order Flow Imbalance Momentum',
        asset,
        lookback: L,
        horizon: H,
        sampleSize: tradeReturns.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }
  }

  // 2. Flow-Price Divergence (High Buying Flow + Price Closes Negative -> Absorption Exhaustion)
  const divFeat = new Float64Array(n);
  for (let t = 1; t < n; t++) {
    const ret = Math.log(closes[t] / closes[t - 1]);
    const flow = ofi[t];
    // Positive divergence: flow > 0.15 and ret < -0.002 (trapped aggressive buyers) -> fade
    if (flow > 0.15 && ret < -0.002) divFeat[t] = -1;
    // Negative divergence: flow < -0.15 and ret > 0.002 (trapped aggressive sellers) -> bounce
    else if (flow < -0.15 && ret > 0.002) divFeat[t] = 1;
    else divFeat[t] = 0;
  }

  for (const H of horizons) {
    const tradeReturnsDiv = [];
    const xDiv = [];
    const yFwd = [];

    for (let t = 1; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const dir = divFeat[t];
      xDiv.push(dir);
      yFwd.push(fwdRet);

      if (dir !== 0) {
        tradeReturnsDiv.push(dir * fwdRet);
      }
    }

    if (tradeReturnsDiv.length > 20) {
      const ic = pearsonCorr(xDiv, yFwd);
      const sp = spearmanCorr(xDiv, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsDiv, 5);
      const costs = calculateCostSensitivity(tradeReturnsDiv);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W03_FLOW_DIVERGENCE_${asset}_H${H}`,
        worker: 'W03_MICROSTRUCTURE',
        mechanism: 'Aggressor Trapping Flow-Price Divergence',
        asset,
        lookback: 1,
        horizon: H,
        sampleSize: tradeReturnsDiv.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }
  }
}

const elapsedMs = Date.now() - startTime;
console.log(`✔ [W03_MICROSTRUCTURE] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W03_MICROSTRUCTURE',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W03_MICROSTRUCTURE — Microstructure & Order-Flow Worker Summary
**Worker**: \`W03_MICROSTRUCTURE\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Microstructure Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.lookback}h | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W03_MICROSTRUCTURE] Artifacts persisted.');
