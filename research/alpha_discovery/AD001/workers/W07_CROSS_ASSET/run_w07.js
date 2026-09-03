import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pearsonCorr, spearmanCorr, calculateNeweyWestHAC, calculateCostSensitivity } from '../../common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('▶ [W07_CROSS_ASSET] Starting Cross-Asset Spillovers Worker...');
const startTime = Date.now();

// Load BTC as anchor leader
const btcPath = path.join(rootDir, 'research/datasets/batch039/BTCUSDT_1h.json');
const btcCandles = JSON.parse(fs.readFileSync(btcPath, 'utf8'));
const n = btcCandles.length;

const btcCloses = new Float64Array(n);
const btcOFI = new Float64Array(n);
for (let i = 0; i < n; i++) {
  btcCloses[i] = btcCandles[i].close;
  const buy = btcCandles[i].taker_buy_volume;
  const sell = btcCandles[i].volume - buy;
  btcOFI[i] = (buy + sell) > 0 ? (buy - sell) / (buy + sell) : 0;
}

const followerAssets = ['ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'XRPUSDT'];
const horizons = [1, 2, 4, 8, 12, 24];
const hypothesesResults = [];

for (const asset of followerAssets) {
  const dataPath = path.join(rootDir, `research/datasets/batch039/${asset}_1h.json`);
  if (!fs.existsSync(dataPath)) continue;
  const candles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const assetN = candles.length;
  const len = Math.min(n, assetN);

  const assetCloses = new Float64Array(len);
  for (let i = 0; i < len; i++) assetCloses[i] = candles[i].close;

  // 1. BTC Return Lead -> Altcoin Lagged Follower (BTC Mom(6) predicting Altcoin Forward Return)
  for (const H of horizons) {
    const xLead = [];
    const yFwd = [];
    const tradeReturnsLead = [];

    for (let t = 24; t + H < len; t += H) {
      const btcReturn = Math.log(btcCloses[t] / btcCloses[t - 6]);
      const altFwdReturn = Math.log(assetCloses[t + H] / assetCloses[t]);

      xLead.push(btcReturn);
      yFwd.push(altFwdReturn);

      const dir = btcReturn > 0.005 ? 1 : (btcReturn < -0.005 ? -1 : 0);
      if (dir !== 0) {
        tradeReturnsLead.push(dir * altFwdReturn);
      }
    }

    if (tradeReturnsLead.length >= 20) {
      const ic = pearsonCorr(xLead, yFwd);
      const sp = spearmanCorr(xLead, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsLead, 5);
      const costs = calculateCostSensitivity(tradeReturnsLead);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W07_BTC_LEAD_${asset}_H${H}`,
        worker: 'W07_CROSS_ASSET',
        mechanism: 'BTC Directional Lead-Lag Spillover to Altcoins',
        leadAsset: 'BTCUSDT',
        followerAsset: asset,
        horizon: H,
        sampleSize: tradeReturnsLead.length,
        pearsonIC: Number(ic.toFixed(4)),
        spearmanIC: Number(sp.toFixed(4)),
        tHAC: Number(hac.tHAC.toFixed(4)),
        pValue: Number(hac.pValHAC.toFixed(4)),
        costSensitivity: costs,
        classification
      });
    }
  }

  // 2. Cross-Asset Relative Strength Reversal (Overstretched Altcoin vs BTC Spread Fade)
  for (const H of horizons) {
    const xRel = [];
    const yFwd = [];
    const tradeReturnsRel = [];

    for (let t = 48; t + H < len; t += H) {
      const altReturn = Math.log(assetCloses[t] / assetCloses[t - 24]);
      const btcReturn = Math.log(btcCloses[t] / btcCloses[t - 24]);
      const spread = altReturn - btcReturn; // positive means altcoin outperformed BTC by 'spread'

      const altFwd = Math.log(assetCloses[t + H] / assetCloses[t]);
      xRel.push(-spread); // fade overstretched spread
      yFwd.push(altFwd);

      // If altcoin outperformed BTC by > 5% over 24h, short altcoin; if underperformed by > 5%, long altcoin
      let dir = 0;
      if (spread > 0.05) dir = -1;
      else if (spread < -0.05) dir = 1;

      if (dir !== 0) {
        tradeReturnsRel.push(dir * altFwd);
      }
    }

    if (tradeReturnsRel.length >= 20) {
      const ic = pearsonCorr(xRel, yFwd);
      const sp = spearmanCorr(xRel, yFwd);
      const hac = calculateNeweyWestHAC(tradeReturnsRel, 5);
      const costs = calculateCostSensitivity(tradeReturnsRel);

      let classification = 'REJECTED';
      if (hac.pValHAC < 0.05 && costs['cost_10bps']?.expectancyBps > 0) {
        classification = Math.abs(ic) >= 0.03 ? 'DISCOVERY_CANDIDATE' : 'WEAK_CANDIDATE';
      }

      hypothesesResults.push({
        id: `W07_REL_STRENGTH_REV_${asset}_H${H}`,
        worker: 'W07_CROSS_ASSET',
        mechanism: 'Cross-Asset Dispersion Mean Reversion vs BTC Benchmark',
        leadAsset: 'BTCUSDT',
        followerAsset: asset,
        horizon: H,
        sampleSize: tradeReturnsRel.length,
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
console.log(`✔ [W07_CROSS_ASSET] Finished in ${elapsedMs}ms: ${hypothesesResults.length} hypotheses evaluated.`);

fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({
  workerId: 'W07_CROSS_ASSET',
  timestampUTC: new Date().toISOString(),
  elapsedMs,
  totalHypothesesTested: hypothesesResults.length,
  candidatesCount: hypothesesResults.filter(h => h.classification !== 'REJECTED').length,
  hypotheses: hypothesesResults
}, null, 2));

const candidates = hypothesesResults.filter(h => h.classification !== 'REJECTED');
let summaryMd = `# W07_CROSS_ASSET — Cross-Asset Spillovers Worker Summary
**Worker**: \`W07_CROSS_ASSET\`  
**Timestamp UTC**: \`${new Date().toISOString()}\`  
**Total Hypotheses Tested**: ${hypothesesResults.length}  
**Candidates Discovered**: ${candidates.length}  
**Rejected Hypotheses**: ${hypothesesResults.length - candidates.length}  
**Execution Duration**: ${elapsedMs}ms  

---

## Top Discovered Cross-Asset Candidates

| Hypothesis ID | Mechanism | Pair | Horizon | Pearson IC | HAC $t$-stat ($p$-val) | Net Expectancy (10 bps) | Classification |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
`;

candidates.sort((a, b) => b.pearsonIC - a.pearsonIC).slice(0, 15).forEach(c => {
  summaryMd += `| \`${c.id}\` | ${c.mechanism} | BTC $\\to$ ${c.followerAsset} | ${c.horizon}h | **${c.pearsonIC.toFixed(4)}** | $t=${c.tHAC.toFixed(2)}$ ($p=${c.pValue.toFixed(3)}$) | **${c.costSensitivity['cost_10bps']?.expectancyBps} bps** | **${c.classification}** |\n`;
});

fs.writeFileSync(path.join(__dirname, 'SUMMARY.md'), summaryMd);
console.log('✔ [W07_CROSS_ASSET] Artifacts persisted.');
