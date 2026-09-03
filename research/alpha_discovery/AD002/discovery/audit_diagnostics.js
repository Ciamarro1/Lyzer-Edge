import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load raw results
const rawPath = path.join(__dirname, 'AD002_DISCOVERY_RAW_RESULTS.json');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

console.log('================================================================');
console.log('🔬 AD002 FORENSIC AUDIT DIAGNOSTICS');
console.log('Total Hypotheses in Raw JSON:', raw.results.length);
console.log('================================================================\n');

// 1. Audit Point A: Analysis of P-values across the 64 hypotheses
const pValues = raw.results.map(r => r.pooled.pValue);
const minP = Math.min(...pValues);
const maxP = Math.max(...pValues);
const meanP = pValues.reduce((a, b) => a + b, 0) / pValues.length;

console.log('--- AUDIT POINT A: P-VALUE AND NULL GENERATION ---');
console.log(`Min p-value:  ${minP.toFixed(4)} (${raw.results.find(r => r.pooled.pValue === minP).hypothesisId})`);
console.log(`Max p-value:  ${maxP.toFixed(4)} (${raw.results.find(r => r.pooled.pValue === maxP).hypothesisId})`);
console.log(`Mean p-value: ${meanP.toFixed(4)}`);
console.log(`Hypotheses with p < 0.05: ${pValues.filter(p => p < 0.05).length}`);
console.log(`Hypotheses with p < 0.10: ${pValues.filter(p => p < 0.10).length}`);
console.log(`Hypotheses with p < 0.20: ${pValues.filter(p => p < 0.20).length}`);

// 2. Audit Point B: Exit Types Breakdown across all hypotheses
console.log('\n--- AUDIT POINT B: EXIT TYPES & COST/SLIPPAGE ACCOUNTING ---');
let totalTradesAll = 0;
let totalTPAll = 0;
let totalSLAll = 0;
let totalTimeoutAll = 0;

for (const r of raw.results) {
  totalTradesAll += r.pooled.nTrades;
  totalTPAll += r.pooled.tpCount;
  totalSLAll += r.pooled.slCount;
  totalTimeoutAll += r.pooled.timeoutCount;
}

console.log(`Total Trades across all 64 Hypotheses: ${totalTradesAll.toLocaleString()}`);
console.log(`Total Take Profits (Nominal + Gap):   ${totalTPAll.toLocaleString()} (${((totalTPAll / totalTradesAll) * 100).toFixed(1)}%)`);
console.log(`Total Stop Losses (Nominal + Gap):    ${totalSLAll.toLocaleString()} (${((totalSLAll / totalTradesAll) * 100).toFixed(1)}%)`);
console.log(`Total Timeouts (72h forced exit):     ${totalTimeoutAll.toLocaleString()} (${((totalTimeoutAll / totalTradesAll) * 100).toFixed(1)}%)`);

// 3. Audit Point C: Break-even rate across hypotheses
console.log('\n--- AUDIT POINT C: REALIZED WIN RATE & BREAK-EVEN DYNAMICS ---');
const winRates = raw.results.map(r => r.pooled.tpPct);
const minWR = Math.min(...winRates);
const maxWR = Math.max(...winRates);
const meanWR = winRates.reduce((a, b) => a + b, 0) / winRates.length;
console.log(`Min Win Rate:  ${minWR}%`);
console.log(`Max Win Rate:  ${maxWR}% (${raw.results.find(r => r.pooled.tpPct === maxWR).hypothesisId})`);
console.log(`Mean Win Rate: ${meanWR.toFixed(1)}%`);

// Top 5 Candidates Detailed Breakdown
console.log('\n--- TOP 5 CANDIDATES BY EXPECTANCY ---');
const sortedByE = [...raw.results].sort((a, b) => b.pooled.meanNetR - a.pooled.meanNetR);
for (let i = 0; i < 5; i++) {
  const h = sortedByE[i];
  const p = h.pooled;
  console.log(`${i + 1}. ${h.hypothesisId} (theta=${h.params.compressionThreshold}, K=${h.params.breakoutLookback}, v=${h.params.volumeMultiplier}):`);
  console.log(`   N = ${p.nTrades} | TP = ${p.tpPct}% | SL = ${p.slPct}% | Timeout = ${p.timeoutPct}%`);
  console.log(`   E[R] = +${p.meanNetR}R | 95% CI = [${p.ci95Lower}R, ${p.ci95Upper}R]`);
  console.log(`   p-value = ${p.pValue} | q-value = ${h.qValue} | PF = ${p.profitFactor} | MDD = -${p.mddR}R`);
}

// Top 5 Candidates with N >= 150
console.log('\n--- TOP 5 CANDIDATES WITH N >= 150 ---');
const largeN = raw.results.filter(r => r.pooled.nTrades >= 150).sort((a, b) => b.pooled.meanNetR - a.pooled.meanNetR);
for (let i = 0; i < Math.min(5, largeN.length); i++) {
  const h = largeN[i];
  const p = h.pooled;
  console.log(`${i + 1}. ${h.hypothesisId} (theta=${h.params.compressionThreshold}, K=${h.params.breakoutLookback}, v=${h.params.volumeMultiplier}):`);
  console.log(`   N = ${p.nTrades} | TP = ${p.tpPct}% | SL = ${p.slPct}% | Timeout = ${p.timeoutPct}%`);
  console.log(`   E[R] = +${p.meanNetR}R | 95% CI = [${p.ci95Lower}R, ${p.ci95Upper}R]`);
  console.log(`   p-value = ${p.pValue} | q-value = ${h.qValue} | PF = ${p.profitFactor} | MDD = -${p.mddR}R`);
}
