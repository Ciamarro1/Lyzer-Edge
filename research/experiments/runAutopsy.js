import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Setup Autopsy Environment
const AUTOPSY_DIR = resolve(__dirname, 'EXP-AUTOPSY-001');
if (!existsSync(AUTOPSY_DIR)) mkdirSync(AUTOPSY_DIR, { recursive: true });

function writeJson(filename, data) {
  writeFileSync(resolve(AUTOPSY_DIR, filename), JSON.stringify(data, null, 2));
}

// 2. Load the Baseline (ARM A) results and Dataset
const resultsDir = resolve(__dirname, '../results');
const resultFiles = readdirSync(resultsDir).filter(f => f.startsWith('EXP-FRACTAL-001-ARMA'));
if (resultFiles.length === 0) throw new Error('ARM A results not found. Baseline is required.');

// Load latest ARM A
const latestArmA = resultFiles.sort().pop();
console.log(`Loading Baseline: ${latestArmA}`);
const baselineData = JSON.parse(readFileSync(resolve(resultsDir, latestArmA)));
const trades = baselineData.trades;

console.log(`Loading Dataset for Forensics...`);
const dataset = JSON.parse(readFileSync(resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json')));
console.log(`Dataset loaded. ${dataset.length} candles.`);

// Create a fast lookup map for candles by openTime
// Since the dataset is ordered, we can just use binary search or direct index tracking, 
// but Map is easy enough for 130k items.
const candleMap = new Map();
dataset.forEach((c, i) => candleMap.set(c.openTime, i));

// 3. Forensics Generation
const forensics = [];

console.log(`Processing ${trades.length} trades for MFE/MAE paths...`);

let neverWorkedCount = 0;
let workedThenFailedCount = 0;
let totalMfe1r = 0, totalMfe1_5r = 0, totalMfe2r = 0;

for (const trade of trades) {
  // Locate entry candle
  const entryTimeMs = trade.entryTime > 10000000000 ? trade.entryTime : trade.entryTime * 1000;
  let entryIndex = candleMap.get(entryTimeMs);
  if (entryIndex === undefined) {
    // Find closest candle before entryTime
    for (let i = 0; i < dataset.length; i++) {
      if (dataset[i].openTime >= entryTimeMs) {
        entryIndex = i;
        break;
      }
    }
  }
  
  if (entryIndex === undefined) continue;

  const entryPrice = trade.effectiveEntry || trade.entryPrice;
  const initialStopLoss = trade.initialStopLoss || trade.stopLoss || (trade.direction === 'LONG' ? entryPrice * 0.99 : entryPrice * 1.01);
  const riskDist = Math.abs(entryPrice - initialStopLoss);
  const R = riskDist > 0 ? riskDist : entryPrice * 0.005; // Fallback R

  // Track max excursions
  let maxFav = 0; // price diff
  let maxAdv = 0;
  
  const mfeTimeframes = [1, 2, 3, 5, 10, 15, 30];
  const mfePath = {};
  const maePath = {};

  // Scan up to 30 mins or until exit
  for (let offset = 0; offset <= 30; offset++) {
    const i = entryIndex + offset;
    if (i >= dataset.length) break;
    const c = dataset[i];
    
    // Stop scanning beyond exit time
    if (trade.exitTime) {
      const exitTimeMs = trade.exitTime > 10000000000 ? trade.exitTime : trade.exitTime * 1000;
      if (c.openTime > exitTimeMs) break;
    }

    // Calculate fav/adv
    let fav = 0, adv = 0;
    if (trade.direction === 'LONG') {
      fav = c.high - entryPrice;
      adv = entryPrice - c.low;
    } else {
      fav = entryPrice - c.low;
      adv = c.high - entryPrice;
    }

    if (fav > maxFav) maxFav = fav;
    if (adv > maxAdv) maxAdv = adv;

    if (mfeTimeframes.includes(offset)) {
      mfePath[`MFE_${offset}m`] = maxFav;
      mfePath[`MFE_${offset}m_R`] = maxFav / R;
      maePath[`MAE_${offset}m`] = maxAdv;
      maePath[`MAE_${offset}m_R`] = maxAdv / R;
    }
  }

  const maxMfeR = maxFav / R;
  const maxMaeR = maxAdv / R;

  // Causal Classification
  let causalClass = 'UNKNOWN';
  if (maxMfeR < 0.5 && trade.netPnL < 0) {
    causalClass = 'TYPE A - NEVER WORKED';
    neverWorkedCount++;
  } else if (maxMfeR >= 1.0 && trade.netPnL < 0) {
    causalClass = 'TYPE B - WORKED THEN FAILED';
    workedThenFailedCount++;
  } else if (trade.netPnL > 0) {
    causalClass = 'WIN';
  } else {
    causalClass = 'TYPE X - CHOP LOSS';
  }

  // Answer critical question
  if (trade.netPnL < 0) {
    if (maxMfeR >= 1.0) totalMfe1r++;
    if (maxMfeR >= 1.5) totalMfe1_5r++;
    if (maxMfeR >= 2.0) totalMfe2r++;
  }

  // Provider Attribution (from trade.provider or signalScore)
  const provider = trade.provider || 'UNKNOWN';

  forensics.push({
    trade_id: trade.id,
    asset: trade.symbol,
    direction: trade.direction,
    provider,
    entry_timestamp: trade.entryTime,
    entry_price: entryPrice,
    exit_timestamp: trade.exitTime,
    exit_price: trade.effectiveExit || trade.exitPrice,
    gross_pnl: trade.grossPnL,
    fees: trade.totalFees,
    net_pnl: trade.netPnL,
    R_value: R,
    ...mfePath,
    ...maePath,
    MFE_MAX: maxFav,
    MFE_MAX_R: maxMfeR,
    MAE_MAX: maxAdv,
    MAE_MAX_R: maxMaeR,
    causalClass
  });
}

writeJson('trade_forensics.json', forensics);

// 4. Provider Analysis
const providerStats = {};
for (const t of forensics) {
  const p = t.provider;
  if (!providerStats[p]) {
    providerStats[p] = { trades: 0, wins: 0, netPnL: 0, sumMfeR: 0, sumMaeR: 0 };
  }
  providerStats[p].trades++;
  if (t.net_pnl > 0) providerStats[p].wins++;
  providerStats[p].netPnL += t.net_pnl;
  providerStats[p].sumMfeR += t.MFE_MAX_R;
  providerStats[p].sumMaeR += t.MAE_MAX_R;
}

for (const p in providerStats) {
  providerStats[p].winRate = (providerStats[p].wins / providerStats[p].trades * 100).toFixed(2) + '%';
  providerStats[p].avgMfeR = (providerStats[p].sumMfeR / providerStats[p].trades).toFixed(2);
  providerStats[p].avgMaeR = (providerStats[p].sumMaeR / providerStats[p].trades).toFixed(2);
}
writeJson('provider_analysis.json', providerStats);

// 5. Fees & Friction Analysis
const totalGross = forensics.reduce((s, t) => s + t.gross_pnl, 0);
const totalFees = forensics.reduce((s, t) => s + t.fees, 0);
const totalNet = totalGross - totalFees;
writeJson('execution_analysis.json', { totalGross, totalFees, totalNet });

// 6. Output Summary to Console
console.log('\n=========================================');
console.log('AUTOPSY SUMMARY');
console.log('=========================================');
console.log(`Total Trades: ${trades.length}`);
console.log(`Gross PnL: $${totalGross.toFixed(2)}`);
console.log(`Total Fees: $${totalFees.toFixed(2)}`);
console.log(`Net PnL: $${totalNet.toFixed(2)}`);
console.log('\nCAUSAL CLASSIFICATION (LOSSES):');
console.log(`- TYPE A (Never Worked): ${neverWorkedCount}`);
console.log(`- TYPE B (Worked then Failed): ${workedThenFailedCount}`);
console.log(`- TYPE X (Chop Loss): ${trades.length - neverWorkedCount - workedThenFailedCount - providerStats['UNKNOWN']?.wins || 0}`);
console.log('\nWASTED POTENTIAL (Losses that had MFE):');
console.log(`- Had >= 1.0R MFE but lost: ${totalMfe1r}`);
console.log(`- Had >= 1.5R MFE but lost: ${totalMfe1_5r}`);
console.log(`- Had >= 2.0R MFE but lost: ${totalMfe2r}`);
console.log('\nPROVIDER BREAKDOWN:');
console.log(JSON.stringify(providerStats, null, 2));
console.log('=========================================');

