import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

const INTERVALS = [5, 10, 15, 20, 25, 30, 45, 60];
const TAKER_FEE_BPS = 0.0002; // 2 bps exit
const ENTRY_FEE_BPS = 0.0002; // 2 bps entry
const TOTAL_FRICTION = TAKER_FEE_BPS + ENTRY_FEE_BPS;

async function main() {
  console.log("====================================================");
  console.log("🕒 EXPERIMENT 1A: PURE TIME EXIT COUNTERFACTUAL");
  console.log("====================================================\n");

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const trades = lines.map(l => JSON.parse(l));
  
  const bySymbol = {};
  trades.forEach(t => {
    const sym = t.TRADE_ID.split('_')[1];
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(t);
  });

  const resultsByInterval = {};
  INTERVALS.forEach(i => {
    resultsByInterval[i] = {
      trades: [],
      wins: 0,
      losses: 0,
      scratch: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalNetPnl: 0,
      symbolPnl: { BNBUSDT: 0, ADAUSDT: 0, ETHUSDT: 0, BTCUSDT: 0, SOLUSDT: 0, XRPUSDT: 0 }
    };
  });

  for (const sym of Object.keys(bySymbol)) {
    const file = path.join(dataDir, `${sym}_audit_klines.json`);
    if (!fs.existsSync(file)) {
      console.warn(`Missing candles for ${sym}`);
      continue;
    }
    const candles = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    for (const trade of bySymbol[sym]) {
      const entryTs = trade.SIGNAL.timestamp * 1000;
      const entryIdx = candles.findIndex(c => c.openTime === entryTs);
      
      if (entryIdx === -1) {
        console.warn(`[!] Entry candle not found for ${trade.TRADE_ID} at ${entryTs}`);
        continue;
      }
      
      const entryPrice = trade.PREDICTION.entry;
      const direction = trade.SIGNAL.direction;
      const qty = trade.EXECUTION.filled_quantity; // we evaluate % PnL and $ PnL
      const notional = entryPrice * qty;
      
      let maxHigh = entryPrice;
      let minLow = entryPrice;

      for (let t = 1; t <= 60; t++) {
        const cIdx = entryIdx + t;
        if (cIdx >= candles.length) break;
        
        const candle = candles[cIdx];
        if (candle.high > maxHigh) maxHigh = candle.high;
        if (candle.low < minLow) minLow = candle.low;

        if (INTERVALS.includes(t)) {
          const exitPrice = candle.close;
          
          let rawPnlPct = direction === 'LONG' 
            ? (exitPrice - entryPrice) / entryPrice 
            : (entryPrice - exitPrice) / entryPrice;
            
          let netPnlPct = rawPnlPct - TOTAL_FRICTION;
          let netPnlUsd = netPnlPct * notional;
          
          let mfePct = direction === 'LONG' ? (maxHigh - entryPrice)/entryPrice : (entryPrice - minLow)/entryPrice;
          let maePct = direction === 'LONG' ? (entryPrice - minLow)/entryPrice : (maxHigh - entryPrice)/entryPrice;

          const res = resultsByInterval[t];
          res.trades.push({
            id: trade.TRADE_ID,
            symbol: sym,
            direction,
            netPnlPct,
            netPnlUsd,
            mfePct,
            maePct
          });
          
          res.totalNetPnl += netPnlUsd;
          res.symbolPnl[sym] += netPnlUsd;
          
          if (netPnlUsd > 0) {
            res.wins++;
            res.grossProfit += netPnlUsd;
          } else if (netPnlUsd < 0) {
            res.losses++;
            res.grossLoss += Math.abs(netPnlUsd);
          } else {
            res.scratch++;
          }
        }
      }
    }
  }

  // Generate Report
  const reportPath = path.join(edgeDir, 'experiment_1a_time_exit.md');
  let md = `# EXPERIMENT 1A: Time Exit Optimization (64 Railway Trades)\n\n`;
  md += `**Friction Assumed:** Taker Exit (${(TAKER_FEE_BPS*10000)} bps) + Taker Entry (${(ENTRY_FEE_BPS*10000)} bps)\n`;
  md += `**Dataset:** 64 Authentic Railway Trades (Aug 24-25)\n\n`;
  
  md += `## 1. Aggregate Curve\n\n`;
  md += `| Exit | WR | PF | Expectancy ($) | Net PnL ($) | Avg MFE | Avg MAE |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  INTERVALS.forEach(t => {
    const r = resultsByInterval[t];
    const total = r.wins + r.losses + r.scratch;
    const wr = total > 0 ? (r.wins / total) * 100 : 0;
    const pf = r.grossLoss > 0 ? r.grossProfit / r.grossLoss : (r.grossProfit > 0 ? 99.99 : 0);
    const exp = total > 0 ? r.totalNetPnl / total : 0;
    
    let avgMfe = 0, avgMae = 0;
    if (total > 0) {
      avgMfe = r.trades.reduce((sum, tr) => sum + tr.mfePct, 0) / total;
      avgMae = r.trades.reduce((sum, tr) => sum + tr.maePct, 0) / total;
    }
    
    md += `| ${t}m | ${wr.toFixed(1)}% | ${pf.toFixed(2)} | $${exp.toFixed(2)} | $${r.totalNetPnl.toFixed(2)} | ${(avgMfe*100).toFixed(2)}% | ${(avgMae*100).toFixed(2)}% |\n`;
  });

  md += `\n## 2. PnL Decomposition by Asset ($)\n\n`;
  md += `| Exit | Total | BNB | ADA | ETH | BTC | SOL | XRP |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  
  INTERVALS.forEach(t => {
    const r = resultsByInterval[t];
    md += `| ${t}m | $${r.totalNetPnl.toFixed(2)} | $${r.symbolPnl.BNBUSDT.toFixed(2)} | $${r.symbolPnl.ADAUSDT.toFixed(2)} | $${r.symbolPnl.ETHUSDT.toFixed(2)} | $${r.symbolPnl.BTCUSDT.toFixed(2)} | $${r.symbolPnl.SOLUSDT.toFixed(2)} | $${r.symbolPnl.XRPUSDT.toFixed(2)} |\n`;
  });

  fs.writeFileSync(reportPath, md);
  console.log(md);
  console.log(`\nReport saved to ${reportPath}`);
}

main().catch(console.error);
