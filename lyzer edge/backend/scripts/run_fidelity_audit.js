import fs from 'fs';
import path from 'path';
import url from 'url';

// Relax all filters so we don't reject naturally
process.env.ARL_MODE = 'SIMULATION';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';
process.env.ENABLE_24_7_REGIME = 'true';
process.env.ENABLE_DEALING_RANGE_FILTER = 'false';
process.env.SHORT_ENABLED = 'true';
process.env.ALLOW_SHORTS = 'true';
process.env.DISABLED_PROVIDERS = 'v1,v3';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');
const OUT_PATH = path.join(edgeDir, 'fidelity_audit_report.json');

async function main() {
  console.log("====================================================");
  console.log("🔍 EXPERIMENT 1: REPLAY FIDELITY AUDIT (64 TRADES)");
  console.log("====================================================\n");

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const targetTrades = lines.map(l => JSON.parse(l));
  
  const bySymbol = {};
  targetTrades.forEach(t => {
    const sym = t.TRADE_ID.split('_')[1];
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(t);
  });
  
  const { StreamEngine, getExitPolicyConfig } = await import('../../backend/streamEngine.js');
  const { court } = await import('../../../packages/lyzer-constitution/src/eca/court.js');
  
  court.configure({ lethalIllusionLimit: 0.9 }, { sclThreshold: 0, minCooldown: 0, stabilizationWindowMs: 0 });

  const auditResults = [];

  for (const sym of Object.keys(bySymbol)) {
    console.log(`\n--- Auditing ${sym} (${bySymbol[sym].length} trades) ---`);
    
    const file = path.join(dataDir, `${sym}_audit_klines.json`);
    if (!fs.existsSync(file)) continue;
    
    const candles = JSON.parse(fs.readFileSync(file, 'utf8'));
    bySymbol[sym].sort((a,b) => a.SIGNAL.timestamp - b.SIGNAL.timestamp);
    
    let candleIdx = 0;
    
    for (const trade of bySymbol[sym]) {
      const engine = new StreamEngine(sym);
      const entryTs = trade.SIGNAL.timestamp * 1000;
      
      // Fast forward engine
      while (candleIdx < candles.length && candles[candleIdx].openTime < entryTs) {
        await engine.processCandle(candles[candleIdx], candleIdx);
        candleIdx++;
      }
      
      if (candleIdx < candles.length && candles[candleIdx].openTime === entryTs) {
        // Evaluate entry conditions
        let simulatedAllowed = false;
        let rejectReason = '';
        const onTrade = () => { simulatedAllowed = true; };
        engine.on('simulatedTrade', onTrade);
        await engine.processCandle(candles[candleIdx], candleIdx);
        engine.off('simulatedTrade', onTrade);
        
        // Force the position into the engine based on the ledger to test the exit policy!
        engine.activePosition = {
          id: trade.TRADE_ID,
          timestamp: trade.SIGNAL.timestamp,
          openCandleIndex: candleIdx,
          direction: trade.SIGNAL.direction,
          strategyType: 'TREND_EXPANSION', // fallback
          entryPrice: trade.PREDICTION.entry,
          stopLoss: trade.SIGNAL.direction === 'LONG' ? trade.PREDICTION.entry * (1 - (trade.PREDICTION.sl_distance_bps/10000)) : trade.PREDICTION.entry * (1 + (trade.PREDICTION.sl_distance_bps/10000)),
          initialStopLoss: trade.SIGNAL.direction === 'LONG' ? trade.PREDICTION.entry * (1 - (trade.PREDICTION.sl_distance_bps/10000)) : trade.PREDICTION.entry * (1 + (trade.PREDICTION.sl_distance_bps/10000)),
          takeProfit: null, // We are testing time-exit/dynamic exits
          exitPolicy: 'TIME', 
          timeExitMinutes: 15, // Test with current baseline Time Exit
          quantity: trade.EXECUTION.filled_quantity,
          initialQuantity: trade.EXECUTION.filled_quantity,
          remainingQuantity: trade.EXECUTION.filled_quantity,
          mfeTargetBE: 0.8,
          mfeTargetScale1: 1.2,
          mfeTargetScale2: 1.8,
          scaleOut1Done: false,
          scaleOut2Done: false,
          peakFavorablePrice: trade.PREDICTION.entry,
          peakAdversePrice: trade.PREDICTION.entry
        };
        
        // Now run candles until exit
        let exitResult = null;
        engine.on('trade_closed', (exitPayload) => {
          exitResult = exitPayload;
        });
        
        let localIdx = candleIdx + 1;
        while (!exitResult && localIdx < candles.length) {
          await engine.processCandle(candles[localIdx], localIdx);
          localIdx++;
        }
        
        const replayPnl = exitResult ? (trade.SIGNAL.direction === 'LONG' ? exitResult.exitPrice - trade.PREDICTION.entry : trade.PREDICTION.entry - exitResult.exitPrice) * trade.EXECUTION.filled_quantity : null;
        
        auditResults.push({
          trade_id: trade.TRADE_ID,
          symbol: sym,
          direction: trade.SIGNAL.direction,
          original_entry_price: trade.PREDICTION.entry,
          original_exit_price: trade.EXIT.exit_price,
          original_pnl: (trade.SIGNAL.direction === 'LONG' ? trade.EXIT.exit_price - trade.PREDICTION.entry : trade.PREDICTION.entry - trade.EXIT.exit_price) * trade.EXECUTION.filled_quantity,
          simulated_allowed: simulatedAllowed,
          replay_exit_price: exitResult ? exitResult.exitPrice : null,
          replay_pnl: replayPnl,
          replay_exit_reason: exitResult ? exitResult.exitReason : 'UNKNOWN'
        });
        
        console.log(`Audited ${trade.TRADE_ID} - Original Exit: ${trade.EXIT.exit_price}, Replay Exit: ${exitResult ? exitResult.exitPrice : 'N/A'}, Replay PnL: ${replayPnl !== null ? replayPnl.toFixed(4) : 'N/A'}`);
      }
    }
  }
  
  fs.writeFileSync(OUT_PATH, JSON.stringify(auditResults, null, 2));
  
  const total = auditResults.length;
  const simulatedAllowed = auditResults.filter(r => r.simulated_allowed).length;
  const matchPnl = auditResults.filter(r => r.replay_pnl !== null && Math.sign(r.original_pnl) === Math.sign(r.replay_pnl)).length;
  
  console.log(`\n====================================================`);
  console.log(`📊 REPLAY FIDELITY SUMMARY`);
  console.log(`====================================================`);
  console.log(`Total Target Trades: ${total}`);
  console.log(`Allowed naturally by relaxed engine: ${simulatedAllowed}`);
  console.log(`Directional PnL Match (Forced Entry -> Replay Exit): ${matchPnl} / ${total}`);
  console.log(`Full report saved to ${OUT_PATH}`);
}

main().catch(console.error);
