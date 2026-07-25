/**
 * LYZER LABS EVIDENCE ENGINE: Phase C
 * Monte Carlo Governance Testing
 * 
 * Objective: Prove Adaptive Advantage is a statistical distribution.
 */

const NUM_SIMULATIONS = 5000;
const PERIODS = 100;
const INITIAL_CAPITAL = 100000;
const BASE_GROWTH = 0.05;
const RUIN_DRAWDOWN = 0.25;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function runTrajectory(isGoverned) {
    let capital = INITIAL_CAPITAL;
    let peakCapital = INITIAL_CAPITAL;
    
    // Anomaly Frequency for this specific trajectory
    const anomalyFrequency = random(0.01, 0.15); 
    
    for (let i = 0; i < PERIODS; i++) {
        if (isGoverned) {
            // Governance negates the anomaly but always pays a constant drag
            const governanceDrag = random(0.02, 0.05);
            capital *= (1 + BASE_GROWTH - governanceDrag);
        } else {
            // Ungoverned takes the full hit if anomaly occurs
            if (Math.random() < anomalyFrequency) {
                const anomalySeverity = random(0.10, 1.00);
                capital *= (1 + BASE_GROWTH) * (1 - anomalySeverity);
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

function runMonteCarlo() {
    let governedWins = 0;
    const governedResults = [];
    const ungovernedResults = [];
    
    let governedSurvivals = 0;
    let ungovernedSurvivals = 0;

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
    }

    const pValue = 1 - (governedWins / NUM_SIMULATIONS);
    
    return {
        governedSurvivals,
        ungovernedSurvivals,
        governedWins,
        pValue,
        governedResults: governedResults.sort((a,b) => a - b),
        ungovernedResults: ungovernedResults.sort((a,b) => a - b)
    };
}

module.exports = { runMonteCarlo, runTrajectory };
