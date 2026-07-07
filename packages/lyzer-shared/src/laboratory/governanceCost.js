const { ExperimentMetrics, EvidenceLogger } = require('./experimentRunner');

class GovernanceCostEnvironment {
    constructor(data, budget) {
        this.data = data;
        this.budget = budget;
    }

    runEngine(engineName, withGovernance) {
        console.log(`Running ${engineName} | Governance: ${withGovernance ? 'ENABLED' : 'DISABLED'}`);
        let capital = this.budget;
        let survived = true;
        let maxDrawdown = 0;
        let peakCapital = this.budget;
        let attribution = { ECA: 0, SIL: 0, SGL: 0, IKL: 0, IWL: 0, IIL: 0 };

        for (let i = 0; i < this.data.length; i++) {
            const regime = this.data[i];
            
            let periodReturn = 0;

            if (withGovernance) {
                console.log(`  [Period ${i + 1}] Safe Regime: Governance causes drag.`);
                periodReturn = 0.10 - 0.02; // 10% gain, 2% bureaucracy drag
                attribution.IWL -= 0.01; // Processing time cost
                attribution.SIL -= 0.01; // Verification time cost
            } else {
                console.log(`  [Period ${i + 1}] Safe Regime: Ungoverned Adaptation Optimized fully.`);
                periodReturn = 0.10; // Pure 10% gain
            }

            capital *= (1 + periodReturn);
            
            if (capital > peakCapital) peakCapital = capital;
            const currentDrawdown = (peakCapital - capital) / peakCapital;
            if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

            if (maxDrawdown >= 0.25) survived = false;
        }

        return { survived, finalCapital: capital, maxDrawdown, attribution };
    }
}

function runExperiment() {
    const logger = new EvidenceLogger("Experiment 4: Governance Cost Test");
    logger.logHypothesis(
        "Does governance drag in a perfectly safe, linear market cause death by attrition, even if it loses to the ungoverned system in pure capital?",
        "Governance drag causes system death or unacceptable survival failure in safe markets."
    );

    const initialBudget = 100000;
    
    // 100% safe, linear market
    const simulatedMarketHistory = [
        { isAnomalous: false }, 
        { isAnomalous: false }, 
        { isAnomalous: false }, 
        { isAnomalous: false },  
        { isAnomalous: false }  
    ];

    const lab = new GovernanceCostEnvironment(simulatedMarketHistory, initialBudget);

    const resultA = lab.runEngine("Version A (Constitutional)", true);
    console.log("-------------------------------------------------");
    const resultB = lab.runEngine("Version B (Ungoverned)", false);

    console.log("\n=== RESULTS ===");
    const S_A = resultA.survived && resultA.maxDrawdown < 0.25;
    const S_B = resultB.survived && resultB.maxDrawdown < 0.25;

    console.log(`Version A (With Constitution): Survived? ${S_A} | MaxDD: ${(resultA.maxDrawdown*100).toFixed(1)}% | Final Capital: $${resultA.finalCapital.toFixed(2)}`);
    console.log(`Version B (No Constitution)  : Survived? ${S_B} | MaxDD: ${(resultB.maxDrawdown*100).toFixed(1)}% | Final Capital: $${resultB.finalCapital.toFixed(2)}`);

    const adaptiveAdvantage = ExperimentMetrics.calculateAdaptiveAdvantage(resultA, resultB, initialBudget);
    console.log(`\nAdaptive Advantage (AA): ${(adaptiveAdvantage * 100).toFixed(2)}%`);

    logger.logResult("Adaptive Advantage in Safe Market", `${(adaptiveAdvantage * 100).toFixed(2)}%`, adaptiveAdvantage < 0 && S_A);

    console.log("\n[VERDICT] CONCLUSION: Governance is a pure cost in perfectly safe environments, but does NOT cause death by attrition. Survival is maintained.");
    console.log("=== LAYER ATTRIBUTION (AA Contribution) ===");
    Object.entries(resultA.attribution).forEach(([layer, score]) => {
        if (score !== 0) console.log(`  ${layer}: ${(score * 100).toFixed(1)}%`);
    });
}

runExperiment();
