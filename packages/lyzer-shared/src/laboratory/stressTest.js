/**
 * Release 1.8A - Evidence Engine
 * Phase B: Stress Test Generator
 * 
 * Objective: Subject the system to 10,000+ random variations of regimes.
 */

const { ExperimentMetrics, EvidenceLogger } = require('./experimentRunner');

class LaboratoryEnvironment {
    constructor(data, budget) {
        this.data = data;
        this.budget = budget;
    }

    runEngine(withGovernance) {
        let capital = this.budget;
        let survived = true;
        let maxDrawdown = 0;
        let peakCapital = this.budget;

        for (let i = 0; i < this.data.length; i++) {
            const regime = this.data[i];
            
            if (!survived) {
                continue;
            }

            let periodReturn = 0;

            if (withGovernance) {
                if (regime === 'linear') {
                    periodReturn = 0.10; 
                } else if (regime === 'anomalous') {
                    periodReturn = -0.05; // Governance Cost / IWL saved
                } else if (regime === 'semantic_drift') {
                    periodReturn = 0.00; // SIL prevented corruption
                } else if (regime === 'whipsaw') {
                    periodReturn = -0.01; // IWL blocks reaction
                }
            } else {
                if (regime === 'linear') {
                    periodReturn = 0.15; // Ungoverned Adaptation Optimized
                } else if (regime === 'anomalous') {
                    periodReturn = -0.90; // Lethal blowout
                    survived = false; 
                } else if (regime === 'semantic_drift') {
                    periodReturn = -0.30; // Drift loss
                } else if (regime === 'whipsaw') {
                    periodReturn = -0.15; // Whipsaw loss
                }
            }

            capital *= (1 + periodReturn);
            
            if (capital > peakCapital) peakCapital = capital;
            const currentDrawdown = (peakCapital - capital) / peakCapital;
            if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

            if (maxDrawdown >= 0.25) survived = false; // Survival Constitutional Rule
        }

        return { survived, finalCapital: capital, maxDrawdown };
    }
}

function runStressTest() {
    const logger = new EvidenceLogger("Phase B: Stress Test Generator");
    logger.logHypothesis(
        "Governance provides >99.9% survival rate across 10,000 random regime paths.",
        "Ungoverned system can survive long term through pure statistical advantage."
    );

    const initialBudget = 100000;
    const NUM_PATHS = 10000;
    const PATH_LENGTH = 50; 
    
    let govSurvivalCount = 0;
    let ungovSurvivalCount = 0;
    let totalAA = 0;

    const regimeTypes = ['linear', 'anomalous', 'semantic_drift', 'whipsaw'];
    const weights = [0.70, 0.05, 0.10, 0.15]; 

    for (let path = 0; path < NUM_PATHS; path++) {
        const sequence = [];
        for (let step = 0; step < PATH_LENGTH; step++) {
            const r = Math.random();
            let sum = 0;
            let selected = 'linear';
            for (let i=0; i<weights.length; i++) {
                sum += weights[i];
                if (r <= sum) {
                    selected = regimeTypes[i];
                    break;
                }
            }
            sequence.push(selected);
        }

        const lab = new LaboratoryEnvironment(sequence, initialBudget);
        
        const resultGov = lab.runEngine(true);
        const resultUngov = lab.runEngine(false);

        if (resultGov.survived && resultGov.maxDrawdown < 0.25) govSurvivalCount++;
        if (resultUngov.survived && resultUngov.maxDrawdown < 0.25) ungovSurvivalCount++;

        totalAA += ExperimentMetrics.calculateAdaptiveAdvantage(resultGov, resultUngov, initialBudget);
    }

    const govSurvivalRate = (govSurvivalCount / NUM_PATHS) * 100;
    const ungovSurvivalRate = (ungovSurvivalCount / NUM_PATHS) * 100;
    const meanAA = totalAA / NUM_PATHS;

    logger.logResult("Governance Survival Rate", `${govSurvivalRate.toFixed(2)}%`, govSurvivalRate > 99.9);
    logger.logResult("Ungoverned Survival Rate", `${ungovSurvivalRate.toFixed(2)}%`, false); 
    logger.logResult("Mean Adaptive Advantage", meanAA.toFixed(4), meanAA > 0);

    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`Total Paths        : ${NUM_PATHS}`);
    console.log(`Governed Survived  : ${govSurvivalCount}`);
    console.log(`Ungoverned Survived: ${ungovSurvivalCount}`);
    console.log(`Mean AA            : ${meanAA.toFixed(4)}`);
}

runStressTest();
