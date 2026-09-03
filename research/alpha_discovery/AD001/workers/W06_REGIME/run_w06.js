import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W06_REGIME] Starting Regime Conditioning Worker...');
const startTime = Date.now();

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'XRPUSDT'];
const horizons = [1, 2, 4, 8, 12, 24];

function computeHurstExponent(closes, endIdx, window = 64) {
  if (endIdx < window) return 0.5;
  const rets1 = [];
  for (let i = endIdx - window + 1; i <= endIdx; i++) {
    rets1.push(Math.log(closes[i] / closes[i - 1]));
  }
  const q = 4;
  const retsQ = [];
  for (let i = endIdx - window + q; i <= endIdx; i += q) {
    retsQ.push(Math.log(closes[i] / closes[i - q]));
  }
  const mean1 = rets1.reduce((a, b) => a + b, 0) / rets1.length;
  const var1 = rets1.reduce((acc, r) => acc + Math.pow(r - mean1, 2), 0) / (rets1.length - 1);
  const meanQ = retsQ.reduce((a, b) => a + b, 0) / retsQ.length;
  const varQ = retsQ.reduce((acc, r) => acc + Math.pow(r - meanQ, 2), 0) / (retsQ.length - 1);

  if (var1 <= 1e-12 || varQ <= 1e-12) return 0.5;
  const vr = varQ / (q * var1);
  const H = 0.5 + Math.log(Math.max(1e-6, vr)) / (2 * Math.log(q));
  return Math.min(1.0, Math.max(0.0, H));
}

const hypothesesResults = [];

for (const asset of assets) {
  const dataPath = path.join(rootDir, `research/datasets/batch039/${asset}_1h.json`);
  if (!fs.existsSync(dataPath)) continue;
  const candles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const n = candles.length;
  if (n < 500) continue;

  const closes = new Float64Array(n);
  const hurst = new Float64Array(n);
  for (let i = 0; i < n; i++) closes[i] = candles[i].close;

  // Compute rolling Hurst
  for (let t = 64; t < n; t++) {
    hurst[t] = computeHurstExponent(closes, t, 64);
  }

  for (const H of horizons) {
    // 1. Regime-Gated Momentum (Activate momentum ONLY when Hurst > 0.55)
    const xGatedMom = [];
    const yFwdMom = [];
    const tradeReturnsGatedMom = [];

    for (let t = 64; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const mom = closes[t] > closes[t - 12] ? 1 : -1;
      const isTrending = hurst[t] > 0.55;

      const feat = isTrending ? mom : 0;
      xGatedMom.push(feat);
      yFwdMom.push(fwdRet);

      if (isTrending) {
        tradeReturnsGatedMom.push(mom * fwdRet);
      }
    }

    if (tradeReturnsGatedMom.length >= 20) {
      const ic = pearsonCorr(xGatedMom, yFwdMom);
      const sp = spearmanCorr(xGatedMom, yFwdMom);
      const hac = calculateNeweyWestHAC(tradeReturnsGatedMom, 5);
      const costs = calculateCostSensitivity(tradeReturnsGatedMom);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W06_GATED_MOM_${asset}_H${H}`,
        worker: 'W06_REGIME',
        mechanism: 'Hurst-Gated Trend Following in Persistent Regimes',
        asset,
        lookback: 64,
        horizon: H,
        sampleSize: tradeReturnsGatedMom.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }

    // 2. Regime-Gated Mean Reversion (Activate reversal ONLY when Hurst < 0.45)
    const xGatedRev = [];
    const yFwdRev = [];
    const tradeReturnsGatedRev = [];

    for (let t = 64; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const mom = closes[t] > closes[t - 12] ? 1 : -1;
      const isMeanReverting = hurst[t] < 0.45;

      const feat = isMeanReverting ? -mom : 0;
      xGatedRev.push(feat);
      yFwdRev.push(fwdRet);

      if (isMeanReverting) {
        tradeReturnsGatedRev.push(-mom * fwdRet);
      }
    }

    if (tradeReturnsGatedRev.length >= 20) {
      const ic = pearsonCorr(xGatedRev, yFwdRev);
      const sp = spearmanCorr(xGatedRev, yFwdRev);
      const hac = calculateNeweyWestHAC(tradeReturnsGatedRev, 5);
      const costs = calculateCostSensitivity(tradeReturnsGatedRev);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W06_GATED_REV_${asset}_H${H}`,
        worker: 'W06_REGIME',
        mechanism: 'Hurst-Gated Mean Reversion in Anti-Persistent Regimes',
        asset,
        lookback: 64,
        horizon: H,
        sampleSize: tradeReturnsGatedRev.length,
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
console.log(`✔ [W06_REGIME] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W06_REGIME',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W06_REGIME — Market Regime Conditioning Worker Summary
**Worker**: \`W06_REGIME\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Regime Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.lookback}h | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W06_REGIME] Artifacts persisted.');
