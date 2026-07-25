import { CausalMemoryDB } from './db.js';
import { ScaleNormalizer } from '../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js';
import { CrossScaleTensorGraph } from '../../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js';

async function runCrossAssetInference() {
    console.log("=== Lyzer Labs: Cross-Asset Causal Inference ===");
    console.log("[INFERENCE] Loading Historical Memory for BTCUSDT and ETHUSDT...");
    
    const db = new CausalMemoryDB();
    const normalizer = new ScaleNormalizer();
    const cstg = new CrossScaleTensorGraph();
    
    const SYMBOLS = ['BTCUSDT', 'ETHUSDT'];
    
    // We will sample 1-hour snapshots over the entire dataset (1 year)
    // 1 year has 8760 hours
    const startMs = 1704153600000; // Early Jan 2024
    
    // We get all the 1h close_time timestamps for BTC to use as our timeline
    const timelineRows = await new Promise((resolve, reject) => {
        db.db.all(`SELECT close_time FROM candles WHERE symbol = 'BTCUSDT' AND timeframe = '1h' ORDER BY close_time ASC`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    console.log(`[INFERENCE] Extracted ${timelineRows.length} macro timestamps for analysis.`);
    
    let systemicCollapses = 0;
    let btcIdiosyncratic = 0;
    let ethIdiosyncratic = 0;

    let btcSdsAvg = 0;
    let ethSdsAvg = 0;

    for (let i = 0; i < timelineRows.length; i++) {
        const tMs = timelineRows[i].close_time;
        
        // Fetch snapshot for BTC
        const btcHist = {};
        const ethHist = {};
        for (const tf of ['1m', '5m', '15m', '1h']) { // Using up to 1h for fast computation
            btcHist[tf] = await db.getVisibleHistory('BTCUSDT', tf, tMs, 100);
            ethHist[tf] = await db.getVisibleHistory('ETHUSDT', tf, tMs, 100);
        }

        // Calculate topologies
        const btcTensors = normalizer.alignScales(btcHist);
        const btcTopology = cstg.buildTopology(btcTensors);

        const ethTensors = normalizer.alignScales(ethHist);
        const ethTopology = cstg.buildTopology(ethTensors);

        // Calculate internal SDS (average edge distance)
        let btcSds = 0;
        if (btcTopology.edges.length > 0) {
            btcSds = btcTopology.edges.reduce((acc, e) => acc + e.distance, 0) / btcTopology.edges.length;
        }

        let ethSds = 0;
        if (ethTopology.edges.length > 0) {
            ethSds = ethTopology.edges.reduce((acc, e) => acc + e.distance, 0) / ethTopology.edges.length;
        }

        btcSdsAvg += btcSds;
        ethSdsAvg += ethSds;

        // Arbitrary Threshold for "High Structural Stress"
        const STRESS_THRESHOLD = 0.08; 

        if (btcSds > STRESS_THRESHOLD && ethSds > STRESS_THRESHOLD) {
            systemicCollapses++;
        } else if (btcSds > STRESS_THRESHOLD) {
            btcIdiosyncratic++;
        } else if (ethSds > STRESS_THRESHOLD) {
            ethIdiosyncratic++;
        }
        
        if (i > 0 && i % 1000 === 0) {
            console.log(`[INFERENCE] Processed ${i} macro snapshots...`);
        }
    }

    btcSdsAvg /= timelineRows.length;
    ethSdsAvg /= timelineRows.length;

    console.log(`\n==================================================`);
    console.log(`     CROSS-ASSET STRUCTURAL STRESS REPORT`);
    console.log(`==================================================`);
    console.log(`Total Snapshots Evaluated: ${timelineRows.length}`);
    console.log(`Average Baseline SDS (BTC): ${btcSdsAvg.toFixed(4)}`);
    console.log(`Average Baseline SDS (ETH): ${ethSdsAvg.toFixed(4)}`);
    console.log(`\n--- Risk Distribution ---`);
    console.log(`Systemic Tail Risk Events (BTC & ETH Collapse): ${systemicCollapses}`);
    console.log(`Idiosyncratic Risk (BTC Only): ${btcIdiosyncratic}`);
    console.log(`Idiosyncratic Risk (ETH Only): ${ethIdiosyncratic}`);
    
    // Conclusion Logic
    console.log(`\n[CONCLUSION]`);
    if (systemicCollapses > btcIdiosyncratic + ethIdiosyncratic) {
        console.log(`The market is deeply systemic. Structural collapses in one asset almost always drag the other. The Truth Kernel should use ETH as a validation anchor for BTC VETO decisions.`);
    } else {
        console.log(`The market exhibits significant idiosyncratic risk. Assets collapse structurally independent of each other. The Truth Kernel should NOT use ETH to veto BTC execution.`);
    }
    
    db.close();
}

runCrossAssetInference().catch(console.error);
