import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

// The engine loads .env on its own via ../env.js, but let's ensure it's loaded first
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Override these specifically for the simulation run to bypass MOL startup
process.env.ARL_MODE = 'SIMULATION'; 
process.env.SHADOW_TRADING_ENABLED = 'false';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';

const SYMBOL = 'BTCUSDT';
const INGESTION_LIMIT = 1000; // Fetch 1000 from Binance

async function fetchBinanceData() {
    return new Promise((resolve, reject) => {
        const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=1m&limit=${INGESTION_LIMIT}`;
        console.log(`[REPLAY] Fetching market data from: ${url}`);
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                const candles = json.map(k => ({
                    openTime: k[0],
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                    volume: parseFloat(k[5]),
                    closed: true
                }));
                resolve(candles);
            });
        }).on('error', reject);
    });
}

async function main() {
    const originalError = console.error;
    console.error = function(...args) {
        if (typeof args[0] === 'string' && (args[0].includes('[DB]') || args[0].includes('[CAUSAL_MEMORY]') || args[0].includes('SQLITE_CONSTRAINT'))) {
            return;
        }
        originalError.apply(console, args);
    };
    
    // Keep console logs for the replay so we can see SNIPER and EXHAUSTION logs
    const { StreamEngine } = await import(`../streamEngine.js?t=${Date.now()}`);
    const { ExchangeExecution } = await import(`../exchangeExecution.js?t=${Date.now()}`);

    const engine = new StreamEngine({ symbol: SYMBOL, mode: 'SIMULATION' });
    engine.execution = new ExchangeExecution('SIMULATION');
    // Mock DB to prevent SQLITE_CONSTRAINT errors
    engine.causalMemoryDB = {
        recordTick: async () => {},
        recordState: async () => {},
        recordOrder: async () => {}
    };

    const allCandles = await fetchBinanceData();

    // Warmup Phase
    const warmupCandles = allCandles.slice(0, 500);
    console.log(`[REPLAY] Warming up with ${warmupCandles.length} candles...`);
    for (const c of warmupCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, true);
    }
    console.log(`[REPLAY] Warmup complete.`);

    engine.ingestor = { onTick: () => {} };
    engine.ingestor.onTick = (candle) => {
        engine.checkTickPositionExit(candle);
    };

    // Live Execution Phase
    const activeCandles = allCandles.slice(500);
    console.log(`[REPLAY] Processing ${activeCandles.length} active candles in strict mode...`);
    
    for (const c of activeCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.tickCounter++;
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, false);
        engine.ingestor.onTick(tickEvent);
    }

    const outputFile = path.join(__dirname, '../../replay_trades.json');
    await fs.writeFile(outputFile, JSON.stringify(engine.tradeHistory, null, 2));
    console.log(`[REPLAY] Finished! Saved ${engine.tradeHistory.length} trades with MFE/MAE to replay_trades.json`);
    
    // Print summary like user requested
    console.log('\n--- SINGLE-TRADE DETERMINISTIC REPLAY REPORT ---');
    if (engine.tradeHistory.length === 0) {
        console.log('No trades executed. The system stayed out of the market.');
    } else {
        engine.tradeHistory.forEach((t, idx) => {
            console.log(`\nTrade #${idx + 1}`);
            console.log(`Entry       = ${t.entryPrice.toFixed(2)}`);
            console.log(`Direction   = ${t.direction}`);
            console.log(`SL          = ${t.stopLoss ? t.stopLoss.toFixed(2) : 'N/A'}`);
            console.log(`Quantity    = ${t.initialQuantity || t.quantity}`);
            console.log(`BE          = ${t.breakEvenApplied ? 'triggered' : 'no'}`);
            console.log(`ScaleOut1   = ${t.scaleOut1Done ? 'yes' : 'no'}`);
            console.log(`ScaleOut2   = ${t.scaleOut2Done ? 'yes' : 'no'}`);
            console.log(`TimeExit    = ${t.exitReason === 'TIME_EXIT' ? '15m' : 'no'}`);
            console.log(`Exit Reason = ${t.exitReason}`);
            console.log(`PnL         = $${(t.pnlAmount || (t.pnlPct * t.entryPrice * (t.initialQuantity||t.quantity))).toFixed(2)}`);
            if (t.scaleOutHistory && t.scaleOutHistory.length > 0) {
                console.log(`ScaleOut Hist= ${JSON.stringify(t.scaleOutHistory)}`);
            }
        });
    }
}

main().catch(console.error);
