import fs from 'fs';
import path from 'path';
import { StreamEngine } from '../streamEngine.js';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

// Force environment variables
process.env.ARL_MODE = 'SIMULATION';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';
process.env.ENABLE_24_7_REGIME = 'true';
process.env.ENABLE_DEALING_RANGE_FILTER = 'false';
process.env.SHORT_ENABLED = 'true';
process.env.ALLOW_SHORTS = 'true';
process.env.DISABLED_PROVIDERS = 'v1,v3';
// We want to just generate signals without filtering by court, so we can see what TruthKernel says.

async function main() {
  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const targetTrades = lines.map(l => JSON.parse(l));
  
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
  
  let totalTradesGenerated = 0;
  
  for (const sym of symbols) {
    const file = path.join(dataDir, `${sym}_audit_klines.json`);
    if (!fs.existsSync(file)) continue;
    
    const candles = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`[${sym}] Loaded ${candles.length} candles.`);
    
    const engine = new StreamEngine(sym);
    let tradesGenerated = 0;
    
    // We can hook into the engine's simulatedTrade emitter
    engine.on('simulatedTrade', (trade) => {
      tradesGenerated++;
      totalTradesGenerated++;
    });
    
    // Process all candles
    for (let i = 0; i < candles.length; i++) {
      await engine.processCandle(candles[i], i);
    }
    
    console.log(`[${sym}] Generated ${tradesGenerated} trades.`);
  }
  
  console.log(`Total trades generated across 6 assets: ${totalTradesGenerated}`);
}

main().catch(console.error);
