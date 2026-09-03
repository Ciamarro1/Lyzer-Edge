import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W09_INTERACTIONS] Starting Conditional Interactions Worker...');
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
  const highs = new Float64Array(n);
  const lows = new Float64Array(n);
  const volumes = new Float64Array(n);
  const takerBuys = new Float64Array(n);
  const ofi = new Float64Array(n);
  const gkVol = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    highs[i] = candles[i].high;
    lows[i] = candles[i].low;
    volumes[i] = candles[i].volume;
    takerBuys[i] = candles[i].taker_buy_volume || (candles[i].volume * 0.5);

    const buy = takerBuys[i];
    const sell = Math.max(0, volumes[i] - buy);
    ofi[i] = (buy + sell) > 0 ? (buy - sell) / (buy + sell) : 0;

    const logHL = Math.log(highs[i] / lows[i]);
    const logCO = Math.log(closes[i] / candles[i].open);
    gkVol[i] = Math.sqrt(Math.max(1e-12, 0.5 * logHL * logHL - (2 * Math.log(2) - 1) * logCO * logCO));
  }

  // Volatility Expansion Ratio
  const ver = new Float64Array(n);
  for (let i = 48; i < n; i++) {
    let s6 = 0, s48 = 0;
    for (let k = 0; k < 6; k++) s6 += gkVol[i - k];
    for (let k = 0; k < 48; k++) s48 += gkVol[i - k];
    ver[i] = (s48 / 48) > 1e-8 ? (s6 / 6) / (s48 / 48) : 1.0;
  }

  // 1. Interaction: OFI Momentum conditioned on Volatility Expansion (OFI * (VER > 1.2))
  for (const H of horizons) {
    const xInt1 = [];
    const yFwd1 = [];
    const trades1 = [];

    for (let t = 48; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const flow = ofi[t];
      const isVolExpanding = ver[t] > 1.25;

      const feat = isVolExpanding ? flow : 0;
      xInt1.push(feat);
      yFwd1.push(fwdRet);

      if (isVolExpanding && Math.abs(flow) > 0.10) {
        const dir = flow > 0 ? 1 : -1;
        trades1.push(dir * fwdRet);
      }
    }

    if (trades1.length >= 20) {
      const ic = pearsonCorr(xInt1, yFwd1);
      const sp = spearmanCorr(xInt1, yFwd1);
      const hac = calculateNeweyWestHAC(trades1, 5);
      const costs = calculateCostSensitivity(trades1);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W09_OFI_x_VOLEXP_${asset}_H${H}`,
        worker: 'W09_INTERACTIONS',
        mechanism: 'Order Flow Aggression Amplified by Volatility Expansion Breakout',
        asset,
        horizon: H,
        sampleSize: trades1.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }
  }

  // 2. Interaction: Absorption Reversal conditioned on Volatility Compression (Absorption * (VER < 0.8))
  for (const H of horizons) {
    const xInt2 = [];
    const yFwd2 = [];
    const trades2 = [];

    for (let t = 48; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const flow = ofi[t];
      const isVolCompressed = ver[t] < 0.80;
      const barRet = Math.log(closes[t] / closes[t - 1]);

      // Passive absorption under compressed vol: heavy flow with negligible price movement
      let dir = 0;
      if (isVolCompressed && flow > 0.20 && barRet < 0.002) dir = -1; // Bearish absorption in compression
      else if (isVolCompressed && flow < -0.20 && barRet > -0.002) dir = 1; // Bullish absorption in compression

      xInt2.push(dir);
      yFwd2.push(fwdRet);

      if (dir !== 0) {
        trades2.push(dir * fwdRet);
      }
    }

    if (trades2.length >= 20) {
      const ic = pearsonCorr(xInt2, yFwd2);
      const sp = spearmanCorr(xInt2, yFwd2);
      const hac = calculateNeweyWestHAC(trades2, 5);
      const costs = calculateCostSensitivity(trades2);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W09_ABSORPTION_x_VOLCOMP_${asset}_H${H}`,
        worker: 'W09_INTERACTIONS',
        mechanism: 'Passive Liquidity Absorption in Compressed Volatility Coiling',
        asset,
        horizon: H,
        sampleSize: trades2.length,
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
console.log(`✔ [W09_INTERACTIONS] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W09_INTERACTIONS',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W09_INTERACTIONS — Conditional Interactions Worker Summary
**Worker**: \`W09_INTERACTIONS\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Interaction Candidates

| Hypothesis ID | Mechanism | Asset | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W09_INTERACTIONS] Artifacts persisted.');
