import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

function calculateSMA(data, period, key = 'close') {
  if (data.length < period) return null;
  let sum = 0;
  for (let i = data.length - period; i < data.length; i++) {
    sum += data[i][key];
  }
  return sum / period;
}

function calculateATR(data, period) {
  if (data.length < period + 1) return null;
  let trSum = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
}

async function main() {
  console.log("====================================================");
  console.log("🔬 EXPERIMENT 2: SIGNAL AUTOPSY (T0)");
  console.log("====================================================\n");

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const trades = lines.map(l => JSON.parse(l));
  
  const bySymbol = {};
  trades.forEach(t => {
    const sym = t.TRADE_ID.split('_')[1];
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(t);
  });

  const assetStats = {};
  const allTradesStats = [];
  
  let totalHits05 = { fav: 0, adv: 0 };
  let totalHits08 = { fav: 0, adv: 0 };
  let totalHits10 = { fav: 0, adv: 0 };

  for (const sym of Object.keys(bySymbol)) {
    const file = path.join(dataDir, `${sym}_audit_klines.json`);
    if (!fs.existsSync(file)) continue;
    const candles = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    assetStats[sym] = {
      count: 0,
      ret5m: 0, ret15m: 0, ret30m: 0,
      mfeR: 0, maeR: 0
    };

    for (const trade of bySymbol[sym]) {
      const entryTs = trade.SIGNAL.timestamp * 1000;
      const entryIdx = candles.findIndex(c => c.openTime === entryTs);
      if (entryIdx < 20) continue; // Need history for T0 features
      
      const entryPrice = trade.PREDICTION.entry;
      const isLong = trade.SIGNAL.direction === 'LONG';
      const slDistPct = (trade.PREDICTION.sl_distance_bps || 25) / 10000;
      
      // Calculate T0 Features
      const histCandles = candles.slice(0, entryIdx + 1);
      const sma20 = calculateSMA(histCandles, 20, 'close');
      const sma20Vol = calculateSMA(histCandles, 20, 'volume');
      const atr14 = calculateATR(histCandles, 14);
      
      const volRatio = sma20Vol > 0 ? candles[entryIdx].volume / sma20Vol : 1;
      const distSma20 = sma20 > 0 ? Math.abs(entryPrice - sma20) / sma20 : 0;
      const atrPct = atr14 / entryPrice;
      const hour = new Date(entryTs).getUTCHours();
      
      // Excursion Probabilities
      let hit05 = null, hit08 = null, hit10 = null;
      let maxF = entryPrice, maxA = entryPrice;
      
      // Fixed returns
      const getRet = (min) => {
        if (entryIdx + min >= candles.length) return 0;
        const cp = candles[entryIdx + min].close;
        const r = isLong ? (cp - entryPrice)/entryPrice : (entryPrice - cp)/entryPrice;
        return r / slDistPct; // In R
      };
      
      const r5 = getRet(5);
      const r15 = getRet(15);
      const r30 = getRet(30);

      // 60-min window for MFE/MAE and hits
      for (let t = 1; t <= 60; t++) {
        if (entryIdx + t >= candles.length) break;
        const c = candles[entryIdx + t];
        
        let highR = isLong ? (c.high - entryPrice)/entryPrice/slDistPct : (entryPrice - c.low)/entryPrice/slDistPct;
        let lowR = isLong ? (c.low - entryPrice)/entryPrice/slDistPct : (entryPrice - c.high)/entryPrice/slDistPct;
        
        if (highR > (isLong ? (maxF - entryPrice)/entryPrice/slDistPct : (entryPrice - maxF)/entryPrice/slDistPct)) {
           maxF = isLong ? c.high : c.low;
        }
        if (lowR < (isLong ? (c.low - entryPrice)/entryPrice/slDistPct : (entryPrice - c.high)/entryPrice/slDistPct)) {
           // update MAE
           // Wait, simpler way:
        }
        
        // Simpler:
        const mfeCurrentR = isLong ? (c.high - entryPrice)/entryPrice/slDistPct : (entryPrice - c.low)/entryPrice/slDistPct;
        const maeCurrentR = isLong ? (c.low - entryPrice)/entryPrice/slDistPct : (entryPrice - c.high)/entryPrice/slDistPct;
        
        // Track hit order
        if (!hit05) {
          if (mfeCurrentR >= 0.5) hit05 = 'fav';
          else if (maeCurrentR <= -0.5) hit05 = 'adv';
        }
        if (!hit08) {
          if (mfeCurrentR >= 0.8) hit08 = 'fav';
          else if (maeCurrentR <= -0.8) hit08 = 'adv';
        }
        if (!hit10) {
          if (mfeCurrentR >= 1.0) hit10 = 'fav';
          else if (maeCurrentR <= -1.0) hit10 = 'adv';
        }
      }
      
      // Calculate final MFE/MAE up to 60m
      let finalMfeR = 0, finalMaeR = 0;
      for (let t = 1; t <= 60; t++) {
         if (entryIdx + t >= candles.length) break;
         const c = candles[entryIdx + t];
         const cMfe = isLong ? (c.high - entryPrice)/entryPrice/slDistPct : (entryPrice - c.low)/entryPrice/slDistPct;
         const cMae = isLong ? (c.low - entryPrice)/entryPrice/slDistPct : (entryPrice - c.high)/entryPrice/slDistPct;
         if (cMfe > finalMfeR) finalMfeR = cMfe;
         if (cMae < finalMaeR) finalMaeR = cMae;
      }
      
      if (hit05 === 'fav') totalHits05.fav++; else totalHits05.adv++;
      if (hit08 === 'fav') totalHits08.fav++; else totalHits08.adv++;
      if (hit10 === 'fav') totalHits10.fav++; else totalHits10.adv++;

      assetStats[sym].count++;
      assetStats[sym].ret5m += r5;
      assetStats[sym].ret15m += r15;
      assetStats[sym].ret30m += r30;
      assetStats[sym].mfeR += finalMfeR;
      assetStats[sym].maeR += finalMaeR;

      allTradesStats.push({
        id: trade.TRADE_ID,
        sym,
        isLong,
        hour,
        regime: trade.SIGNAL.regime,
        volRatio,
        distSma20,
        atrPct,
        finalMfeR,
        finalMaeR,
        isWinner: hit10 === 'fav' // Reaches +1.0R before -1.0R
      });
    }
  }

  // Generate Report
  const reportPath = path.join(edgeDir, 'experiment_2_entry_autopsy.md');
  let md = `# 🔬 EXPERIMENTO 2: Autópsia da Entrada (T0)\n\n`;
  md += `**Dataset:** 64 Railway Trades\n`;
  
  md += `## 1. Directional Excursion Probability\n\n`;
  md += `Dos 64 sinais, qual alvo foi atingido PRIMEIRO (Fator direcional vs Ruído):\n\n`;
  md += `- **+0.5R antes de -0.5R:** ${totalHits05.fav} trades (${((totalHits05.fav/64)*100).toFixed(1)}%)\n`;
  md += `- **+0.8R antes de -0.8R:** ${totalHits08.fav} trades (${((totalHits08.fav/64)*100).toFixed(1)}%)\n`;
  md += `- **+1.0R antes de -1.0R:** ${totalHits10.fav} trades (${((totalHits10.fav/64)*100).toFixed(1)}%)\n\n`;
  
  md += `## 2. Decomposição por Ativo\n\n`;
  md += `| Ativo | Qtd | Avg MFE (60m) | Avg MAE (60m) | Retorno +5m | Retorno +15m | Retorno +30m |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  
  for (const sym of Object.keys(assetStats)) {
    const s = assetStats[sym];
    if (s.count === 0) continue;
    md += `| ${sym} | ${s.count} | +${(s.mfeR/s.count).toFixed(2)}R | ${(s.maeR/s.count).toFixed(2)}R | ${(s.ret5m/s.count).toFixed(2)}R | ${(s.ret15m/s.count).toFixed(2)}R | ${(s.ret30m/s.count).toFixed(2)}R |\n`;
  }
  
  md += `\n## 3. Separação de Features (Winners vs Losers em T0)\n\n`;
  md += `*Winner = Atinge +1.0R antes de atingir -1.0R.*\n\n`;
  
  const winners = allTradesStats.filter(t => t.isWinner);
  const losers = allTradesStats.filter(t => !t.isWinner);
  
  const avgW = {
    volRatio: winners.reduce((s,t) => s + t.volRatio, 0) / winners.length,
    distSma20: winners.reduce((s,t) => s + t.distSma20, 0) / winners.length,
    atrPct: winners.reduce((s,t) => s + t.atrPct, 0) / winners.length
  };
  
  const avgL = {
    volRatio: losers.reduce((s,t) => s + t.volRatio, 0) / losers.length,
    distSma20: losers.reduce((s,t) => s + t.distSma20, 0) / losers.length,
    atrPct: losers.reduce((s,t) => s + t.atrPct, 0) / losers.length
  };
  
  md += `| Feature (T0) | Winners (N=${winners.length}) | Losers (N=${losers.length}) | Δ | Separação? |\n`;
  md += `|---|---|---|---|---|\n`;
  md += `| Volume Ratio (vs SMA20) | ${avgW.volRatio.toFixed(2)}x | ${avgL.volRatio.toFixed(2)}x | ${((avgW.volRatio/avgL.volRatio - 1)*100).toFixed(1)}% | ${Math.abs(avgW.volRatio/avgL.volRatio - 1) > 0.1 ? 'SIM' : 'NÃO'} |\n`;
  md += `| Distância da SMA20 (%) | ${(avgW.distSma20*100).toFixed(2)}% | ${(avgL.distSma20*100).toFixed(2)}% | ${((avgW.distSma20/avgL.distSma20 - 1)*100).toFixed(1)}% | ${Math.abs(avgW.distSma20/avgL.distSma20 - 1) > 0.1 ? 'SIM' : 'NÃO'} |\n`;
  md += `| Volatilidade Relativa (ATR%) | ${(avgW.atrPct*100).toFixed(2)}% | ${(avgL.atrPct*100).toFixed(2)}% | ${((avgW.atrPct/avgL.atrPct - 1)*100).toFixed(1)}% | ${Math.abs(avgW.atrPct/avgL.atrPct - 1) > 0.1 ? 'SIM' : 'NÃO'} |\n`;
  
  fs.writeFileSync(reportPath, md);
  console.log(md);
  console.log(`\nReport saved to ${reportPath}`);
}

main().catch(console.error);
