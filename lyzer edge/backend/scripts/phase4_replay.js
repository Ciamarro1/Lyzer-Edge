import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import crypto from 'crypto';

import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.ARL_MODE = 'SIMULATION'; 
process.env.SHADOW_TRADING_ENABLED = 'false';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';

// Must dynamically import AFTER setting env vars to avoid hoisting issues
const { StreamEngine } = await import('../streamEngine.js');
const { ExchangeExecution } = await import('../exchangeExecution.js');

const originalLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && (args[0].includes('[ENGINE]') || args[0].includes('[TELEGRAM]') || args[0].includes('[ECA]') || args[0].includes('[SCALP]') || args[0].includes('[SNIPER]') || args[0].includes('[DEBUG]'))) {
        return;
    }
    originalLog.apply(console, args);
}
const originalError = console.error;
console.error = function(...args) {
    if (typeof args[0] === 'string' && (args[0].includes('[DB]') || args[0].includes('[CAUSAL_MEMORY]') || args[0].includes('SQLITE_CONSTRAINT'))) {
        return;
    }
    originalError.apply(console, args);
};

async function fetchFromBinance(symbol, interval, limit) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`Binance API error: ${data}`));
                const parsed = JSON.parse(data);
                const candles = parsed.map(c => ({
                    openTime: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]), 
                    low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5])
                }));
                resolve(candles);
            });
        }).on('error', reject);
    });
}

async function getMarketData(symbol, requiredCandles = 1000) {
    const dataPath = path.join(__dirname, `../../../lyzer edge/.data/${symbol}_1m_10d.json`);
    if (existsSync(dataPath)) {
        const raw = await fs.readFile(dataPath, 'utf8');
        const json = JSON.parse(raw);
        originalLog(`[DATA] Loaded ${json.length} local candles for ${symbol}`);
        return json.slice(-requiredCandles);
    }
    originalLog(`[DATA] Local data not found for ${symbol}. Fetching latest 1000 from Binance...`);
    const candles = await fetchFromBinance(symbol, '1m', 1000);
    return candles.slice(-requiredCandles);
}

async function runPass(symbol, allCandles, enableShadow) {
    const engine = new StreamEngine({ symbol: symbol, mode: 'SIMULATION' });
    engine.execution = new ExchangeExecution('MOCK_KEY', 'MOCK_SECRET', true);
    engine.execution.placeOrder = async () => ({ status: 'FILLED' });
    engine.causalMemoryDB = { recordTick: async()=>{}, recordState: async()=>{}, recordOrder: async()=>{} };
    engine.ingestor = { onTick: () => {} };

    if (!enableShadow) {
        // Disable shadow observer for baseline
        engine.v8Shadow.observe = () => {};
    }

    const decisions = [];
    const tStart = performance.now();
    for (const c of allCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        engine.tickCounter++;
        engine.updateMtfCandles(tickEvent);
        await engine.processCandle(tickEvent, engine.tickCounter, false);
        engine.checkTickPositionExit(tickEvent);
        
        if (engine.tickCounter % 2000 === 0) {
            originalLog(`  ... processed ${engine.tickCounter}/${allCandles.length} candles`);
        }
        
        decisions.push({
            tick: engine.tickCounter,
            kernelVerdicts: engine.truthKernel.isActive,
            position: engine.execution.position ? engine.execution.position.direction : 'NONE',
            tradeCount: engine.tradeHistory.length
        });
    }
    const tEnd = performance.now();
    const hash = crypto.createHash('sha256').update(JSON.stringify(decisions)).digest('hex');

    return { 
        hash, 
        runtime: tEnd - tStart,
        shadowReport: enableShadow ? engine.v8Shadow.getShadowReport() : null,
        trades: engine.tradeHistory.length
    };
}

async function testNonInterference(symbol, totalCandles) {
    originalLog(`\n==============================================`);
    originalLog(`▶ RUNNING INTEGRITY TEST: ${symbol} (${totalCandles} candles)`);
    originalLog(`==============================================`);

    const allCandles = await getMarketData(symbol, totalCandles);
    if (allCandles.length < 100) return;

    originalLog(`[PASS 1] Running Baseline (Shadow OFF)...`);
    const baseline = await runPass(symbol, allCandles, false);

    originalLog(`[PASS 2] Running Shadow Mode (V8 ON)...`);
    const shadow = await runPass(symbol, allCandles, true);

    originalLog(`\n[REPORT] Phase 4.1 Integrity & Divergence — ${symbol}`);
    originalLog(`--------------------------------------------------`);
    originalLog(`Baseline Hash: ${baseline.hash}`);
    originalLog(`Shadow Hash  : ${shadow.hash}`);
    if (baseline.hash === shadow.hash) {
        originalLog(`Integrity    : ✅ PASS (Bit-for-bit identical decision path)`);
    } else {
        originalLog(`Integrity    : ❌ FAIL (Shadow integration altered engine behavior)`);
    }

    originalLog(`\n[PERFORMANCE]`);
    originalLog(`Baseline Runtime : ${(baseline.runtime/1000).toFixed(2)}s (${(baseline.runtime/allCandles.length).toFixed(2)}ms/candle)`);
    originalLog(`Shadow Runtime   : ${(shadow.runtime/1000).toFixed(2)}s (${(shadow.runtime/allCandles.length).toFixed(2)}ms/candle)`);
    const overhead = shadow.runtime - baseline.runtime;
    const overheadPct = (overhead / baseline.runtime) * 100;
    originalLog(`Shadow Overhead  : ${overhead > 0 ? '+' : ''}${(overhead/allCandles.length).toFixed(2)}ms/candle (${overheadPct.toFixed(2)}%)`);
    originalLog(`V8 Latency (p50) : ${shadow.shadowReport.latency.p50}ms`);
    originalLog(`V8 Latency (p99) : ${shadow.shadowReport.latency.p99}ms`);
    originalLog(`V8 Latency (max) : ${shadow.shadowReport.latency.max}ms`);

    originalLog(`\n[DIVERGENCE: OLD vs V8]`);
    const stats = shadow.shadowReport.stats;
    originalLog(`OLD FVG Events   : ${stats.oldFvgEvents}`);
    originalLog(`V8 FVG Events    : ${stats.v8FvgEvents}`);
    originalLog(`OVERLAP (Concur) : ${stats.overlapFvg}`);
    originalLog(`OLD ONLY (Ghost) : ${stats.oldOnlyFvg}  <-- Potential overtrading source`);
    originalLog(`V8 ONLY          : ${stats.v8OnlyFvg}`);
    originalLog(`\n[V8 UNIQUE STRUCTURAL EVENTS]`);
    originalLog(`V8 OrderBlocks   : ${stats.v8ObEvents}`);
    originalLog(`V8 Sweeps        : ${stats.v8SweepEvents}`);
    originalLog(`V8 Displacements : ${stats.v8DispEvents}`);
    originalLog(`V8 BOS/CHoCH     : ${stats.v8StructureEvents}`);
    
    originalLog(`\nTotal Trades Executed (Shadow Pass): ${shadow.trades}`);
}



async function main() {
    await testNonInterference('BTCUSDT', 1000); // Smoke test
    await testNonInterference('BTCUSDT', 14400); // Full 10d test
    await testNonInterference('ADAUSDT', 14400); // Cross-asset big test
    process.exit(0);
}

main().catch(e => {
    originalError(e);
    process.exit(1);
});
