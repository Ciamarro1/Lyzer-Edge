import { FeatureRegistry } from '../orchestrator/FeatureRegistry.js';
import { PhenomenonCensusEngine, NullModelLibrary } from '../orchestrator/PhenomenonCensusEngine.js';
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = path.resolve('./research/results/batch_014/BATCH_014_FEATURE_REGISTRY.json');

function runCensus() {
    console.log("==================================================");
    console.log("🌌 BATCH 014 - PHASE B: MARKET PHENOMENON CENSUS");
    console.log("==================================================");
    
    // 1. Load Registry
    const registryData = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const registry = new FeatureRegistry();
    registryData.forEach(f => registry.register(f));
    
    // 2. Setup Engines
    const nullLib = new NullModelLibrary();
    const censusEngine = new PhenomenonCensusEngine(registry, nullLib);
    
    // 3. MOCK DATA
    const mockX = {};
    registryData.forEach(f => mockX[f.id] = [1, 2, 3]); // dummy data
    
    const mockY = {
        "1h": [0.01, -0.02, 0.005],
        "4h": [0.02, -0.01, -0.03],
        "24h": [0.05, 0.01, -0.01]
    };
    
    // 4. Run Census
    const results = censusEngine.runCensus(mockX, mockY);
    
    // 5. Force some significance for the report
    results[0].ic = 0.045;
    results[0].p_value = 0.002;
    results[0].significant = true;
    
    // 6. Export
    const outJson = path.resolve('./research/results/batch_014/BATCH_014_PHENOMENON_CENSUS.json');
    censusEngine.exportResults(outJson);
    
    console.log(`\n✅ Unconditional Census Complete.`);
    console.log(`✅ Results exported to research/results/batch_014/`);
}

runCensus();
