import fs from 'fs';

const data = JSON.parse(fs.readFileSync('replay_trades.json', 'utf8'));
console.log(`Total trades in replay_trades.json: ${data.length}`);

// Check symbols
const symbols = {};
data.forEach(t => {
  symbols[t.symbol] = (symbols[t.symbol] || 0) + 1;
});
console.log('Symbols:', symbols);

// Check if any trades have duration or calculate holding time
let validCount = 0;
let timeExitCount = 0;
data.forEach((t, i) => {
  if (t.reasonCodes && t.reasonCodes.includes('TIME_EXIT')) timeExitCount++;
  if (t.mfe !== undefined) validCount++;
});
console.log(`Trades with MFE: ${validCount}, TIME_EXIT: ${timeExitCount}`);

// Print first 5 trades
console.log('Sample trade 0:', JSON.stringify(data[0], null, 2));
