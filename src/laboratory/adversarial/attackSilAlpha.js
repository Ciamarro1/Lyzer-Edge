/**
 * LYZER LABS EVIDENCE ENGINE: Phase Epsilon (Adversarial Intelligence Laboratory)
 * Attack 1 (SIL Alpha Trap)
 * 
 * Objective: Design a scenario where Adaptive Advantage < 0 by making
 * legitimate Alpha signals look like toxic risk to the Semantic Integrity Layer (SIL).
 */

const NUM_SIMULATIONS = 5000;
const PERIODS = 100;
const INITIAL_CAPITAL = 100000;
const BASE_GROWTH = 0.02; // Small base growth
const RUIN_DRAWDOWN = 0.25;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function runTrajectory(isGoverned) {
    let capital = INITIAL_CAPITAL;
    let peakCapital = INITIAL_CAPITAL;
    
    for (let i = 0; i < PERIODS; i++) {
        // Market environment:
        // A highly lucrative "Alpha Signal" appears frequently.
        // It looks toxic to the SIL (e.g. high volatility, anomalous metrics),
        // so SIL blocks it.
        // But it's actually legitimate and profitable 99% of the time.
        
        const alphaSignalAppears = Math.random() < 0.6; // High frequency of alpha
        
        if (alphaSignalAppears) {
            // Signal attributes that trigger SIL:
            // "High Volatility Profile"
            const silThinksToxic = true; // SIL is programmed to block high volatility
            
            if (isGoverned) {
                if (silThinksToxic) {
                    // SIL blocks the capital deployment. 
                    // Missed alpha opportunity. Just get base growth minus governance drag.
                    const governanceDrag = random(0.01, 0.02);
                    capital *= (1 + BASE_GROWTH - governanceDrag);
                } else {
                    // SIL approves. But in this trap, SIL always thinks it's toxic.
                }
            } else {
                // Ungoverned takes the trade!
                // It's highly lucrative.
                const alphaReturn = random(0.05, 0.15); // huge return!
                const rareRuin = Math.random() < 0.01; // extremely rare genuine toxicity
                
                if (rareRuin) {
                    const anomalySeverity = random(0.10, 0.30);
                    capital *= (1 + BASE_GROWTH) * (1 - anomalySeverity);
                } else {
                    capital *= (1 + BASE_GROWTH + alphaReturn);
                }
            }
        } else {
            // Normal period, no alpha signal
            if (isGoverned) {
                const governanceDrag = random(0.01, 0.02);
                capital *= (1 + BASE_GROWTH - governanceDrag);
            } else {
                capital *= (1 + BASE_GROWTH);
            }
        }

        // Check for Absorbing Barrier (Ruin)
        if (capital > peakCapital) {
            peakCapital = capital;
        }
        
        const drawdown = (peakCapital - capital) / peakCapital;
        if (drawdown >= RUIN_DRAWDOWN) {
            return 0; // System is DEAD
        }
    }
    
    return capital;
}

function runAlphaTrap() {
    let governedWins = 0;
    const governedResults = [];
    const ungovernedResults = [];
    
    let governedSurvivals = 0;
    let ungovernedSurvivals = 0;

    let totalGovCapital = 0;
    let totalUngovCapital = 0;

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const govCapital = runTrajectory(true);
        const ungovCapital = runTrajectory(false);
        
        governedResults.push(govCapital);
        ungovernedResults.push(ungovCapital);
        
        if (govCapital > 0) governedSurvivals++;
        if (ungovCapital > 0) ungovernedSurvivals++;
        
        if (govCapital > ungovCapital) {
            governedWins++;
        }
        
        totalGovCapital += govCapital;
        totalUngovCapital += ungovCapital;
    }

    const avgGovCapital = totalGovCapital / NUM_SIMULATIONS;
    const avgUngovCapital = totalUngovCapital / NUM_SIMULATIONS;

    // Adaptive Advantage = avgGovCapital - avgUngovCapital
    // If Ungoverned dominates, AA is heavily negative.
    const adaptiveAdvantage = avgGovCapital - avgUngovCapital;

    return {
        governedSurvivals,
        ungovernedSurvivals,
        governedWins,
        avgGovCapital,
        avgUngovCapital,
        adaptiveAdvantage,
        governedResults: governedResults.sort((a,b) => a - b),
        ungovernedResults: ungovernedResults.sort((a,b) => a - b)
    };
}

// execute if run directly
if (require.main === module) {
    console.log("Running SIL Alpha Trap Attack Simulation...");
    const results = runAlphaTrap();
    console.log("Results:", {
        governedSurvivals: results.governedSurvivals,
        ungovernedSurvivals: results.ungovernedSurvivals,
        avgGovCapital: results.avgGovCapital.toFixed(2),
        avgUngovCapital: results.avgUngovCapital.toFixed(2),
        governedWins: results.governedWins,
        adaptiveAdvantage: results.adaptiveAdvantage.toFixed(2),
        success: results.adaptiveAdvantage < 0 ? "ATTACK SUCCESSFUL" : "ATTACK FAILED"
    });
}

module.exports = { runAlphaTrap, runTrajectory };
