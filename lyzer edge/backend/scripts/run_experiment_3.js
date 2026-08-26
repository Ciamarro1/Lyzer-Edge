import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

const FRICTION = 0.0004;

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
  console.log("🧬 EXPERIMENT 3: PURIFICATION MATRIX & LOO VALIDATION");
  console.log("====================================================\n");

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const rawTrades = lines.map(l => JSON.parse(l));
  
  const trades = [];
  const totalWinners = 0;
  const totalLosers = 0;

  // 1. Precompute Data
  for (const t of rawTrades) {
    const sym = t.TRADE_ID.split('_')[1];
    const file = path.join(dataDir, `${sym}_audit_klines.json`);
    if (!fs.existsSync(file)) continue;
    const candles = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    const entryTs = t.SIGNAL.timestamp * 1000;
    const entryIdx = candles.findIndex(c => c.openTime === entryTs);
    if (entryIdx < 20) continue;
    
    const entryPrice = t.PREDICTION.entry;
    const isLong = t.SIGNAL.direction === 'LONG';
    const notional = entryPrice * t.EXECUTION.filled_quantity;
    const slDistPct = (t.PREDICTION.sl_distance_bps || 25) / 10000;
    
    // T0 Features
    const histCandles = candles.slice(0, entryIdx + 1);
    const sma20 = calculateSMA(histCandles, 20, 'close');
    const atr14 = calculateATR(histCandles, 14);
    
    const distSma20 = sma20 > 0 ? Math.abs(entryPrice - sma20) / sma20 : 0;
    const atrPct = atr14 / entryPrice;
    
    // Winner/Loser based on +1R before -1R
    let isWinner = false;
    let hit10 = null;
    
    for (let i = 1; i <= 60; i++) {
      if (entryIdx + i >= candles.length) break;
      const c = candles[entryIdx + i];
      const mfeCurrentR = isLong ? (c.high - entryPrice)/entryPrice/slDistPct : (entryPrice - c.low)/entryPrice/slDistPct;
      const maeCurrentR = isLong ? (c.low - entryPrice)/entryPrice/slDistPct : (entryPrice - c.high)/entryPrice/slDistPct;
      
      if (!hit10) {
        if (mfeCurrentR >= 1.0) hit10 = 'fav';
        else if (maeCurrentR <= -1.0) hit10 = 'adv';
      }
    }
    isWinner = hit10 === 'fav';
    
    // Simulate Exp 1B (15m Time Exit + SL + 0.8R BE, no scale-out)
    const slPrice = isLong ? entryPrice * (1 - slDistPct) : entryPrice * (1 + slDistPct);
    const beTriggerPrice = isLong ? entryPrice * (1 + (slDistPct * 0.8)) : entryPrice * (1 - (slDistPct * 0.8));
    const beExitPrice = isLong ? entryPrice * 1.0004 : entryPrice * 0.9996;
    
    let be_armed = false;
    let exited = false;
    let exitPrice = 0;
    let exitReason = '';
    
    for (let i = 1; i <= 15; i++) {
      if (entryIdx + i >= candles.length) {
         exitReason = 'TIME';
         exitPrice = candles[candles.length-1].close;
         break;
      }
      const c = candles[entryIdx + i];
      
      if (!be_armed) {
         if (isLong && c.high >= beTriggerPrice) be_armed = true;
         else if (!isLong && c.low <= beTriggerPrice) be_armed = true;
      }
      
      const currentStop = be_armed ? beExitPrice : slPrice;
      if (isLong && c.low <= currentStop) {
         exitPrice = currentStop;
         exitReason = be_armed ? 'BE' : 'SL';
         exited = true; break;
      } else if (!isLong && c.high >= currentStop) {
         exitPrice = currentStop;
         exitReason = be_armed ? 'BE' : 'SL';
         exited = true; break;
      }
    }
    
    if (!exited && !exitReason) {
       exitReason = 'TIME';
       exitPrice = candles[Math.min(entryIdx + 15, candles.length-1)].close;
    }
    
    const pnlPct = isLong ? (exitPrice - entryPrice)/entryPrice : (entryPrice - exitPrice)/entryPrice;
    const netPnlUsd = (pnlPct - FRICTION) * notional;
    
    trades.push({
      id: t.TRADE_ID,
      sym,
      distSma20: distSma20 * 100, // convert to %
      atrPct: atrPct * 100, // convert to %
      isWinner,
      netPnlUsd,
      isGrossWin: netPnlUsd > 0.05,
      isGrossLoss: netPnlUsd < -0.05
    });
  }
  
  const totalW = trades.filter(t => t.isWinner).length;
  const totalL = trades.length - totalW;

  // Helper to evaluate a filter
  function evaluateFilter(filterFn, tradeSet = trades) {
    let kept = 0, remW = 0, remL = 0;
    let grossP = 0, grossL = 0;
    let netPnl = 0;
    
    tradeSet.forEach(t => {
      if (filterFn(t)) {
        kept++;
        netPnl += t.netPnlUsd;
        if (t.isGrossWin) grossP += t.netPnlUsd;
        if (t.isGrossLoss) grossL += Math.abs(t.netPnlUsd);
      } else {
        if (t.isWinner) remW++; else remL++;
      }
    });
    
    const pf = grossL > 0 ? grossP / grossL : (grossP > 0 ? 99.99 : 0);
    const wr = kept > 0 ? (tradeSet.filter(t => filterFn(t) && t.isGrossWin).length / kept) * 100 : 0;
    
    return { kept, remW, remL, netPnl, pf, wr };
  }

  // 2. Grids
  const smaGrid = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40];
  const atrGrid = [0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20];

  const results = [];
  
  // Model 0: Baseline
  results.push({ name: 'Model 0 (Baseline)', ...evaluateFilter(() => true) });
  
  // Model 1: ADA OFF
  results.push({ name: 'Model 1 (ADA OFF)', ...evaluateFilter(t => t.sym !== 'ADAUSDT') });
  
  // Model 2: SOL/XRP OFF
  results.push({ name: 'Model 2 (SOL/XRP OFF)', ...evaluateFilter(t => !['SOLUSDT', 'XRPUSDT'].includes(t.sym)) });
  
  // Matrix Sweeps
  const sweepResults = [];
  for (const s of smaGrid) {
    for (const a of atrGrid) {
       const res = evaluateFilter(t => t.distSma20 <= s && t.atrPct <= a);
       sweepResults.push({ s, a, ...res });
    }
  }
  
  // Best Matrix Models
  sweepResults.sort((a, b) => b.netPnl - a.netPnl);
  const bestSmaAtr = sweepResults[0];
  results.push({ name: `Model 5 (SMA < ${bestSmaAtr.s}% + ATR < ${bestSmaAtr.a}%)`, ...bestSmaAtr });

  const bestSma = smaGrid.map(s => ({ s, ...evaluateFilter(t => t.distSma20 <= s) })).sort((a,b) => b.netPnl - a.netPnl)[0];
  results.push({ name: `Model 3 (SMA < ${bestSma.s}%)`, ...bestSma });

  const bestAtr = atrGrid.map(a => ({ a, ...evaluateFilter(t => t.atrPct <= a) })).sort((a,b) => b.netPnl - a.netPnl)[0];
  results.push({ name: `Model 4 (ATR < ${bestAtr.a}%)`, ...bestAtr });
  
  // 3. Leave-One-Out (LOO) Validation
  let looNetPnl = 0;
  let looWins = 0, looLosses = 0;
  let looGrossP = 0, looGrossL = 0;
  let looKept = 0;

  for (let i = 0; i < trades.length; i++) {
    const testTrade = trades[i];
    const trainTrades = trades.filter((_, idx) => idx !== i);
    
    // Find best combination on trainTrades
    let bestTrainPnl = -Infinity;
    let bestTrainS = 0.40;
    let bestTrainA = 0.20;
    
    for (const s of smaGrid) {
      for (const a of atrGrid) {
        const trRes = evaluateFilter(t => t.distSma20 <= s && t.atrPct <= a, trainTrades);
        // Optimize for PF > 1.2, else Max PnL
        if (trRes.netPnl > bestTrainPnl) {
          bestTrainPnl = trRes.netPnl;
          bestTrainS = s;
          bestTrainA = a;
        }
      }
    }
    
    // Apply to testTrade
    if (testTrade.distSma20 <= bestTrainS && testTrade.atrPct <= bestTrainA) {
       looKept++;
       looNetPnl += testTrade.netPnlUsd;
       if (testTrade.isGrossWin) { looWins++; looGrossP += testTrade.netPnlUsd; }
       if (testTrade.isGrossLoss) { looLosses++; looGrossL += Math.abs(testTrade.netPnlUsd); }
    }
  }
  
  const looPf = looGrossL > 0 ? looGrossP / looGrossL : (looGrossP > 0 ? 99.99 : 0);

  // Generate Report
  const reportPath = path.join(edgeDir, 'experiment_3_purification.md');
  let md = `# 🧬 EXPERIMENTO 3: Matriz de Purificação e Validação LOO\n\n`;
  md += `**Dataset:** 64 Trades (15m Time Exit + SL + 0.8R BE)\n`;
  md += `**Base T0 Winners:** ${totalW} | **Base T0 Losers:** ${totalL}\n\n`;
  
  md += `## 1. Comparativo de Modelos (In-Sample)\n\n`;
  md += `| Modelo | Trades | PnL | PF | WR | Winners Eliminados | Losers Eliminados | Eficiência de Remoção (L/W) |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  
  for (const r of results) {
    const eff = r.remW > 0 ? (r.remL / r.remW).toFixed(2) : (r.remL > 0 ? '∞' : '0');
    md += `| ${r.name} | ${r.kept}/64 | $${r.netPnl.toFixed(2)} | ${r.pf.toFixed(2)} | ${r.wr.toFixed(1)}% | ${r.remW} | ${r.remL} | **${eff}x** |\n`;
  }
  
  md += `\n## 2. Top 5 Matriz SMA x ATR (In-Sample)\n\n`;
  md += `| SMA Limit | ATR Limit | Trades | PnL | PF | Eficiência (L/W) |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (let i = 0; i < 5 && i < sweepResults.length; i++) {
    const r = sweepResults[i];
    const eff = r.remW > 0 ? (r.remL / r.remW).toFixed(2) : (r.remL > 0 ? '∞' : '0');
    md += `| < ${r.s}% | < ${r.a}% | ${r.kept} | $${r.netPnl.toFixed(2)} | ${r.pf.toFixed(2)} | ${eff}x |\n`;
  }
  
  md += `\n## 3. 🛡️ VALIDAÇÃO OUT-OF-SAMPLE (Leave-One-Out)\n\n`;
  md += `*Para cada um dos 64 trades, o filtro SMA+ATR foi treinado cegamente nos outros 63 e aplicado ao trade isolado. Isso previne o sobreajuste (overfitting).* \n\n`;
  
  md += `| Métrica | Resultado Out-of-Sample |\n`;
  md += `|---|---|\n`;
  md += `| Trades Aprovados | ${looKept}/64 |\n`;
  md += `| Net PnL (LOO) | **$${looNetPnl.toFixed(2)}** |\n`;
  md += `| Profit Factor | **${looPf.toFixed(2)}** |\n`;
  md += `| Win Rate (LOO) | ${looKept > 0 ? ((looWins/looKept)*100).toFixed(1) : 0}% |\n\n`;

  md += `> **Significância:** Se o PnL LOO desmoronar de volta para negativo (-$35), o filtro SMA+ATR era pura ilusão in-sample. Se permanecer positivo e com PF > 1.0, o sinal CAUSAL da distância SMA+ATR é robusto.\n`;
  
  fs.writeFileSync(reportPath, md);
  console.log(md);
  console.log(`\nReport saved to ${reportPath}`);
}

main().catch(console.error);
