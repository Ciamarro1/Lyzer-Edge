import { FeatureRegistry } from '../orchestrator/FeatureRegistry.js';
import fs from 'fs';
import path from 'path';

const registry = new FeatureRegistry();

function buildRecoveryFeatures() {
    console.log("==================================================");
    console.log("🏭 BATCH 016 - PHASE A: RECOVERY FEATURE FACTORY");
    console.log("==================================================");

    // VELOCITY
    registry.register({
        id: "REC_VELOCITY_T3",
        family: "RECOVERY_VELOCITY",
        mathematical_definition: "Cumulative Return(t0 to t0+3) / Realized Volatility(14)",
        units: "volatility-adjusted return",
        normalization: "z-score local",
        dependencies: ["t0_event", "Return", "RealizedVol"],
        minimum_history: 14,
        causal_timestamp: "Close of t0+3",
        leakage_status: "CLEAN",
        stationarity_properties: "Stationary",
        source_lineage: ["Batch_015_Confound_Autopsy"]
    });

    registry.register({
        id: "REC_TIME_TO_50PCT",
        family: "RECOVERY_VELOCITY",
        mathematical_definition: "Count candles to recover 50% of t0 shock amplitude",
        units: "periods",
        normalization: "log scale",
        dependencies: ["t0_event", "Amplitude"],
        minimum_history: 0,
        causal_timestamp: "Trigger candle close",
        leakage_status: "CLEAN",
        stationarity_properties: "Bounded, potentially censored",
        source_lineage: ["Batch_015_Confound_Autopsy"]
    });

    // GEOMETRY
    registry.register({
        id: "REC_RESIDUAL_DEPTH",
        family: "RECOVERY_GEOMETRY",
        mathematical_definition: "(Close(t_eval) - Pre_Shock_Level) / ATR(14)",
        units: "ATR multiple",
        normalization: "None",
        dependencies: ["Pre_Shock_Level", "ATR"],
        minimum_history: 14,
        causal_timestamp: "Continuous",
        leakage_status: "CLEAN",
        stationarity_properties: "Stationary under mean-reversion",
        source_lineage: ["Batch_015_Confound_Autopsy"]
    });

    // PERSISTENCE
    registry.register({
        id: "REC_PERSISTENCE_RATIO_T5",
        family: "RECOVERY_PERSISTENCE",
        mathematical_definition: "Count(Closes in recovery direction, t0..t0+5) / 5",
        units: "ratio (0.0 - 1.0)",
        normalization: "None",
        dependencies: ["t0_event", "Direction"],
        minimum_history: 5,
        causal_timestamp: "Close of t0+5",
        leakage_status: "CLEAN",
        stationarity_properties: "Bounded",
        source_lineage: ["Batch_015_Confound_Autopsy"]
    });

    // VOLATILITY / RANGE
    registry.register({
        id: "REC_CANDLE1_BODY_RANGE_RATIO",
        family: "RECOVERY_RANGE",
        mathematical_definition: "ABS(Close(t0+1) - Open(t0+1)) / (High(t0+1) - Low(t0+1))",
        units: "ratio",
        normalization: "None",
        dependencies: ["t0_event"],
        minimum_history: 1,
        causal_timestamp: "Close of t0+1",
        leakage_status: "CLEAN",
        stationarity_properties: "Bounded (0-1)",
        source_lineage: ["Batch_015_Confound_Autopsy"]
    });

    console.log(`✅ Constructed ${registry.getAll().length} narrative-free mathematical features for Recovery Process.`);
    
    const outPath = path.resolve('./research/results/batch_016/BATCH_016_FEATURE_REGISTRY.json');
    registry.exportCatalog(outPath);
    console.log(`✅ Recovery Feature Registry serialized to ${outPath}`);
}

buildRecoveryFeatures();
