const fs = require('fs/promises');
const path = require('path');

const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];
const directory = 'C:\\Users\\WDAGUtilityAccount\\.gemini\\antigravity\\scratch\\Lyzer-Edge\\lyzer edge';

async function runAnalysis() {
    console.log("=== FINANCIAL PNL ANALYSIS RUNNING ===");
    
    let totalGrossProfit = 0;
    let totalGrossLoss = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;
    
    let totalWinDurationMs = 0;
    let totalLossDurationMs = 0;

    let overallNetPnl = 0;
    
    const assetStats = {};

    for (const sym of symbols) {
        const filepath = path.join(directory, `naked_trades_${sym}.json`);
        try {
            const rawData = await fs.readFile(filepath, 'utf8');
            const trades = JSON.parse(rawData);
            
            let grossProfit = 0;
            let grossLoss = 0;
            let wins = 0;
            let losses = 0;
            let finalWallet = 10000;
            
            for (const t of trades) {
                if (t.result === 'WIN') {
                    grossProfit += t.pnl;
                    wins++;
                    totalWinDurationMs += t.durationMs;
                } else {
                    grossLoss += Math.abs(t.pnl);
                    losses++;
                    totalLossDurationMs += t.durationMs;
                }
                finalWallet = t.walletBalance;
            }
            
            totalGrossProfit += grossProfit;
            totalGrossLoss += grossLoss;
            totalWins += wins;
            totalLosses += losses;
            totalTrades += trades.length;
            
            const netPnl = grossProfit - grossLoss;
            overallNetPnl += netPnl;
            
            const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 'Infinity';
            
            assetStats[sym] = {
                trades: trades.length,
                finalWallet: finalWallet.toFixed(2),
                netPnl: netPnl.toFixed(2),
                profitFactor,
                winRate: trades.length > 0 ? ((wins / trades.length) * 100).toFixed(2) + '%' : '0%'
            };
            
        } catch (e) {
            console.log(`File not found or error for ${sym}: ${e.message}`);
        }
    }

    console.log("\n=== ASSET PERFORMANCE ===");
    for (const [sym, stat] of Object.entries(assetStats)) {
        console.log(`${sym}: Trades: ${stat.trades} | Final Wallet: $${stat.finalWallet} | Net PnL: $${stat.netPnl} | PF: ${stat.profitFactor} | WR: ${stat.winRate}`);
    }
    
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) : 0;
    const avgWin = totalWins > 0 ? (totalGrossProfit / totalWins) : 0;
    const avgLoss = totalLosses > 0 ? (totalGrossLoss / totalLosses) : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    
    const overallPf = totalGrossLoss > 0 ? (totalGrossProfit / totalGrossLoss).toFixed(2) : 'Infinity';
    
    const avgWinDurationMins = totalWins > 0 ? (totalWinDurationMs / totalWins / 60000).toFixed(1) : 0;
    const avgLossDurationMins = totalLosses > 0 ? (totalLossDurationMs / totalLosses / 60000).toFixed(1) : 0;

    console.log("\n=== OVERALL METRICS ===");
    console.log(`Total Trades: ${totalTrades}`);
    console.log(`Total Gross Profit: $${totalGrossProfit.toFixed(2)}`);
    console.log(`Total Gross Loss: $${totalGrossLoss.toFixed(2)}`);
    console.log(`Overall Net PnL: $${overallNetPnl.toFixed(2)}`);
    console.log(`Overall Profit Factor: ${overallPf}`);
    console.log(`Overall Win Rate: ${(winRate * 100).toFixed(2)}%`);
    console.log(`Expectancy per trade: $${expectancy.toFixed(2)}`);
    console.log(`Avg Win Duration: ${avgWinDurationMins} minutes`);
    console.log(`Avg Loss Duration: ${avgLossDurationMins} minutes`);
}

runAnalysis().catch(console.error);
