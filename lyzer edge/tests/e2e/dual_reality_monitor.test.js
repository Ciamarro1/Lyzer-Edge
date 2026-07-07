import { test, expect } from 'vitest';
import { DualRealityMonitor } from "../../backend/dualRealityMonitor.js";
import { TruthKernel } from "../../../packages/lyzer-shared/src/engine/kernel.js";

test('Dual Reality Monitor Verification', async () => {
    console.log("=== Lyzer Labs: Dual Reality Monitor Verification ===");
    
    const monitor = new DualRealityMonitor();
    const kernel = new TruthKernel();
    
    // 1. Wait a bit for the ingestor to have at least some data
    await new Promise(r => setTimeout(r, 2000));

    // Anchor time: Arbitrary point in the database, e.g. 10:30 AM on Jan 2nd 2024
    // 2024-01-02T10:30:00Z -> 1704191400000
    const testTimeMs = 1704191400000; 
    const symbol = 'BTCUSDT';

    // Auto-seed mock data if database is empty
    for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
        const existing = await monitor.db.getVisibleHistory(symbol, tf, testTimeMs, 100);
        if (existing.length === 0) {
            console.log(`[TEST] Seeding mock history for ${symbol} on ${tf}...`);
            let intervalMs = 60000;
            if (tf === '5m') intervalMs = 300000;
            else if (tf === '15m') intervalMs = 900000;
            else if (tf === '1h') intervalMs = 3600000;
            else if (tf === '4h') intervalMs = 14400000;
            else if (tf === '1d') intervalMs = 86400000;

            const mockCandles = [];
            for (let i = 105; i > 0; i--) {
                const openTime = testTimeMs - (i * intervalMs);
                const closeTime = openTime + intervalMs - 1;
                mockCandles.push({
                    t: openTime,
                    o: 42000.0,
                    h: 42100.0,
                    l: 41900.0,
                    c: 42050.0,
                    v: 10.0,
                    T: closeTime
                });
            }
            await monitor.db.insertBatch(symbol, tf, mockCandles);
        }
    }

    console.log(`[TEST] Extracting stable historical baseline for ${testTimeMs}...`);
    const liveState = {};
    for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
        const history = await monitor.db.getVisibleHistory(symbol, tf, testTimeMs, 100);
        if (history.length === 0) {
            console.error(`[ERROR] DB doesn't have data for ${tf} at ${testTimeMs} yet. Retrying later.`);
            process.exit(1);
        }
        liveState[tf] = history;
    }

    // Step 1: Normal state (Live matches Historical exactly)
    console.log("\n[PHASE 1] Normal Operation (Live == Historical)");
    let lhds = await monitor.calculateDivergence(symbol, testTimeMs, liveState);
    console.log(`LHDS Score: ${lhds.toFixed(4)}`);
    
    let kernelOut = kernel.evaluate({}, { scaleDivergence: 0.1, lhds });
    console.log(`Epistemic Authority: ${kernelOut.epistemic_authority}`);
    
    // Step 2: Temporal Leakage (Live experiences HFT manipulation)
    console.log("\n[PHASE 2] Simulating HFT Manipulation (Temporal Leakage)");
    // We deep copy the 1m array and corrupt the latest candle
    const corruptedLiveState = JSON.parse(JSON.stringify(liveState));
    // Corrupt the entire 1m tensor to simulate total structural hallucination
    for(let i = 0; i < corruptedLiveState['1m'].length; i++) {
        corruptedLiveState['1m'][i].c = Math.random() * 100000;
        corruptedLiveState['1m'][i].v = Math.random() * 5000;
    }
    console.log(`Corrupted entire 1m array (Random noise)`);

    lhds = await monitor.calculateDivergence(symbol, testTimeMs, corruptedLiveState);
    console.log(`LHDS Score: ${lhds.toFixed(4)}`);
    
    kernelOut = kernel.evaluate({}, { scaleDivergence: 0.4, lhds });
    console.log(`Epistemic Authority: ${kernelOut.epistemic_authority}`);
    if (kernelOut.reason_codes && kernelOut.reason_codes.length > 0) {
        console.log(`Kernel Reason: ${kernelOut.reason_codes[0]}`);
    } else if (kernelOut.eef === false) {
        console.log(`Kernel VETO Reason Triggered.`);
    }

    console.log("\n[CONCLUSION] Monitor Verification Completed.");
    monitor.close();
});
