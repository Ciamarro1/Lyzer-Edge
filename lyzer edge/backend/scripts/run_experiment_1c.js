import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

const BE_TRIGGERS = [0.6, 0.8, 1.0];
const TP1_TARGETS = [0.8, 1.0, 1.2, 1.5];
const PORTIONS = [0.25, 0.33, 0.50];
const TIME_EXITS = [5, 10, 15, 20, 30];

const FRICTION = 0.0004; // 2 bps entry + 2 bps exit per portion

async function main() {
  console.log("====================================================");
  console.log("🔥 EXPERIMENT 1C: MFE CAPTURE / SCALE-OUT SWEEP");
  console.log("====================================================\n");

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const trades = lines.map(l => JSON.parse(l));
  
  const bySymbol = {};
  trades.forEach(t => {
    const sym = t.TRADE_ID.split('_')[1];
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(t);
  });
  
  // Pre-load candles
  const candlesCache = {};
  for (const sym of Object.keys(bySymbol)) {
    const file = path.join(dataDir, `${sym}_audit_klines.json`);
    if (fs.existsSync(file)) {
      candlesCache[sym] = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  }

  const configs = [];
  for (const be of BE_TRIGGERS) {
    for (const tp1 of TP1_TARGETS) {
      for (const p of PORTIONS) {
        for (const t of TIME_EXITS) {
          configs.push({ be, tp1, p, t });
        }
      }
    }
  }
  
  console.log(`Running ${configs.length} configurations over 64 trades...`);

  const results = [];

  for (const config of configs) {
    let totalNetPnl = 0;
    let wins = 0, losses = 0, scratch = 0;
    let grossProfit = 0, grossLoss = 0;
    let slHits = 0, beHits = 0, tp1Hits = 0, timeExits = 0;
    
    let totalMfeR = 0;
    let totalCapturedR = 0;
    
    for (const sym of Object.keys(bySymbol)) {
      const candles = candlesCache[sym];
      if (!candles) continue;
      
      for (const trade of bySymbol[sym]) {
        const entryTs = trade.SIGNAL.timestamp * 1000;
        const entryIdx = candles.findIndex(c => c.openTime === entryTs);
        if (entryIdx === -1) continue;
        
        const entryPrice = trade.PREDICTION.entry;
        const isLong = trade.SIGNAL.direction === 'LONG';
        const notional = entryPrice * trade.EXECUTION.filled_quantity;
        
        // sl_distance_bps is the distance to stop in bps
        const slDistPct = (trade.PREDICTION.sl_distance_bps || 25) / 10000;
        const slPrice = isLong ? entryPrice * (1 - slDistPct) : entryPrice * (1 + slDistPct);
        const slDistPrice = Math.abs(entryPrice - slPrice); // 1R in price
        
        const beTriggerPrice = isLong ? entryPrice + (slDistPrice * config.be) : entryPrice - (slDistPrice * config.be);
        const tp1Price = isLong ? entryPrice + (slDistPrice * config.tp1) : entryPrice - (slDistPrice * config.tp1);
        
        let tp1_done = false;
        let be_armed = false;
        let exited = false;
        let exitReason = '';
        let finalPnlUsd = 0;
        let maxFavorablePrice = entryPrice;
        let finalCapturedR = 0;
        
        for (let timeStep = 1; timeStep <= config.t; timeStep++) {
          const cIdx = entryIdx + timeStep;
          if (cIdx >= candles.length) {
            exitReason = 'TIME';
            break;
          }
          const c = candles[cIdx];
          
          // Track MFE
          if (isLong && c.high > maxFavorablePrice) maxFavorablePrice = c.high;
          if (!isLong && c.low < maxFavorablePrice) maxFavorablePrice = c.low;

          // Pessimistic intra-bar: Check stops before targets
          const currentStop = be_armed ? entryPrice : slPrice;
          
          const hitStop = isLong ? c.low <= currentStop : c.high >= currentStop;
          
          if (hitStop) {
            exited = true;
            exitReason = be_armed ? 'BE' : 'SL';
            const remPortion = tp1_done ? (1 - config.p) : 1.0;
            const pnlPct = isLong ? (currentStop - entryPrice)/entryPrice : (entryPrice - currentStop)/entryPrice;
            finalPnlUsd += ((pnlPct * remPortion) - (FRICTION * remPortion)) * notional;
            
            finalCapturedR += (pnlPct / slDistPct) * remPortion;
            
            if (be_armed) beHits++; else slHits++;
            break;
          }
          
          // Check TP1
          const hitTp1 = isLong ? c.high >= tp1Price : c.low <= tp1Price;
          if (!tp1_done && hitTp1) {
            tp1_done = true;
            tp1Hits++;
            const pnlPct = isLong ? (tp1Price - entryPrice)/entryPrice : (entryPrice - tp1Price)/entryPrice;
            finalPnlUsd += ((pnlPct * config.p) - (FRICTION * config.p)) * notional;
            
            finalCapturedR += (pnlPct / slDistPct) * config.p;
            
            // Note: If TP1 is hit, some systems auto-arm BE. We stick to explicit BE trigger.
          }
          
          // Check BE Arm
          const hitBeTrigger = isLong ? c.high >= beTriggerPrice : c.low <= beTriggerPrice;
          if (!be_armed && hitBeTrigger) {
            be_armed = true;
          }
        }
        
        if (!exited) {
          exitReason = 'TIME';
          timeExits++;
          const exitCandle = candles[Math.min(entryIdx + config.t, candles.length-1)];
          const currentPrice = exitCandle.close;
          
          const remPortion = tp1_done ? (1 - config.p) : 1.0;
          const pnlPct = isLong ? (currentPrice - entryPrice)/entryPrice : (entryPrice - currentPrice)/entryPrice;
          finalPnlUsd += ((pnlPct * remPortion) - (FRICTION * remPortion)) * notional;
          
          finalCapturedR += (pnlPct / slDistPct) * remPortion;
        }
        
        // Stats
        totalNetPnl += finalPnlUsd;
        if (finalPnlUsd > 0.01) {
          wins++;
          grossProfit += finalPnlUsd;
        } else if (finalPnlUsd < -0.01) {
          losses++;
          grossLoss += Math.abs(finalPnlUsd);
        } else {
          scratch++;
        }
        
        // MFE tracking
        const mfePct = isLong ? (maxFavorablePrice - entryPrice)/entryPrice : (entryPrice - maxFavorablePrice)/entryPrice;
        const mfeR = mfePct / slDistPct;
        totalMfeR += mfeR;
        totalCapturedR += finalCapturedR;
      }
    }
    
    const totalTrades = wins + losses + scratch;
    const wr = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.99 : 0);
    const exp = totalTrades > 0 ? totalNetPnl / totalTrades : 0;
    const mfeCaptureRatio = totalMfeR > 0 ? totalCapturedR / totalMfeR : 0;
    
    results.push({
      config,
      totalNetPnl,
      wins, losses, scratch,
      wr, pf, exp,
      slHits, beHits, tp1Hits, timeExits,
      mfeCaptureRatio
    });
  }
  
  // Sort by Profit Factor first, then by Total Net PnL
  results.sort((a, b) => b.totalNetPnl - a.totalNetPnl);
  
  const reportPath = path.join(edgeDir, 'experiment_1c_harvest_curve.md');
  let md = `# EXPERIMENT 1C: MFE Capture / Scale-Out Sweep (64 Trades)\n\n`;
  md += `**Dataset:** 64 Railway Trades\n`;
  md += `**Friction:** 4 bps round-trip per position portion\n\n`;
  
  md += `## Top 20 Configurations by Net PnL\n\n`;
  md += `| BE | TP1 | % Taken | Time | PF | WR | PnL | Exp | SL | BE | TP1 | Time | MFE Capt |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  
  for (let i = 0; i < 20 && i < results.length; i++) {
    const r = results[i];
    const c = r.config;
    md += `| ${c.be}R | ${c.tp1}R | ${c.p*100}% | ${c.t}m | ${r.pf.toFixed(2)} | ${r.wr.toFixed(1)}% | $${r.totalNetPnl.toFixed(2)} | $${r.exp.toFixed(2)} | ${r.slHits} | ${r.beHits} | ${r.tp1Hits} | ${r.timeExits} | ${(r.mfeCaptureRatio*100).toFixed(1)}% |\n`;
  }
  
  fs.writeFileSync(reportPath, md);
  console.log(md);
  console.log(`\nReport saved to ${reportPath}`);
}

main().catch(console.error);
