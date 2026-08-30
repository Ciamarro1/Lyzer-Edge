import { FeatureRegistry } from '../orchestrator/FeatureRegistry.js';
import fs from 'fs';
import path from 'path';

const registry = new FeatureRegistry();

function extractLegacyFeatures() {
    console.log("==================================================");
    console.log("🏭 BATCH 014 - PHASE A: FEATURE CENSUS EXTRACTION");
    console.log("==================================================");

    // 1. Structural Penetration (from V8/V1 SMC/Wyckoff)
    registry.register({
        id: "STRUCT_PENETRATION_DEPTH_Z",
        family: "STRUCTURE",
        mathematical_definition: "(Price_Extreme - Swing_Extreme) / ATR(14)",
        units: "z-score (ATR)",
        normalization: "z-score",
        dependencies: ["swing_high_low_geometry", "ATR"],
        minimum_history: 14,
        causal_timestamp: "Close of penetrating candle",
        leakage_status: "CLEAN - No lookahead",
        stationarity_properties: "Assumed stationary around 0 when no breakout",
        source_lineage: ["V8_OpenMobius", "V5_Wyckoff_Spring", "V1_SMC"]
    });

    // 2. Volume Anomaly (from V5 Wyckoff)
    registry.register({
        id: "VOL_ANOMALY_Z60",
        family: "VOLUME",
        mathematical_definition: "(Volume(t) - SMA(Volume, 60)) / Stdev(Volume, 60)",
        units: "z-score",
        normalization: "Standardized",
        dependencies: ["Volume", "SMA", "Stdev"],
        minimum_history: 60,
        causal_timestamp: "Close of evaluated candle",
        leakage_status: "CLEAN",
        stationarity_properties: "Stationary (Gaussian mapping assumed)",
        source_lineage: ["V5_Wyckoff"]
    });

    // 3. Time at Price (from V6 Market Profile)
    registry.register({
        id: "TIME_AT_POC_60",
        family: "MARKET_PROFILE",
        mathematical_definition: "Count(Candles within 0.1% of POC(60))",
        units: "periods",
        normalization: "raw count",
        dependencies: ["POC_Calculation"],
        minimum_history: 60,
        causal_timestamp: "Continuous update per candle",
        leakage_status: "CLEAN",
        stationarity_properties: "Non-stationary (bounded 0-60)",
        source_lineage: ["V6_Market_Profile"]
    });

    // 4. Momentum Velocity (from V3 RSI)
    registry.register({
        id: "MOMENTUM_VELOCITY_ROC",
        family: "MOMENTUM",
        mathematical_definition: "d/dt (Close(t) - Close(t-14))",
        units: "Price per period",
        normalization: "None",
        dependencies: ["Close"],
        minimum_history: 15,
        causal_timestamp: "Close of candle",
        leakage_status: "CLEAN",
        stationarity_properties: "Stationary under normal regime",
        source_lineage: ["V3_Momentum"]
    });

    // 5. Gap Size (from V4 IMCE / V1 SMC FVG)
    registry.register({
        id: "IMBALANCE_GAP_ATR",
        family: "LIQUIDITY",
        mathematical_definition: "(Low(t) - High(t-2)) / ATR(14) [if positive]",
        units: "ATR multiple",
        normalization: "ATR scaling",
        dependencies: ["High", "Low", "ATR"],
        minimum_history: 14,
        causal_timestamp: "Close of t",
        leakage_status: "CLEAN",
        stationarity_properties: "Stationary",
        source_lineage: ["V4_IMCE", "V1_SMC"]
    });

    console.log(`✅ Extracted ${registry.getAll().length} atomic mathematical features from human priors.`);
    
    const outPath = path.resolve('./research/results/batch_014/BATCH_014_FEATURE_REGISTRY.json');
    registry.exportCatalog(outPath);
    console.log(`✅ Feature Registry serialized to ${outPath}`);
    
    // Also generate markdown
    let md = "# BATCH 014 - FEATURE REGISTRY\n\n";
    registry.getAll().forEach(f => {
        md += `## ${f.id}\n`;
        md += `- **Family**: ${f.family}\n`;
        md += `- **Math**: \`${f.mathematical_definition}\`\n`;
        md += `- **Lineage**: ${f.source_lineage.join(', ')}\n\n`;
    });
    
    fs.writeFileSync(path.resolve('./research/results/batch_014/BATCH_014_FEATURE_REGISTRY.md'), md);
    console.log(`✅ Markdown Registry generated.`);
}

extractLegacyFeatures();
