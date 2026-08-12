import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYMBOL = 'BTCUSDT';
const STARTING_WALLET = 10000;
const SLIPPAGE_PCT = 0.0005; // 0.05% per leg -> 0.1% total

const ablations = ['PERFECT', 'MINUS_LHDS', 'MINUS_GOLDEN_HOURS', 'MINUS_BE', 'MINUS_TRAILING'];

for (const name of ablations) {
    const file = path.join(__dirname, `../../ablation_${name}_${SYMBOL}.json`);
    if (!fs.existsSync(file)) {
        console.log(`Waiting for ${name}...`);
        continue;
    }
    
    const rawData = fs.readFileSync(file, 'utf8');
    const trades = JSON.parse(rawData);
    
    let wallet = STARTING_WALLET;
    let wins = 0;
    let losses = 0;
    let bes = 0;
    
    // De-duplicate trades that might have been emitted twice
    const uniqueTrades = [];
    const seen = new Set();
    for (const t of trades) {
        const timeKey = t.index || t.timestamp;
        const id = `${timeKey}_${t.direction}`;
        if (!seen.has(id)) {
            seen.add(id);
            uniqueTrades.push(t);
        }
    }
    
    for (const t of uniqueTrades) {
        let parsedPnl = 0;
        if (typeof t.pnl === 'string') {
            parsedPnl = parseFloat(t.pnl.replace('%', '')) / 100;
        } else {
            parsedPnl = t.pnl;
        }
        
        const absolutePnl = parsedPnl * wallet;
        const slippagePenalty = wallet * (SLIPPAGE_PCT * 2);
        const finalPnl = absolutePnl - slippagePenalty;
        
        // If the trade closed at entry (0.00%), it was a BE stop, but slippage turned it into a small loss.
        // We classify it as BE for structural stats, even though finalPnl is negative.
        if (Math.abs(parsedPnl) < 0.0001) bes++;
        else if (finalPnl > 0) wins++;
        else losses++;
        
        wallet += finalPnl;
    }
    
    const total = wins + losses + bes;
    const wr = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;
    const netPnl = wallet - STARTING_WALLET;
    
    console.log(`\n============================`);
    console.log(`[${name}] FINAL RESULTS:`);
    console.log(`============================`);
    console.log(`Total Trades : ${total}`);
    console.log(`Wins         : ${wins}`);
    console.log(`Losses       : ${losses}`);
    console.log(`Break-Even   : ${bes}`);
    console.log(`Win Rate     : ${wr}%`);
    console.log(`Net PnL      : $${netPnl.toFixed(2)}`);
    console.log(`Final Wallet : $${wallet.toFixed(2)}`);
}
