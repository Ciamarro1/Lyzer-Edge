import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../env.js';
process.env.ARL_MODE = 'SIMULATION';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SYMBOL = 'BTCUSDT';
const INGESTION_LIMIT = 36000;
let progressCounter = 0;

// MUTE the noisy engine logs for backtesting speed
const originalLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && (args[0].includes('[STREAM] Processing') || args[0].includes('STARTING ABLATION') || args[0].includes('=== ABLATION') || args[0].includes('Processed') || args[0].includes('[!] Ablation'))) {
        originalLog.apply(console, args);
    }
};
// console.warn = () => {};
// console.error = () => {};

async function runAblation(name, envOverrides) {
    console.log(`\n========================================`);
    console.log(`🔥 STARTING ABLATION: ${name}`);
    console.log(`========================================`);
    
    // Set envs
    Object.keys(envOverrides).forEach(k => process.env[k] = envOverrides[k]);

    // DYNAMIC IMPORT AFTER ENVS ARE SET
    const { StreamEngine } = await import(`../streamEngine.js?t=${Date.now()}`); // force re-evaluate
    const { ExchangeExecution } = await import(`../exchangeExecution.js?t=${Date.now()}`);

    const engine = new StreamEngine({ symbol: SYMBOL, mode: 'SIMULATION' });
    engine.execution = new ExchangeExecution('SIMULATION'); // INJECT MOCK EXECUTION
    
    const trades = [];
    let initialWallet = 10000;
    
    engine.on('arl', (event) => {
        if (event.type === 'arl' && event.trade && event.trade.status === 'closed') {
            const t = event.trade;
            const slippagePct = parseFloat(process.env.ADVERSARIAL_SLIPPAGE || '0');
            // pnl is already a raw decimal number (e.g. 0.023)
            const absolutePnl = t.pnl * initialWallet; // PNL in dollars
            
            // Apply adversarial slippage penalty (0.05% of trade value * 2 legs)
            const slippagePenalty = (initialWallet * slippagePct * 2);
            const finalTradePnl = absolutePnl - slippagePenalty;
            
            // Recompute result
            let result = 'BREAK_EVEN';
            if (finalTradePnl > 0) result = 'WIN';
            if (finalTradePnl < 0) result = 'LOSS';
            
            initialWallet += finalTradePnl;
            trades.push({
                ...t,
                result,
                walletBalance: initialWallet,
                slippagePenaltyApplied: slippagePenalty,
                finalTradePnl
            });
        }
    });

    const historicalFile = path.join(__dirname, `../../historical_data_${SYMBOL}.json`);
    const rawData = fs.readFileSync(historicalFile, 'utf8');
    const allCandles = JSON.parse(rawData);
    
    const warmupCandles = allCandles.slice(0, 10000);
    const activeCandles = allCandles.slice(10000, INGESTION_LIMIT);
    
    // Warmup
    engine.ingestor = { onTick: () => {} };
    engine.mtfCandles = { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] };
    engine.setupMtfAliases();
    engine.candles = engine.mtfCandles['1m'];
    engine.initializeExecution();

    for (const c of warmupCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, true);
    }
    
    engine.ingestor.onTick = (candle) => {
        engine.checkTickPositionExit(candle);
        engine.emit('arl', { type: 'tick', symbol: engine.symbol, market: candle, mode: engine.mode });
    };

    console.log(`[STREAM] Processing ${activeCandles.length} active candles under ADVERSARIAL stress...`);
    progressCounter = 0;
    for (const c of activeCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, false);
        engine.ingestor.onTick(tickEvent);
        
        progressCounter++;
        if (progressCounter % 5000 === 0) console.log(`Processed ${progressCounter}/${activeCandles.length}...`);
    }

    const filepath = path.join(__dirname, `../../ablation_${name}_${SYMBOL}.json`);
    fs.writeFileSync(filepath, JSON.stringify(trades, null, 2));
    
    console.log(`[!] Ablation ${name} finished. Total Trades: ${trades.length}. Final Wallet: $${initialWallet.toFixed(2)}`);
    return { name, trades: trades.length, finalWallet: initialWallet };
}

async function main() {
    process.env.COURT_SECRET_KEY = "MOCK_SECRET";
    process.env.TRG_THRESHOLD = "0.35";
    process.env.RESIDUAL_CONSENSUS_LIMIT = "0.005";
    process.env.INTRABAR_PESSIMISM = "true"; // Always on for adversarial
    process.env.ADVERSARIAL_SLIPPAGE = "0.0005"; // 0.05% per trade leg

    const matrix = [
        {
            name: "PERFECT",
            env: { ABLATION_NO_LHDS: 'false', ABLATION_NO_GOLDEN_HOURS: 'false', ABLATION_NO_BE: 'false', ABLATION_NO_TRAILING: 'false' }
        },
        {
            name: "MINUS_LHDS",
            env: { ABLATION_NO_LHDS: 'true', ABLATION_NO_GOLDEN_HOURS: 'false', ABLATION_NO_BE: 'false', ABLATION_NO_TRAILING: 'false' }
        },
        {
            name: "MINUS_GOLDEN_HOURS",
            env: { ABLATION_NO_LHDS: 'false', ABLATION_NO_GOLDEN_HOURS: 'true', ABLATION_NO_BE: 'false', ABLATION_NO_TRAILING: 'false' }
        },
        {
            name: "MINUS_BE",
            env: { ABLATION_NO_LHDS: 'false', ABLATION_NO_GOLDEN_HOURS: 'false', ABLATION_NO_BE: 'true', ABLATION_NO_TRAILING: 'false' }
        },
        {
            name: "MINUS_TRAILING",
            env: { ABLATION_NO_LHDS: 'false', ABLATION_NO_GOLDEN_HOURS: 'false', ABLATION_NO_BE: 'false', ABLATION_NO_TRAILING: 'true' }
        }
    ];

    const results = [];
    for (const test of matrix) {
        const res = await runAblation(test.name, test.env);
        results.push(res);
    }
    
    console.log(`\n=== ABLATION MATRIX RESULTS ===`);
    console.table(results);
}

main().catch(console.error);
