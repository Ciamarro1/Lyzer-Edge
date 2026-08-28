import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../results/v5_confirmatory/V5_CELL_A_REBUILT_LEDGER.csv');
const rows = readFileSync(csvPath, 'utf-8').trim().split('\n').slice(1).map(l => {
  const parts = l.split(',');
  return {
    netPnL: parseFloat(parts[18])
  };
});

const n = rows.length;
const iters = 10000;
const bootExpectancy = [];
const bootPF = [];
const bootWR = [];

for (let b = 0; b < iters; b++) {
  const sample = [];
  for (let i = 0; i < n; i++) {
    sample.push(rows[Math.floor(Math.random() * n)].netPnL);
  }
  const mean = sample.reduce((s, x) => s + x, 0) / n;
  const wins = sample.filter(x => x > 0);
  const losses = sample.filter(x => x <= 0);
  const wSum = wins.reduce((s, x) => s + x, 0);
  const lSum = Math.abs(losses.reduce((s, x) => s + x, 0));
  const pf = lSum > 0 ? (wSum / lSum) : (wSum > 0 ? 10 : 0);
  const wr = (wins.length / n) * 100;

  bootExpectancy.push(mean);
  bootPF.push(pf);
  bootWR.push(wr);
}

bootExpectancy.sort((a, b) => a - b);
bootPF.sort((a, b) => a - b);
bootWR.sort((a, b) => a - b);

const ciExp = [bootExpectancy[Math.floor(iters * 0.025)], bootExpectancy[Math.floor(iters * 0.975)]];
const ciPF = [bootPF[Math.floor(iters * 0.025)], bootPF[Math.floor(iters * 0.975)]];
const ciWR = [bootWR[Math.floor(iters * 0.025)], bootWR[Math.floor(iters * 0.975)]];

console.log('='.repeat(80));
console.log('BOOTSTRAP 10,000 METRICS (GATE D):');
console.log('='.repeat(80));
console.log(`Expectancy IC95% : [$${ciExp[0].toFixed(3)}, $${ciExp[1].toFixed(3)}]`);
console.log(`Profit Factor IC95%: [${ciPF[0].toFixed(2)}, ${ciPF[1].toFixed(2)}]`);
console.log(`Win Rate IC95%   : [${ciWR[0].toFixed(1)}%, ${ciWR[1].toFixed(1)}%]`);
