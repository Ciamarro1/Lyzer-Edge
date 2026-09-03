import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W02_VOLATILITY] Starting Volatility Dynamics Discovery Worker...');
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

  const opens = new Float64Array(n);
  const highs = new Float64Array(n);
  const lows = new Float64Array(n);
  const closes = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    opens[i] = candles[i].open;
    highs[i] = candles[i].high;
    lows[i] = candles[i].low;
    closes[i] = candles[i].close;
  }

  // 1. Garman-Klass Volatility per bar
  const gkVol = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const logHL = Math.log(highs[i] / lows[i]);
    const logCO = Math.log(closes[i] / opens[i]);
    gkVol[i] = Math.sqrt(Math.max(1e-12, 0.5 * logHL * logHL - (2 * Math.log(2) - 1) * logCO * logCO));
  }

  // 2. Rolling Parkinson Volatility
  const parkVol24 = new Float64Array(n);
  const factorPark = 1.0 / (4 * Math.log(2));
  for (let i = 24; i < n; i++) {
    let sumHL = 0;
    for (let k = 0; k < 24; k++) {
      const logHL = Math.log(highs[i - k] / lows[i - k]);
      sumHL += logHL * logHL;
    }
    parkVol24[i] = Math.sqrt(factorPark * (sumHL / 24));
  }

  // 3. Volatility Expansion Ratio (VER = GK_6 / GK_48)
  const ver = new Float64Array(n);
  for (let i = 48; i < n; i++) {
    let sum6 = 0, sum48 = 0;
    for (let k = 0; k < 6; k++) sum6 += gkVol[i - k];
    for (let k = 0; k < 48; k++) sum48 += gkVol[i - k];
    const mean6 = sum6 / 6;
    const mean48 = sum48 / 48;
    ver[i] = mean48 > 1e-8 ? mean6 / mean48 : 1.0;
  }

  // Hypotheses: Volatility Expansion Trend-Following (High VER + Trend Dir -> Continuation)
  for (const H of horizons) {
    const xVER = [];
    const yFwd = [];
    const tradeReturnsVER = [];

    for (let t = 48; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const expRatio = ver[t];
      const momSign = closes[t] > closes[t - 12] ? 1 : -1;
      const feat = (expRatio - 1.0) * momSign;

      xVER.push(feat);
      yFwd.push(fwdRet);

      const dir = feat > 0.1 ? momSign : (feat < -0.1 ? -momSign : 0);
      if (dir !== 0) {
        tradeReturnsVER.push(dir * fwdRet);
      }
    }

    const ic = pearsonCorr(xVER, yFwd);
    const sp = spearmanCorr(xVER, yFwd);
    const hac = calculateNeweyWestHAC(tradeReturnsVER, 5);
    const costs = calculateCostSensitivity(tradeReturnsVER);

    let classification = 'REJECTED';
    if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
      classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
    }

    hypothesesResults.push({
      id: `W02_VER_${asset}_H${H}`,
      worker: 'W02_VOLATILITY',
      mechanism: 'Volatility Expansion Trend Continuation',
      asset,
      lookback: 48,
      horizon: H,
      sampleSize: tradeReturnsVER.length,
      pearsonIC: Number(ic.toFixed(4)),
      spearmanIC: Number(sp.toFixed(4)),
      tHAC: Number(hac.tHAC.toFixed(4)),
      pValue: Number(hac.pValHAC.toFixed(4)),
      costSensitivity: costs,
      classification
    });
  }

  // 4. Volatility Shock Mean Reversion (Extreme Parkinson Vol Z-score > 2.0 -> Mean Reversion)
  for (const H of horizons) {
    const tradeReturnsShock = [];
    const xShock = [];
    const yFwd = [];

    for (let t = 96; t + H < n; t += H) {
      // Rolling mean and std of Parkinson vol over 72 bars
      let sum = 0;
      for (let k = 0; k < 72; k++) sum += parkVol24[t - k];
      const meanV = sum / 72;
      let varV = 0;
      for (let k = 0; k < 72; k++) varV += Math.pow(parkVol24[t - k] - meanV, 2);
      const stdV = Math.sqrt(varV / 71);

      const zVol = stdV > 1e-8 ? (parkVol24[t] - meanV) / stdV : 0;
      const recentReturn = Math.log(closes[t] / closes[t - 12]);
      const fwdRet = Math.log(closes[t + H] / closes[t]);

      // If extreme vol spike and market moved hard, fade it
      const feat = -zVol * recentReturn;
      xShock.push(feat);
      yFwd.push(fwdRet);

      if (zVol > 1.8) {
        const dir = recentReturn > 0 ? -1 : 1;
        tradeReturnsShock.push(dir * fwdRet);
      }
    }

    const ic = pearsonCorr(xShock, yFwd);
    const sp = spearmanCorr(xShock, yFwd);
    const hac = calculateNeweyWestHAC(tradeReturnsShock, 5);
    const costs = calculateCostSensitivity(tradeReturnsShock);

    let classification = 'REJECTED';
    if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
      classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
    }

    hypothesesResults.push({
      id: `W02_SHOCK_${asset}_H${H}`,
      worker: 'W02_VOLATILITY',
      mechanism: 'Volatility Spike Exhaustion Reversal',
      asset,
      lookback: 72,
      horizon: H,
      sampleSize: tradeReturnsShock.length,
      pearsonIC: Number(ic.toFixed(4)),
      spearmanIC: Number(sp.toFixed(4)),
      tHAC: Number(hac.tHAC.toFixed(4)),
      pValue: Number(hac.pValHAC.toFixed(4)),
      costSensitivity: costs,
      classification
    });
  }
}

const elapsedMs = Date.now() - startTime;
console.log(`✔ [W02_VOLATILITY] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W02_VOLATILITY',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W02_VOLATILITY — Volatility Dynamics Discovery Worker Summary
**Worker**: \`W02_VOLATILITY\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Volatility Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.lookback}h | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W02_VOLATILITY] Artifacts persisted.');
