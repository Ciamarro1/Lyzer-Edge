import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W05_FUNDING_OI] Starting Funding Rates & Basis Worker...');
const startTime = Date.now();

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'XRPUSDT'];
const horizons = [1, 2, 4, 8, 12, 24];

const hypothesesResults = [];

for (const asset of assets) {
  const dataPath1h = path.join(rootDir, `research/datasets/batch039/${asset}_1h.json`);
  const dataPathFunding = path.join(rootDir, `research/datasets/batch039/${asset}_funding.json`);
  if (!fs.existsSync(dataPath1h) || !fs.existsSync(dataPathFunding)) continue;

  const candles = JSON.parse(fs.readFileSync(dataPath1h, 'utf8'));
  const fundings = JSON.parse(fs.readFileSync(dataPathFunding, 'utf8'));
  if (candles.length < 500 || fundings.length < 100) continue;

  // Build a funding lookup table by timestamp (funding occurs every 8 hours)
  const fundingMap = new Map();
  for (const f of fundings) {
    const ts = Number(f.fundingTime);
    fundingMap.set(ts, { rate: Number(f.fundingRate), markPrice: Number(f.markPrice) });
  }

  const n = candles.length;
  const closes = new Float64Array(n);
  const alignedFunding = new Float64Array(n);
  const alignedBasis = new Float64Array(n);

  let currentRate = 0.0001; // neutral 1 bp
  let currentMark = candles[0].close;

  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    const ts = Number(candles[i].timestamp);
    // Find closest prior or coincident funding event
    if (fundingMap.has(ts)) {
      currentRate = fundingMap.get(ts).rate;
      currentMark = fundingMap.get(ts).markPrice;
    }
    alignedFunding[i] = currentRate;
    alignedBasis[i] = closes[i] > 1e-8 ? (currentMark - closes[i]) / closes[i] : 0;
  }

  // 1. Funding Rate Extreme Mean Reversion (Crowded Positioning Fade)
  // Rolling z-score of funding over 90 days (2,160 hours)
  const zFunding = new Float64Array(n);
  const lookbackF = 720; // 30-day baseline
  for (let t = lookbackF; t < n; t++) {
    let sum = 0;
    for (let k = 0; k < lookbackF; k++) sum += alignedFunding[t - k];
    const meanF = sum / lookbackF;
    let varF = 0;
    for (let k = 0; k < lookbackF; k++) varF += Math.pow(alignedFunding[t - k] - meanF, 2);
    const stdF = Math.sqrt(varF / (lookbackF - 1));
    zFunding[t] = stdF > 1e-8 ? (alignedFunding[t] - meanF) / stdF : 0;
  }

  for (const H of horizons) {
    const xCrowded = [];
    const yFwd = [];
    const tradeReturnsCrowded = [];

    for (let t = lookbackF; t + H < n; t += H) {
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      const z = zFunding[t];
      // Positive z-score means longs are over-leveraged and paying huge funding -> short signal
      const feat = -z;
      xCrowded.push(feat);
      yFwd.push(fwdRet);

      let dir = 0;
      if (z > 1.8) dir = -1; // Overcrowded long -> fade
      else if (z < -1.8) dir = 1; // Overcrowded short -> squeeze

      if (dir !== 0) {
        tradeReturnsCrowded.push(dir * fwdRet);
      }
    }

    if (tradeReturnsCrowded.length >= 20) {
      const ic = pearsonCorr(xCrowded, yFwd);
      const sp = spearmanCorr(xCrowded, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsCrowded, 5);
      const costs = calculateCostSensitivity(tradeReturnsCrowded);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W05_CROWDED_FUNDING_${asset}_H${H}`,
        worker: 'W05_FUNDING_OI',
        mechanism: 'Perpetual Funding Rate Sentiment Exhaustion Reversal',
        asset,
        lookback: lookbackF,
        horizon: H,
        sampleSize: tradeReturnsCrowded.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }
  }

  // 2. Basis Spread Dislocation (Mark vs Spot Dislocation)
  for (const H of horizons) {
    const xBasis = [];
    const yFwd = [];
    const tradeReturnsBasis = [];

    for (let t = 72; t + H < n; t += H) {
      const basis = alignedBasis[t];
      const fwdRet = Math.log(closes[t + H] / closes[t]);
      xBasis.push(basis);
      yFwd.push(fwdRet);

      let dir = 0;
      if (basis > 0.005) dir = 1; // Mark premium -> momentum
      else if (basis < -0.005) dir = -1; // Mark discount -> discount drag

      if (dir !== 0) {
        tradeReturnsBasis.push(dir * fwdRet);
      }
    }

    if (tradeReturnsBasis.length >= 20) {
      const ic = pearsonCorr(xBasis, yFwd);
      const sp = spearmanCorr(xBasis, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsBasis, 5);
      const costs = calculateCostSensitivity(tradeReturnsBasis);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W05_BASIS_SPREAD_${asset}_H${H}`,
        worker: 'W05_FUNDING_OI',
        mechanism: 'Perpetual-Spot Basis Premium Transmission',
        asset,
        lookback: 72,
        horizon: H,
        sampleSize: tradeReturnsBasis.length,
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
console.log(`✔ [W05_FUNDING_OI] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W05_FUNDING_OI',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W05_FUNDING_OI — Funding Rates & Basis Worker Summary
**Worker**: \`W05_FUNDING_OI\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Funding / Basis Candidates

| Hypothesis ID | Mechanism | Asset | Lookback | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | ${c.asset} | ${c.lookback}h | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W05_FUNDING_OI] Artifacts persisted.');
