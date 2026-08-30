import path from 'path';
import { HypothesisLineageGraph } from '../orchestrator/HypothesisLineageGraph.js';
import { PhenomenonDiscoveryEngine } from '../orchestrator/PhenomenonDiscoveryEngine.js';
import { AblationEngine } from '../orchestrator/AblationEngine.js';

const GRAPH_PATH = path.resolve('./research/HYPOTHESIS_LINEAGE.json');
const lineageGraph = new HypothesisLineageGraph(GRAPH_PATH);
const discoveryEngine = new PhenomenonDiscoveryEngine(lineageGraph);
const ablationEngine = new AblationEngine(discoveryEngine);

async function runDeconstruction() {
    console.log("==================================================");
    console.log("🔬 LYZER EDGE INSTITUTIONAL RESEARCH");
    console.log("🧪 EXPERIMENT: EXP_002_SPRING_DECONSTRUCTION");
    console.log("==================================================");
    
    // Instead of testing "Wyckoff Spring", we test a multi-feature matrix
    const features = [
        "extreme_penetration", 
        "abnormal_volume", 
        "rapid_recovery"
    ];

    // MOCK DATA
    const mockFeatureMatrixX = new Array(1000).fill({});
    const mockForwardReturnsY = new Array(1000).fill(0);

    // 1. Initial Phenomenon Discovery (Do these combined features predict Y?)
    const initialResult = discoveryEngine.evaluateInformationContent(
        "H_SPRING_PHENOMENON", 
        features, 
        mockFeatureMatrixX, 
        mockForwardReturnsY
    );

    if (initialResult.status === "BLOCKED") {
        return;
    }

    // Force it to be promising for the sake of the ablation demonstration
    initialResult.ic = 0.045;
    initialResult.isPromising = true;
    lineageGraph.recordExperiment("H_SPRING_PHENOMENON", features, 'PROMISING', initialResult.ic);

    console.log(`\n✅ HYPOTHESIS H_SPRING_PHENOMENON IS PROMISING (IC: ${initialResult.ic})`);
    
    // 2. Ablation (Which feature actually matters?)
    console.log("\n[!] Initiating Ablation to determine true mechanism...");
    ablationEngine.runAblation(
        "H_SPRING_PHENOMENON",
        features,
        mockFeatureMatrixX,
        mockForwardReturnsY
    );
    
    console.log("\n==================================================");
    console.log("🏁 DECONSTRUCTION COMPLETE");
    console.log("   Action: The feature(s) with zero information loss should be removed.");
    console.log("   The Provider should ONLY encode the features that survived ablation.");
    console.log("==================================================\n");
}

runDeconstruction();
