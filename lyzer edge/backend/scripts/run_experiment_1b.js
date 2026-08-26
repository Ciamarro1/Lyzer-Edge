import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

const INTERVALS = [15, 20, 25, 30];
const TAKER_FEE_BPS = 0.0002; // 2 bps taker exit (for time/SL)
const MAKER_FEE_BPS = -0.0001; // 1 bp maker exit (for limit scale-outs, but we are doing TIME+BE+SL which are mostly market stops or time limits)
const ENTRY_FEE_BPS = 0.0002; // 2 bps entry

async function main() {
  console.log("====================================================");
  console.log("🛡️ EXPERIMENT 1B: TIME EXIT + DYNAMIC PROTECTION");
  console.log("====================================================\n");

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const trades = lines.map(l => JSON.parse(l));
  
  const bySymbol = {};
  trades.forEach(t => {
    const sym = t.TRADE_ID.split('_')[1];
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(t);
  });

  const results = {};
  INTERVALS.forEach(i => {
    results[i] = {
      totalTrades: 0,
      slHits: 0,
      beHits: 0,
      timeExits: 0,
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
    if (!fs.existsSync(file)) continue;
    const candles = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    for (const trade of bySymbol[sym]) {
      const entryTs = trade.SIGNAL.timestamp * 1000;
      const entryIdx = candles.findIndex(c => c.openTime === entryTs);
      
      if (entryIdx === -1) continue;
      
      const entryPrice = trade.PREDICTION.entry;
      const direction = trade.SIGNAL.direction;
      const qty = trade.EXECUTION.filled_quantity;
      const notional = entryPrice * qty;
      const slDistPct = (trade.PREDICTION.sl_distance_bps || 25) / 10000;
      
      // We simulate 4 different intervals for the SAME trade
      for (const T of INTERVALS) {
        let beApplied = false;
        let exitReason = null;
        let exitPrice = 0;
        let exitFee = TAKER_FEE_BPS; // defaults to taker
        
        let slPrice = direction === 'LONG' ? entryPrice * (1 - slDistPct) : entryPrice * (1 + slDistPct);
        const beTriggerPrice = direction === 'LONG' ? entryPrice * (1 + (slDistPct * 0.8)) : entryPrice * (1 - (slDistPct * 0.8));
        const breakevenExitPrice = direction === 'LONG' ? entryPrice * 1.0004 : entryPrice * 0.9996; // +4 bps to cover fees
        
        for (let t = 1; t <= T; t++) {
          const cIdx = entryIdx + t;
          if (cIdx >= candles.length) {
             exitReason = 'TIME';
             exitPrice = candles[candles.length-1].close;
             break;
          }
          const candle = candles[cIdx];
          
          // 1. Check BE Trigger (MFE hit)
          if (!beApplied) {
            if (direction === 'LONG' && candle.high >= beTriggerPrice) {
              beApplied = true;
              slPrice = breakevenExitPrice;
            } else if (direction === 'SHORT' && candle.low <= beTriggerPrice) {
              beApplied = true;
              slPrice = breakevenExitPrice;
            }
          }
          
          // 2. Check SL Hit
          if (direction === 'LONG' && candle.low <= slPrice) {
            exitReason = beApplied ? 'BREAK_EVEN' : 'STOP_LOSS';
            exitPrice = slPrice;
            break; // Exited!
          } else if (direction === 'SHORT' && candle.high >= slPrice) {
            exitReason = beApplied ? 'BREAK_EVEN' : 'STOP_LOSS';
            exitPrice = slPrice;
            break; // Exited!
          }
          
          // 3. Reached Time Limit?
          if (t === T) {
            exitReason = 'TIME';
            exitPrice = candle.close;
            break;
          }
        }
        
        if (!exitReason) {
            exitReason = 'TIME'; // Fallback
            exitPrice = candles[Math.min(entryIdx + T, candles.length-1)].close;
        }

        const rawPnlPct = direction === 'LONG' 
          ? (exitPrice - entryPrice) / entryPrice 
          : (entryPrice - exitPrice) / entryPrice;
          
        const netPnlPct = rawPnlPct - (ENTRY_FEE_BPS + exitFee);
        const netPnlUsd = netPnlPct * notional;
        
        const res = results[T];
        res.totalTrades++;
        res.totalNetPnl += netPnlUsd;
        res.symbolPnl[sym] += netPnlUsd;
        
        if (exitReason === 'STOP_LOSS') res.slHits++;
        if (exitReason === 'BREAK_EVEN') res.beHits++;
        if (exitReason === 'TIME') res.timeExits++;
        
        if (netPnlUsd > 0.05) {
          res.wins++;
          res.grossProfit += netPnlUsd;
        } else if (netPnlUsd < -0.05) {
          res.losses++;
          res.grossLoss += Math.abs(netPnlUsd);
        } else {
          res.scratch++;
        }
      }
    }
  }

  // Generate Report
  const reportPath = path.join(edgeDir, 'experiment_1b_protected_time_exit.md');
  let md = `# EXPERIMENT 1B: Protected Time Exit (64 Railway Trades)\n\n`;
  md += `**Friction Assumed:** Taker Exit (2 bps) + Taker Entry (2 bps)\n`;
  md += `**Protections Active:** Parametric Stop-Loss (Dynamic ATR), Break-Even at +0.8R\n\n`;
  
  md += `## 1. Aggregate Curve (With Protection)\n\n`;
  md += `| Exit | WR | PF | Expectancy | Net PnL ($) | SL Hits | BE Hits | Time Exits |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;

  INTERVALS.forEach(T => {
    const r = results[T];
    const total = r.wins + r.losses + r.scratch;
    const wr = total > 0 ? (r.wins / total) * 100 : 0;
    const pf = r.grossLoss > 0 ? r.grossProfit / r.grossLoss : (r.grossProfit > 0 ? 99.99 : 0);
    const exp = total > 0 ? r.totalNetPnl / total : 0;
    
    md += `| ${T}m | ${wr.toFixed(1)}% | ${pf.toFixed(2)} | $${exp.toFixed(2)} | $${r.totalNetPnl.toFixed(2)} | ${r.slHits} | ${r.beHits} | ${r.timeExits} |\n`;
  });

  md += `\n## 2. PnL Decomposition by Asset ($)\n\n`;
  md += `| Exit | Total | BNB | ADA | ETH | BTC | SOL | XRP |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  
  INTERVALS.forEach(T => {
    const r = results[T];
    md += `| ${T}m | $${r.totalNetPnl.toFixed(2)} | $${r.symbolPnl.BNBUSDT.toFixed(2)} | $${r.symbolPnl.ADAUSDT.toFixed(2)} | $${r.symbolPnl.ETHUSDT.toFixed(2)} | $${r.symbolPnl.BTCUSDT.toFixed(2)} | $${r.symbolPnl.SOLUSDT.toFixed(2)} | $${r.symbolPnl.XRPUSDT.toFixed(2)} |\n`;
  });

  fs.writeFileSync(reportPath, md);
  console.log(md);
  console.log(`\nReport saved to ${reportPath}`);
}

main().catch(console.error);
