import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W04_LIQUIDITY] Starting Liquidity & Absorption Worker...');
const startTime = Date.now();

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'XRPUSDT'];
const horizons = [1, 2, 4, 8, 12, 24];

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

  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    volumes[i] = candles[i].volume;
    takerBuys[i] = candles[i].taker_buy_volume || (candles[i].volume * 0.5);
  }

  // 1. Kyle's Lambda (Price Displacement per unit volume)
  const kyleLambda = new Float64Array(n);
  const avgVol48 = new Float64Array(n);
  for (let t = 48; t < n; t++) {
    let sumV = 0;
    for (let k = 0; k < 48; k++) sumV += volumes[t - k];
    avgVol48[t] = sumV / 48;

    const normVol = avgVol48[t] > 1e-8 ? volumes[t] / avgVol48[t] : 1.0;
    const absRet = Math.abs(Math.log(closes[t] / closes[t - 1]));
    kyleLambda[t] = normVol > 1e-8 ? absRet / normVol : 0;
  }

  // 2. Passive Absorption Mechanism
  // High Volume (> 1.8x Avg) + Low Return (< 0.5x Avg Return) + Asymmetric Taker Flow
  const absorptionSignal = new Float64Array(n);
  for (let t = 48; t < n; t++) {
    const buyVol = takerBuys[t];
    const sellVol = Math.max(0, volumes[t] - buyVol);
    const flowImbalance = (buyVol - sellVol) / Math.max(1e-8, buyVol + sellVol);

    const normVol = avgVol48[t] > 1e-8 ? volumes[t] / avgVol48[t] : 1.0;
    const barRet = Math.log(closes[t] / closes[t - 1]);

    // Bullish Absorption: High sell flow (flowImbalance < -0.20) on huge volume (normVol > 1.8) but price refuses to drop (barRet > -0.003)
    if (flowImbalance < -0.20 && normVol > 1.8 && barRet > -0.003) {
      absorptionSignal[t] = 1; // Passive buyer absorbed aggressive sellers -> long
    }
    // Bearish Absorption: High buy flow (flowImbalance > 0.20) on huge volume (normVol > 1.8) but price refuses to rally (barRet < 0.003)
    else if (flowImbalance > 0.20 && normVol > 1.8 && barRet < 0.003) {
      absorptionSignal[t] = -1; // Passive seller absorbed aggressive buyers -> short
    } else {
      absorptionSignal[t] = 0;
    }
  }

  // Evaluate Passive Absorption across horizons
  for (const H of horizons) {
    const tradeReturnsAbs = [];
    const xAbs = [];
    const yFwd = [];

    for (let t = 48; t + H < n; t += H) {
      const dir = absorptionSignal[t];
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      xAbs.push(dir);
      yFwd.push(fwdRet);

      if (dir !== 0) {
        tradeReturnsAbs.push(dir * fwdRet);
      }
    }

    if (tradeReturnsAbs.length >= 20) {
      const ic = pearsonCorr(xAbs, yFwd);
      const sp = spearmanCorr(xAbs, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsAbs, 5);
      const costs = calculateCostSensitivity(tradeReturnsAbs);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W04_ABSORPTION_${asset}_H${H}`,
        worker: 'W04_LIQUIDITY',
        mechanism: 'Passive Limit Order Liquidity Absorption',
        asset,
        lookback: 48,
        horizon: H,
        sampleSize: tradeReturnsAbs.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }
  }

  // 3. Illiquidity Air-Pocket Fragility (High Lambda -> Fragile Trend Continuation)
  for (const H of horizons) {
    const tradeReturnsFragile = [];
    const xFrag = [];
    const yFwd = [];

    for (let t = 96; t + H < n; t += H) {
      let sumL = 0;
      for (let k = 0; k < 48; k++) sumL += kyleLambda[t - k];
      const meanL = sumL / 48;

      const isAirPocket = kyleLambda[t] > 2.0 * meanL;
      const mom = closes[t] > closes[t - 6] ? 1 : -1;
      const fwdRet = Math.log(closes[t + H] / closes[t]);

      const feat = isAirPocket ? mom : 0;
      xFrag.push(feat);
      yFwd.push(fwdRet);

      if (isAirPocket) {
        tradeReturnsFragile.push(mom * fwdRet);
      }
    }

    if (tradeReturnsFragile.length >= 20) {
      const ic = pearsonCorr(xFrag, yFwd);
      const sp = spearmanCorr(xFrag, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsFragile, 5);
      const costs = calculateCostSensitivity(tradeReturnsFragile);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W04_FRAGILITY_${asset}_H${H}`,
        worker: 'W04_LIQUIDITY',
        mechanism: 'Illiquid Air-Pocket Displacement Persistence',
        asset,
        lookback: 48,
        horizon: H,
        sampleSize: tradeReturnsFragile.length,
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
console.log(`✔ [W04_LIQUIDITY] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W04_LIQUIDITY',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W04_LIQUIDITY — Liquidity & Absorption Worker Summary
**Worker**: \`W04_LIQUIDITY\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Liquidity Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.lookback}h | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W04_LIQUIDITY] Artifacts persisted.');
