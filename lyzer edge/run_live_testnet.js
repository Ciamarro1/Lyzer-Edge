import 'dotenv/config';
import { StreamEngine } from './backend/streamEngine.js';

// Setup environment variables to bypass normal safeguards and run TESTNET
process.env.ARL_MODE = 'TESTNET';
process.env.LIVE_TRADING_ENABLED = 'true';
process.env.MAX_DAILY_CAPITAL = '1000'; // 1000 USDT test capital

console.log("=== Lyzer Labs: Dual Reality Testnet Runner ===");
console.log("[ECA STRESS TEST] Initializing StreamEngine in TESTNET mode...");

const engine = new StreamEngine({
    mode: 'TESTNET',
    symbol: 'BTCUSDT',
    interval: '1m'
});

async function run() {
    try {
        await engine.startLiveMode();
        console.log("[ECA STRESS TEST] Stream connected and running. Awaiting WebSocket ticks...");
        
        // Let it run indefinitely. Use Ctrl+C to stop.
    } catch (err) {
        console.error("Critical Failure:", err);
    }
}

run();
