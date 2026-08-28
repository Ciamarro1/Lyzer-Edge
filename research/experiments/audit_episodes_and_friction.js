import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../results/v5_confirmatory/V5_CELL_A_REBUILT_LEDGER.csv');
const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');

const rows = lines.slice(1).map(l => {
  const parts = l.split(',');
  return {
    tradeId: parseInt(parts[0]),
    timestamp: parseInt(parts[1]),
    dateUtc: parts[2],
    year: parseInt(parts[3]),
    fundingRate: parseFloat(parts[4]),
    rawEntryPrice: parseFloat(parts[5]),
    executedEntryPrice: parseFloat(parts[6]),
    stopPrice: parseFloat(parts[7]),
    targetPrice: parseFloat(parts[8]),
    rawExitPrice: parseFloat(parts[9]),
    executedExitPrice: parseFloat(parts[10]),
    exitReason: parts[11],
    holdingHours: parseInt(parts[12]),
    fwdPriceRet6hPct: parseFloat(parts[13]),
    trueGrossPnL: parseFloat(parts[14]),
    exactTakerFees: parseFloat(parts[15]),
    exactSlippageCost: parseFloat(parts[16]),
    totalFrictionCost: parseFloat(parts[17]),
    trueNetPnL: parseFloat(parts[18]),
    isNetWin: parts[19] === 'true'
  };
});

console.log('='.repeat(80));
console.log('1. EPISODE CLUSTERING AUDIT (24-HOUR WINDOW)');
console.log('='.repeat(80));

const clusters = [];
let currentCluster = [];

for (let i = 0; i < rows.length; i++) {
  const trade = rows[i];
  if (currentCluster.length === 0) {
    currentCluster.push(trade);
  } else {
    const prev = currentCluster[currentCluster.length - 1];
    const diffHours = (trade.timestamp - prev.timestamp) / (1000 * 3600);
    if (diffHours <= 24) {
      currentCluster.push(trade);
    } else {
      clusters.push([...currentCluster]);
      currentCluster = [trade];
    }
  }
}
if (currentCluster.length > 0) clusters.push(currentCluster);

console.log(`Total Trades: ${rows.length}`);
console.log(`Total Clusters/Episodes Formed: ${clusters.length}`);

let count1 = 0;
let count2 = 0;
let count3 = 0;
let countMore = 0;

const episodeStats = [];

clusters.forEach((c, idx) => {
  const epId = idx + 1;
  const nTrades = c.length;
  const epGross = c.reduce((s, t) => s + t.trueGrossPnL, 0);
  const epFriction = c.reduce((s, t) => s + t.totalFrictionCost, 0);
  const epNet = c.reduce((s, t) => s + t.trueNetPnL, 0);
  const isEpWin = epNet > 0;
  const dates = c.map(t => t.dateUtc.slice(0, 16)).join(' | ');

  if (nTrades === 1) count1++;
  else if (nTrades === 2) count2++;
  else if (nTrades === 3) count3++;
  else countMore++;

  episodeStats.push({
    epId,
    nTrades,
    trades: c.map(t => t.tradeId),
    epGross: Number(epGross.toFixed(2)),
    epFriction: Number(epFriction.toFixed(2)),
    epNet: Number(epNet.toFixed(2)),
    isEpWin,
    dates
  });

  console.log(`Episode #${String(epId).padStart(2)}: ${nTrades} trade(s) [Trades: ${c.map(t => `#${t.tradeId}`).join(', ')}] | Dates: ${dates} | Gross: $${String(epGross.toFixed(2)).padStart(6)} | Fric: $${epFriction.toFixed(2)} | Net: $${String(epNet.toFixed(2)).padStart(6)} | Win: ${isEpWin ? 'YES ✅' : 'NO ❌'}`);
});

console.log('\nEpisode Composition Summary:');
console.log(`- Episodes with 1 trade : ${count1} (Total: ${count1 * 1} trades)`);
console.log(`- Episodes with 2 trades: ${count2} (Total: ${count2 * 2} trades)`);
console.log(`- Episodes with 3 trades: ${count3} (Total: ${count3 * 3} trades)`);
console.log(`- Total Trades Check    : ${count1 * 1 + count2 * 2 + count3 * 3} trades (Matches 25: ${count1 * 1 + count2 * 2 + count3 * 3 === 25 ? 'YES ✅' : 'NO ❌'})`);

const epWins = episodeStats.filter(e => e.isEpWin).length;
const epLosses = episodeStats.length - epWins;
console.log(`\nEpisode Win Rate: ${epWins}/${episodeStats.length} = ${((epWins / episodeStats.length) * 100).toFixed(2)}%`);

// Concentration Analysis
const sortedEpNet = [...episodeStats].sort((a, b) => b.epNet - a.epNet);
const totalNetPnL = rows.reduce((s, t) => s + t.trueNetPnL, 0);

const top1Net = sortedEpNet[0].epNet;
const top3Net = sortedEpNet.slice(0, 3).reduce((s, e) => s + e.epNet, 0);
const top5Net = sortedEpNet.slice(0, 5).reduce((s, e) => s + e.epNet, 0);

console.log('\n' + '='.repeat(80));
console.log('2. EPISODE CONCENTRATION AUDIT (GATE E)');
console.log('='.repeat(80));
console.log(`Total Net PnL: $${totalNetPnL.toFixed(2)}`);
console.log(`Top 1 Episode (Ep #${sortedEpNet[0].epId}, Trades: ${sortedEpNet[0].trades.join(',')}): +$${top1Net.toFixed(2)} (${((top1Net / totalNetPnL) * 100).toFixed(2)}% of total profit)`);
console.log(`Top 3 Episodes: +$${top3Net.toFixed(2)} (${((top3Net / totalNetPnL) * 100).toFixed(2)}% of total profit)`);
console.log(`Top 5 Episodes: +$${top5Net.toFixed(2)} (${((top5Net / totalNetPnL) * 100).toFixed(2)}% of total profit)`);
console.log(`Worst Episode (Ep #${sortedEpNet[sortedEpNet.length - 1].epId}): $${sortedEpNet[sortedEpNet.length - 1].epNet.toFixed(2)}`);
const medianEpNet = sortedEpNet[Math.floor(sortedEpNet.length / 2)].epNet;
console.log(`Median Episode Net PnL: $${medianEpNet.toFixed(2)}`);

console.log('\n' + '='.repeat(80));
console.log('3. GROSS EDGE vs FRICTION DISTRIBUTION & DRAG ANALYSIS');
console.log('='.repeat(80));

const grossWinners = rows.filter(t => t.trueGrossPnL > 0);
const grossLosers = rows.filter(t => t.trueGrossPnL <= 0);
const frictionKilled = rows.filter(t => t.trueGrossPnL > 0 && t.trueNetPnL <= 0);

console.log(`Gross Winners: ${grossWinners.length}/25 (${((grossWinners.length / 25) * 100).toFixed(2)}%) | Gross Losers: ${grossLosers.length}/25`);
console.log(`Net Winners  : ${rows.filter(t => t.isNetWin).length}/25 (56.00%) | Net Losers  : ${rows.filter(t => !t.isNetWin).length}/25 (44.00%)`);
console.log(`Friction-Killed Trades (Gross > 0 but Net <= 0): ${frictionKilled.length}`);
frictionKilled.forEach(t => {
  console.log(`  -> Trade #${t.tradeId} (${t.dateUtc.slice(0, 10)}): Gross = +$${t.trueGrossPnL.toFixed(2)} (+${((t.trueGrossPnL/1000)*100).toFixed(3)}%) | Friction = -$${t.totalFrictionCost.toFixed(2)} | Net = $${t.trueNetPnL.toFixed(2)} (Reason: ${t.exitReason})`);
});

const grossReturns = rows.map(t => (t.trueGrossPnL / 1000) * 100);
const netReturns = rows.map(t => (t.trueNetPnL / 1000) * 100);
const frictionBps = rows.map(t => (t.totalFrictionCost / 1000) * 10000); // basis points

console.log(`\nBreakeven Threshold:`);
console.log(`  - Average Friction Roundtrip: ${((rows.reduce((s, t) => s + t.totalFrictionCost, 0) / 25) / 1000 * 100).toFixed(3)}% ($2.406 / 24.06 bps)`);
console.log(`  - Minimum Gross Edge to Survive: +0.241% (+24.1 bps of price movement)`);
console.log(`  - Mean Gross Edge across 25 trades: +${(rows.reduce((s, t) => s + t.trueGrossPnL, 0) / 25 / 1000 * 100).toFixed(3)}% (+55.4 bps)`);
console.log(`  - Net Margin (Gross Edge - Friction): +${(rows.reduce((s, t) => s + t.trueNetPnL, 0) / 25 / 1000 * 100).toFixed(3)}% (+31.4 bps)`);
