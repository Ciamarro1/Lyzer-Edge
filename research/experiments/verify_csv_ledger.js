import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../results/v5_confirmatory/V5_CELL_A_25_TRADES_AUDIT_LEDGER.csv');
const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');

const header = lines[0].split(',');
const rows = lines.slice(1).map(l => l.split(','));

let sumGross = 0;
let sumFees = 0;
let sumSlip = 0;
let sumFriction = 0;
let sumNet = 0;
let wins = 0;
let losses = 0;
let netGain = 0;
let netLoss = 0;

console.log('='.repeat(80));
console.log('AUDITING EXACT CSV ROWS FROM DISK:');
console.log('='.repeat(80));

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const tradeId = parseInt(r[0]);
  const gross = parseFloat(r[14]);
  const fees = parseFloat(r[15]);
  const slip = parseFloat(r[16]);
  const friction = parseFloat(r[17]);
  const net = parseFloat(r[18]);
  const isWin = r[19] === 'true';

  sumGross += gross;
  sumFees += fees;
  sumSlip += slip;
  sumFriction += friction;
  sumNet += net;

  if (net > 0) {
    wins++;
    netGain += net;
  } else {
    losses++;
    netLoss += Math.abs(net);
  }

  const identity = Math.abs((gross - friction) - net) < 0.001;
  console.log(`Trade #${String(tradeId).padStart(2)}: Gross: $${String(gross.toFixed(2)).padStart(6)} - Friction: $${friction.toFixed(2)} (Fees: $${fees.toFixed(2)} + Slip: $${slip.toFixed(2)}) = Net: $${String(net.toFixed(2)).padStart(6)} | Win: ${isWin ? 'YES' : 'NO '} | Identity: ${identity ? 'PASS' : 'FAIL'}`);
}

console.log('='.repeat(80));
console.log(`TOTALS AUDITED DIRECTLY FROM CSV FILE:`);
console.log(`  Total Rows (N)        : ${rows.length}`);
console.log(`  Sum True Gross PnL    : +$${sumGross.toFixed(2)}`);
console.log(`  Sum Exchange Fees     :  $${sumFees.toFixed(2)}`);
console.log(`  Sum Slippage Cost     :  $${sumSlip.toFixed(2)}`);
console.log(`  Sum Total Friction    :  $${sumFriction.toFixed(2)}`);
console.log(`  Sum True Net PnL      : +$${sumNet.toFixed(2)}`);
console.log(`  Net Expectancy / Trade: +$${(sumNet / rows.length).toFixed(3)} (+${(((sumNet / rows.length)/1000)*100).toFixed(3)}%)`);
console.log(`  Wins / Losses         : ${wins} wins / ${losses} losses (Win Rate: ${((wins/rows.length)*100).toFixed(2)}%)`);
console.log(`  Net Profit Factor     : ${(netGain / netLoss).toFixed(2)} (Net Gains: $${netGain.toFixed(2)} / Net Losses: $${netLoss.toFixed(2)})`);
console.log(`  Identity Check        : Sum(Gross) - Sum(Friction) = $${(sumGross - sumFriction).toFixed(2)} vs Sum(Net) = $${sumNet.toFixed(2)} -> Diff = $${Math.abs((sumGross - sumFriction) - sumNet).toFixed(4)}`);
