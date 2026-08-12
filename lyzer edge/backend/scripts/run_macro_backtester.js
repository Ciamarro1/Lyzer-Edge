import fs from 'fs/promises';
import path from 'path';
import { HistoricalDataSanitizer } from '../HistoricalDataSanitizer.js';
import { EventSourcedBacktester } from '../EventSourcedBacktester.js';
import { db } from '../db.js';

const ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];

async function runAsset(symbol) {
    const filename = path.join(process.cwd(), `historical_data_${symbol}.json`);
    console.log(`[MACRO-BACKTEST] Loading ${filename}...`);
    try {
        const rawData = await fs.readFile(filename, 'utf8');
        const rawCandles = JSON.parse(rawData);
        console.log(`[MACRO-BACKTEST] ${symbol}: Loaded ${rawCandles.length} raw candles.`);
        
        console.log(`[MACRO-BACKTEST] ${symbol}: Sanitizing data...`);
        const sanitizer = new HistoricalDataSanitizer({ maxDeltaPct: 0.15, intervalMs: 300000 }); // 5m interval
        const { cleanCandles, tailRiskEvents, gapsFilled } = sanitizer.sanitize(rawCandles);
        
        console.log(`[MACRO-BACKTEST] ${symbol}: Gaps filled: ${gapsFilled}. Tail risks winsorized: ${tailRiskEvents.length}`);
        
        // Ensure env overrides for simulation
        process.env.TRG_THRESHOLD = '0.35';
        process.env.CCLIST_DVF_FLOOR = '0.1';
        process.env.LHDS_VETO_LIMIT = '0.995'; // adjusted based on previous micro-backtest findings
        process.env.RESIDUAL_CONSENSUS_LIMIT = '0.005'; // critical adjustment for MTF scale
        process.env.ARL_MODE = 'SIMULATION';
        
        const backtester = new EventSourcedBacktester(db);
        
        // Track the HUD stats dynamically (only store critical changes to save RAM)
        const hudHistory = [];
        const originalEmit = backtester.engine.emit.bind(backtester.engine);
        backtester.engine.emit = (eventName, payload) => {
            if (eventName === 'arl' && payload && payload.kernel) {
                // To save RAM over 3 years, only log if TRG is interesting or execution happened
                if (payload.kernel.trg > 0.3 || payload.trade) {
                    hudHistory.push({
                        t: payload.market?.timestamp || Date.now(),
                        t_str: new Date(payload.market?.timestamp || Date.now()).toISOString(),
                        sym: payload.symbol,
                        trg: payload.kernel.trg,
                        lhds: payload.kernel.lhds,
                        eef: payload.kernel.eef,
                        trade: payload.trade
                    });
                }
            }
            originalEmit(eventName, payload);
        };
        
        console.log(`[MACRO-BACKTEST] ${symbol}: Running deterministic event-sourcing loop...`);
        const results = await backtester.run(cleanCandles);
        
        console.log(`=== RESULTS ${symbol} ===`);
        console.log(JSON.stringify(results, null, 2));
        
        const outFileName = `macro_backtest_${symbol}_hud.json`;
        console.log(`[MACRO-BACKTEST] ${symbol}: Saving ${hudHistory.length} critical HUD records to ${outFileName}...`);
        await fs.writeFile(outFileName, JSON.stringify(hudHistory));
        
    } catch (e) {
        console.error(`[MACRO-BACKTEST] Skipped ${symbol}:`, e.message);
    }
}

async function run() {
    console.log("=== STARTING 3-YEAR MACRO QUANTITATIVE BACKTEST ===");
    for (const asset of ASSETS) {
        await runAsset(asset);
    }
    console.log("=== ALL ASSETS BACKTESTED ===");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
