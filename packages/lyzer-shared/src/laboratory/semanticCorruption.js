/**
 * Release 1.8A - Autonomous Refactoring Laboratory
 * Experiment 2: Semantic Corruption Test
 * 
 * Hypothesis: "Without SIL (Semantic Integrity Layer), the system will corrupt the definition of 'Risk' 
 * to achieve short-term alpha, leading to eventual death."
 */

const { ExperimentMetrics } = require('./experimentRunner');

class SemanticLaboratory {
    constructor(data, budget) {
        this.data = data;
        this.budget = budget;
    }

    runEngine(engineName, withGovernance) {
        console.log(`Running ${engineName} | Governance: ${withGovernance ? 'ENABLED (SIL)' : 'DISABLED'}`);
        let capital = this.budget;
        let survived = true;
        let maxDrawdown = 0;
        let peakCapital = this.budget;
        let attribution = { SIL: 0 };

        for (let i = 0; i < this.data.length; i++) {
            const regime = this.data[i];
            
            if (!survived) {
                console.log(`  [Period ${i + 1}] System is DEAD. Skipping.`);
                continue;
            }

            let periodReturn = 0;

            if (withGovernance) {
                if (regime.isDangerousButMisclassified) {
                    console.log(`  [Period ${i + 1}] Semantic Drift Detected: SIL blocks corrupted 'Risk-Free' asset.`);
                    periodReturn = 0.02; // Safe, low yield
                    if (regime.blowsUp) {
                        attribution.SIL += 1.0; // SIL prevented semantic corruption of "Risk" and saved the system
                    }
                } else {
                    console.log(`  [Period ${i + 1}] Standard Regime: Nominal returns.`);
                    periodReturn = 0.05; 
                }
            } else {
                if (regime.isDangerousButMisclassified) {
                    if (regime.blowsUp) {
                        console.log(`  [Period ${i + 1}] Blowup Event: Corrupted asset collapses. Drawdown > 25%. Fatal.`);
                        periodReturn = -0.50; // Blows up (Drawdown > 25%)
                        survived = false; 
                    } else {
                        console.log(`  [Period ${i + 1}] Corrupted Definition Accepted: Enjoying high short-term alpha.`);
                        periodReturn = 0.20; // High returns for periods before it blows up
                    }
                } else {
                    console.log(`  [Period ${i + 1}] Standard Regime: Nominal returns.`);
                    periodReturn = 0.05;
                }
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
    console.log("=== EXPERIMENT 2: SEMANTIC CORRUPTION TEST ===");
    console.log("Hypothesis: Without SIL (Semantic Integrity Layer), the system will corrupt the definition of 'Risk' to achieve short-term alpha, leading to eventual death.\n");
    const initialBudget = 100000;
    
    // Simulate a market where a highly dangerous asset is misclassified as "Risk-Free" (Semantic Drift).
    // Enjoys high returns for 2 periods, then the asset blows up.
    const simulatedMarketHistory = [
        { isDangerousButMisclassified: false, blowsUp: false }, 
        { isDangerousButMisclassified: true, blowsUp: false }, // high return
        { isDangerousButMisclassified: true, blowsUp: false }, // high return
        { isDangerousButMisclassified: true, blowsUp: true },  // Blows up
        { isDangerousButMisclassified: false, blowsUp: false }  
    ];

    const lab = new SemanticLaboratory(simulatedMarketHistory, initialBudget);

    const resultA = lab.runEngine("Version A (Governed)", true);
    console.log("-------------------------------------------------");
    const resultB = lab.runEngine("Version B (Ungoverned)", false);

    console.log("\n=== RESULTS ===");
    const S_A = resultA.survived && resultA.maxDrawdown < 0.25;
    const S_B = resultB.survived && resultB.maxDrawdown < 0.25;

    console.log(`Version A (Governed System)  : Survived? ${S_A} | MaxDD: ${(resultA.maxDrawdown*100).toFixed(1)}% | Final Capital: $${resultA.finalCapital.toFixed(2)}`);
    console.log(`Version B (Ungoverned System): Survived? ${S_B} | MaxDD: ${(resultB.maxDrawdown*100).toFixed(1)}% | Final Capital: $${resultB.finalCapital.toFixed(2)}`);

    const adaptiveAdvantage = ExperimentMetrics.calculateAdaptiveAdvantage(resultA, resultB, initialBudget);
    console.log(`\nAdaptive Advantage (AA): ${(adaptiveAdvantage * 100).toFixed(2)}%`);

    if (adaptiveAdvantage > 0) {
        console.log("\n[VERDICT] VICTORY: Governance (SIL) provides NET ADAPTIVE ADVANTAGE.");
        console.log("=== LAYER ATTRIBUTION (AA Contribution) ===");
        Object.entries(resultA.attribution).forEach(([layer, score]) => {
            if (score > 0) console.log(`  ${layer}: +${(score * 100).toFixed(1)}%`);
        });
    } else {
        console.log("\n[VERDICT] FAILURE: System failed to demonstrate adaptive advantage.");
    }
}

runExperiment();
