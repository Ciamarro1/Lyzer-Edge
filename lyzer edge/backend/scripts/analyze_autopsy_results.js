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
    
    let totalWins = 0;
    let totalLosses = 0;
    
    const winMFE = [];
    const winMAE = [];
    const lossMFE = [];
    const lossMAE = [];
    
    let lossExceeded05R = 0;
    let lossExceeded1R = 0;
    let lossExceeded2R = 0;
    
    let totalR = 0;
    
    let netPnl = 0;
    
    for (const t of trades) {
        if (!t.initialStopLoss) continue; // Skip malformed
        if (t.governanceDecision !== 'ALLOW') continue; // Only process ALLOWED trades
        
        const isWin = t.pnl > 0;
        netPnl += t.pnl;
        
        if (isWin) totalWins++;
        else totalLosses++;
        
        const mfePct = t.mfe * 100;
        const maePct = t.mae * 100;
        
        if (isWin) {
            winMFE.push(mfePct);
            winMAE.push(maePct);
        } else {
            lossMFE.push(mfePct);
            lossMAE.push(maePct);
            
            // Calculate R
            const riskDistance = Math.abs(t.entryPrice - t.initialStopLoss);
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
    console.log(`🔍 AUTOPSY OF ${trades.length} TRADES (REGIME ENGINE)`);
    console.log(`================================`);
    
    const winRate = (totalWins / (totalWins + totalLosses)) * 100;
    console.log(`Total Wins:   ${totalWins}`);
    console.log(`Total Losses: ${totalLosses}`);
    console.log(`Win Rate:     ${winRate.toFixed(2)}%`);
    console.log(`Net PnL:      ${(netPnl * 100).toFixed(2)}% (Cumulative Base)`);
    
    console.log(`\n--- VENCEDORES ---`);
    console.log(`MFE Mediano: +${median(winMFE).toFixed(2)}%`);
    console.log(`MAE Mediano: ${median(winMAE).toFixed(2)}%`);
    
    console.log(`\n--- PERDEDORES ---`);
    console.log(`MFE Mediano: +${median(lossMFE).toFixed(2)}%`);
    console.log(`MAE Mediano: ${median(lossMAE).toFixed(2)}%`);
    
    console.log(`\n--- RADIOGRAFIA DAS PERDAS ---`);
    console.log(`Quantos perdedores chegaram a +0.5R antes de morrer? ${lossExceeded05R} (${((lossExceeded05R/totalLosses)*100).toFixed(1)}%)`);
    console.log(`Quantos perdedores chegaram a +1.0R antes de morrer? ${lossExceeded1R} (${((lossExceeded1R/totalLosses)*100).toFixed(1)}%)`);
    console.log(`Quantos perdedores chegaram a +2.0R antes de morrer? ${lossExceeded2R} (${((lossExceeded2R/totalLosses)*100).toFixed(1)}%)`);
    console.log(`================================\n`);
}

runAutopsy();
