import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function median(arr) {
    if (arr.length === 0) return 0;
    arr.sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function runAutopsy() {
    const file = path.join(__dirname, '../../autopsy_trades.json');
    if (!fs.existsSync(file)) {
        console.error("autopsy_trades.json not found!");
        return;
    }
    
    const rawData = fs.readFileSync(file, 'utf8');
    const trades = JSON.parse(rawData);
    
    // Group by Trade ID to support future partial fills (Scale-Out)
    const groupedTrades = {};
    
    for (const t of trades) {
        if (!t.initialStopLoss) continue; // Skip malformed
        if (t.governanceDecision !== 'ALLOW') continue; // Only process ALLOWED trades
        
        if (!groupedTrades[t.id]) {
            groupedTrades[t.id] = {
                id: t.id,
                direction: t.direction,
                entryPrice: t.entryPrice,
                initialStopLoss: t.initialStopLoss,
                pnl: 0,
                mfe: 0,
                mae: 0
            };
        }
        
        groupedTrades[t.id].pnl += t.pnl;
        if (t.mfe > groupedTrades[t.id].mfe) groupedTrades[t.id].mfe = t.mfe;
        if (t.mae < groupedTrades[t.id].mae) groupedTrades[t.id].mae = t.mae;
    }
    
    const consolidatedTrades = Object.values(groupedTrades);
    
    let totalWins = 0;
    let totalLosses = 0;
    
    const winMFE = [];
    const winMAE = [];
    const lossMFE = [];
    const lossMAE = [];
    
    let lossExceeded05R = 0;
    let lossExceeded1R = 0;
    let lossExceeded2R = 0;
    
    let netPnl = 0;
    let totalRealizedR = 0;
    
    // R Distribution Buckets
    const rBuckets = {
        '<= -1R': 0,
        '> -1R to < 0R': 0,
        '0R to < 0.5R': 0,
        '0.5R to < 1.0R': 0,
        '1.0R to < 1.5R': 0,
        '>= 1.5R': 0
    };
    
    for (const t of consolidatedTrades) {
        const isWin = t.pnl > 0;
        netPnl += t.pnl;
        
        const riskDistance = Math.abs(t.entryPrice - t.initialStopLoss);
        let realizedR = 0;
        
        if (riskDistance > 0) {
            const absolutePnl = t.pnl * t.entryPrice;
            realizedR = absolutePnl / riskDistance;
        }
        
        totalRealizedR += realizedR;
        
        // Bucket Realized R
        if (realizedR <= -1.0) rBuckets['<= -1R']++;
        else if (realizedR < 0) rBuckets['> -1R to < 0R']++;
        else if (realizedR < 0.5) rBuckets['0R to < 0.5R']++;
        else if (realizedR < 1.0) rBuckets['0.5R to < 1.0R']++;
        else if (realizedR < 1.5) rBuckets['1.0R to < 1.5R']++;
        else rBuckets['>= 1.5R']++;

        if (isWin) {
            totalWins++;
            winMFE.push(t.mfe * 100);
            winMAE.push(t.mae * 100);
        } else {
            totalLosses++;
            lossMFE.push(t.mfe * 100);
            lossMAE.push(t.mae * 100);
            
            if (riskDistance > 0) {
                const mfeAbsolute = t.mfe * t.entryPrice;
                const rExcursion = mfeAbsolute / riskDistance;
                if (rExcursion >= 0.5) lossExceeded05R++;
                if (rExcursion >= 1.0) lossExceeded1R++;
                if (rExcursion >= 2.0) lossExceeded2R++;
            }
        }
    }
    
    console.log(`\n================================`);
    console.log(`🔍 AUTOPSY OF ${consolidatedTrades.length} TRADES (REGIME ENGINE)`);
    console.log(`================================`);
    
    const totalTrades = totalWins + totalLosses;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    
    console.log(`Total Wins:   ${totalWins}`);
    console.log(`Total Losses: ${totalLosses}`);
    console.log(`Win Rate:     ${winRate.toFixed(2)}%`);
    console.log(`Net PnL:      ${(netPnl * 100).toFixed(2)}% (Cumulative Base)`);
    console.log(`Total R:      ${totalRealizedR.toFixed(2)}R`);
    console.log(`Avg R/Trade:  ${totalTrades > 0 ? (totalRealizedR / totalTrades).toFixed(2) : 0}R`);
    
    console.log(`\n--- DISTRIBUIÇÃO DE REALIZED R ---`);
    console.log(`<= -1R:         ${rBuckets['<= -1R']}`);
    console.log(`> -1R to < 0R:  ${rBuckets['> -1R to < 0R']}`);
    console.log(`0R to < 0.5R:   ${rBuckets['0R to < 0.5R']}`);
    console.log(`0.5R to < 1.0R: ${rBuckets['0.5R to < 1.0R']}`);
    console.log(`1.0R to < 1.5R: ${rBuckets['1.0R to < 1.5R']}`);
    console.log(`>= 1.5R:        ${rBuckets['>= 1.5R']}`);

    console.log(`\n--- VENCEDORES ---`);
    console.log(`MFE Mediano: +${median(winMFE).toFixed(2)}%`);
    console.log(`MAE Mediano: ${median(winMAE).toFixed(2)}%`);
    
    console.log(`\n--- PERDEDORES ---`);
    console.log(`MFE Mediano: +${median(lossMFE).toFixed(2)}%`);
    console.log(`MAE Mediano: ${median(lossMAE).toFixed(2)}%`);
    
    console.log(`\n--- RADIOGRAFIA DAS PERDAS ---`);
    if (totalLosses > 0) {
        console.log(`Quantos perdedores chegaram a +0.5R antes de morrer? ${lossExceeded05R} (${((lossExceeded05R/totalLosses)*100).toFixed(1)}%)`);
        console.log(`Quantos perdedores chegaram a +1.0R antes de morrer? ${lossExceeded1R} (${((lossExceeded1R/totalLosses)*100).toFixed(1)}%)`);
        console.log(`Quantos perdedores chegaram a +2.0R antes de morrer? ${lossExceeded2R} (${((lossExceeded2R/totalLosses)*100).toFixed(1)}%)`);
    } else {
        console.log(`Nenhuma perda registrada.`);
    }
    console.log(`================================\n`);
}

runAutopsy();
