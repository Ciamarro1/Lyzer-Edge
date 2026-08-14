import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });
process.env.ARL_MODE = 'SIMULATION';
process.env.COURT_SECRET_KEY = "MOCK_SECRET";
process.env.TRG_THRESHOLD = "0.35";
process.env.RESIDUAL_CONSENSUS_LIMIT = "0.005";
process.env.INTRABAR_PESSIMISM = "true";
process.env.ADVERSARIAL_SLIPPAGE = "0.0005";
process.env.LHDS_VETO_LIMIT = "0.995";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYMBOL = 'BTCUSDT';
const INGESTION_LIMIT = 36000;

async function main() {

    const originalLog = console.log;
    console.log = function(...args) {
        if (typeof args[0] === 'string' && (args[0].includes('[AUTOPSY]') || args[0].includes('Processed'))) {
            originalLog.apply(console, args);
        }
    };
    console.warn = () => {};

    const { StreamEngine } = await import(`../streamEngine.js?t=${Date.now()}`);
    const { ExchangeExecution } = await import(`../exchangeExecution.js?t=${Date.now()}`);

    const engine = new StreamEngine({ symbol: SYMBOL, mode: 'SIMULATION' });
    engine.execution = new ExchangeExecution('SIMULATION');

    const historicalFile = path.join(__dirname, `../../historical_data_${SYMBOL}.json`);
    console.log(`[AUTOPSY] Loading ${historicalFile}...`);
    const rawData = await fs.readFile(historicalFile, 'utf8');
    const allCandles = JSON.parse(rawData);

    // Warmup Phase (last 10k candles before INGESTION_LIMIT)
    const warmupStart = Math.max(0, allCandles.length - INGESTION_LIMIT - 10000);
    const warmupCandles = allCandles.slice(warmupStart, allCandles.length - INGESTION_LIMIT);
    console.log(`[AUTOPSY] Warming up with ${warmupCandles.length} candles...`);
    for (const c of warmupCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, true);
    }
    console.log(`[AUTOPSY] Warmup complete.`);

    engine.ingestor = { onTick: () => {} };
    engine.ingestor.onTick = (candle) => {
        engine.checkTickPositionExit(candle);
    };

    // Live Execution Phase
    const activeCandles = allCandles.slice(allCandles.length - INGESTION_LIMIT);
    console.log(`[AUTOPSY] Processing ${activeCandles.length} active candles...`);
    
    let counter = 0;
    for (const c of activeCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.tickCounter++;
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, false);
        engine.ingestor.onTick(tickEvent);
        
        counter++;
        if (counter % 5000 === 0) {
            console.log(`Processed ${counter}/${activeCandles.length}...`);
        }
    }

    const outputFile = path.join(__dirname, '../../autopsy_trades.json');
    await fs.writeFile(outputFile, JSON.stringify(engine.tradeHistory, null, 2));
    console.log(`[AUTOPSY] Finished! Saved ${engine.tradeHistory.length} trades with MFE/MAE to autopsy_trades.json`);
}

main().catch(console.error);
