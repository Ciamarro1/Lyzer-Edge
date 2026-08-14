import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lookbacks = [10, 15, 20, 25, 30];
const results = [];

console.log("========================================");
console.log("🧪 AUTOPSY V2: SMC SENSITIVITY TEST");
console.log("========================================");

for (const lookback of lookbacks) {
    console.log(`\n[Lookback: ${lookback}] Running backtest...`);
    
    // Run the backtest script with the specific SMC_LOOKBACK
    const env = { ...process.env, SMC_LOOKBACK: lookback.toString() };
    const backtestResult = spawnSync('node', [path.join(__dirname, 'run_autopsy_backtest.js')], { env, stdio: 'inherit' });
    
    // Read the generated JSON
    const file = path.join(__dirname, '../../autopsy_trades.json');
    if (!fs.existsSync(file)) {
        console.error(`[Lookback: ${lookback}] autopsy_trades.json not found!`);
        continue;
    }
    
    const rawData = fs.readFileSync(file, 'utf8');
    const trades = JSON.parse(rawData);
    
    // Group by Trade ID
    const groupedTrades = {};
    for (const t of trades) {
        if (!t.initialStopLoss) continue;
        if (t.governanceDecision !== 'ALLOW') continue;
        
        if (!groupedTrades[t.id]) {
            groupedTrades[t.id] = {
                id: t.id,
                entryPrice: t.entryPrice,
                initialStopLoss: t.initialStopLoss,
                pnl: 0,
            };
        }
        groupedTrades[t.id].pnl += t.pnl;
    }
    
    const consolidatedTrades = Object.values(groupedTrades);
    let totalWins = 0;
    let totalRealizedR = 0;
    
    for (const t of consolidatedTrades) {
        if (t.pnl > 0) totalWins++;
        const riskDistance = Math.abs(t.entryPrice - t.initialStopLoss);
        if (riskDistance > 0) {
            const absolutePnl = t.pnl * t.entryPrice;
            totalRealizedR += absolutePnl / riskDistance;
        }
    }
    
    const numTrades = consolidatedTrades.length;
    const winRate = numTrades > 0 ? (totalWins / numTrades) * 100 : 0;
    const avgR = numTrades > 0 ? totalRealizedR / numTrades : 0;
    
    results.push({
        lookback,
        trades: numTrades,
        wr: winRate,
        avgR,
        totalR: totalRealizedR
    });
}

console.log("\n\n📊 SENSITIVITY RESULTS:\n");
console.log("| Lookback | Trades |    WR | Avg R | Total R |");
console.log("| -------: | -----: | ----: | ----: | ------: |");
for (const r of results) {
    const isBaseline = r.lookback === 20;
    const prefix = isBaseline ? "**" : "";
    const suffix = isBaseline ? "**" : "";
    console.log(`| ${prefix}${r.lookback.toString().padStart(8)}${suffix} | ${prefix}${r.trades.toString().padStart(6)}${suffix} | ${prefix}${r.wr.toFixed(2).padStart(5)}%${suffix} | ${prefix}${r.avgR.toFixed(2).padStart(5)}${suffix} | ${prefix}${r.totalR.toFixed(2).padStart(7)}${suffix} |`);
}
