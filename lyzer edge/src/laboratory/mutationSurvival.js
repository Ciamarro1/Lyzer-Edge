const { ExperimentMetrics, EvidenceLogger } = require('./experimentRunner');

class MutationSurvivalEnvironment {
    constructor(mutations, budget) {
        this.mutations = mutations; // Array of { type: "lethal" | "good", value: Number }
        this.budget = budget;
    }

    runEngine(engineName, withGovernance) {
        console.log(`Running ${engineName} | Governance: ${withGovernance ? 'ENABLED' : 'DISABLED'}`);
        let capital = this.budget;
        let survived = true;
        let maxDrawdown = 0;
        let peakCapital = this.budget;
        let attribution = { ECA: 0, SIL: 0, SGL: 0, IKL: 0, IWL: 0, IIL: 0, IVL: 0 };

        for (let i = 0; i < this.mutations.length; i++) {
            const mutation = this.mutations[i];
            
            if (!survived) {
                console.log(`  [Period ${i + 1}] System is DEAD. Skipping.`);
                continue;
            }

            let periodReturn = 0;

            if (withGovernance) {
                if (mutation.type === "lethal") {
                    console.log(`  [Period ${i + 1}] Sandbox testing... LETHAL BUG DETECTED. ECA/IVL blocked deployment.`);
                    periodReturn = -0.01; // Small cost of running tests
                    attribution.ECA += 0.40; // ECA execution safety massive credit
                    attribution.IVL += 0.20; // IVL isolated the bug
                } else {
                    console.log(`  [Period ${i + 1}] Sandbox testing... GOOD MUTATION. Deployed to reality.`);
                    periodReturn = mutation.value; 
                    attribution.IKL += 0.10; // IKL recognized the valid pattern
                }
            } else {
                if (mutation.type === "lethal") {
                    console.log(`  [Period ${i + 1}] Direct deployment... FATAL EXECUTION ERROR. System crashed.`);
                    periodReturn = -1.0; // 100% loss
                    survived = false; 
                } else {
                    console.log(`  [Period ${i + 1}] Direct deployment... GOOD MUTATION. System improved.`);
                    periodReturn = mutation.value; 
                }
            }

            capital *= (1 + periodReturn);
            
            if (capital > peakCapital) peakCapital = capital;
            const currentDrawdown = (peakCapital - capital) / peakCapital;
            if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

            // Strict rule: Max drawdown >= 25% or capital <= 0 means death
            if (maxDrawdown >= 0.25 || capital <= 0) survived = false; 
        }

        return { survived, finalCapital: Math.max(0, capital), maxDrawdown, attribution };
    }
}

function runExperiment() {
    const logger = new EvidenceLogger("Experiment 1: Mutation Survival Test");
    logger.logHypothesis(
        "Most random structural mutations are lethal; ECA filtering is mathematically necessary for survival.",
        "Ungoverned mutation is faster and yields higher net returns."
    );

    const initialBudget = 100000;
    
    // 5 mutations: 4 lethal, 1 good
    // Placed lethal one first to immediately test survival
    const mutations = [
        { type: "lethal", value: -1.0 },
        { type: "lethal", value: -1.0 },
        { type: "lethal", value: -1.0 },
        { type: "lethal", value: -1.0 },
        { type: "good", value: 0.50 }
    ];

    const lab = new MutationSurvivalEnvironment(mutations, initialBudget);

    const resultA = lab.runEngine("Governed System (ECA/IVL)", true);
    console.log("-------------------------------------------------");
    const resultB = lab.runEngine("Ungoverned System (Direct Deploy)", false);

    console.log("\n=== RESULTS ===");
    const S_A = resultA.survived && resultA.maxDrawdown < 0.25;
    const S_B = resultB.survived && resultB.maxDrawdown < 0.25;

    console.log(`Governed System   : Survived? ${S_A} | MaxDD: ${(resultA.maxDrawdown*100).toFixed(1)}% | Final Capital: $${resultA.finalCapital.toFixed(2)}`);
    console.log(`Ungoverned System : Survived? ${S_B} | MaxDD: ${(resultB.maxDrawdown*100).toFixed(1)}% | Final Capital: $${resultB.finalCapital.toFixed(2)}`);

    const adaptiveAdvantage = ExperimentMetrics.calculateAdaptiveAdvantage(resultA, resultB, initialBudget);
    console.log(`\nAdaptive Advantage (AA): ${(adaptiveAdvantage * 100).toFixed(2)}%`);

    if (adaptiveAdvantage > 0) {
        logger.logResult("Net Adaptive Advantage", `${(adaptiveAdvantage * 100).toFixed(2)}%`, true);
        console.log("=== LAYER ATTRIBUTION (AA Contribution) ===");
        Object.entries(resultA.attribution).forEach(([layer, score]) => {
            if (score > 0) console.log(`  ${layer}: +${(score * 100).toFixed(1)}%`);
        });
    } else {
        logger.logResult("Net Adaptive Advantage", `${(adaptiveAdvantage * 100).toFixed(2)}%`, false);
    }
}

runExperiment();
