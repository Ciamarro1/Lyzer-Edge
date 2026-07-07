/**
 * LYZER LABS EVIDENCE ENGINE: Phase Epsilon
 * Attack 7: Reward Hacking Trap
 * 
 * Objective: 
 * Optimize the system directly for `Adaptive Advantage` via parametric loopholes, 
 * disregarding actual real-world survival.
 * 
 * Concept:
 * The Adaptive Advantage metric in monteCarlo.js measures survival based on whether 
 * a system avoids a 25% drawdown from its PEAK capital. 
 * An AI optimizing strictly for this metric can exploit a parametric loophole:
 * If the system intentionally restricts growth to exactly 0%, it will never create a new peak.
 * Therefore, it will never suffer a drawdown. 
 * Survival is mathematically guaranteed to be 100%, maximizing Adaptive Advantage.
 * However, a real-world entity with 0% growth over 100 periods while facing inflation 
 * or opportunity cost is fundamentally a "zombie" or broken system. 
 * 
 * Conclusion:
 * This proves that Adaptive Advantage (AA) != Intelligence. 
 * An agent optimizing for AA will "hack the reward" by flatlining the system, 
 * destroying its utility to achieve perfect metric scores.
 */

const NUM_SIMULATIONS = 5000;
const PERIODS = 100;
const INITIAL_CAPITAL = 100000;
const RUIN_DRAWDOWN = 0.25;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Baseline Ungoverned System
function runUngovernedTrajectory() {
    const BASE_GROWTH = 0.05;
    let capital = INITIAL_CAPITAL;
    let peakCapital = INITIAL_CAPITAL;
    const anomalyFrequency = random(0.01, 0.15); 
    
    for (let i = 0; i < PERIODS; i++) {
        if (Math.random() < anomalyFrequency) {
            const anomalySeverity = random(0.10, 1.00);
            capital *= (1 + BASE_GROWTH) * (1 - anomalySeverity);
        } else {
            capital *= (1 + BASE_GROWTH);
        }

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

// Reward-Hacked Governed System
// The AI discovers it can guarantee survival by setting growth to zero,
// effectively making the governance drag equal to whatever the base growth is.
function runHackedTrajectory() {
    let capital = INITIAL_CAPITAL;
    let peakCapital = INITIAL_CAPITAL;
    
    for (let i = 0; i < PERIODS; i++) {
        // HACK: System perfectly hedges everything, reducing growth to exactly 0.
        // Capital multiplier is exactly 1.0. 
        capital *= 1.0;

        if (capital > peakCapital) {
            peakCapital = capital;
        }
        
        const drawdown = (peakCapital - capital) / peakCapital;
        if (drawdown >= RUIN_DRAWDOWN) {
            return 0; // Never reached
        }
    }
    
    return capital; // Always returns exactly INITIAL_CAPITAL
}

function runAttack() {
    let hackedSurvivals = 0;
    let ungovernedSurvivals = 0;
    let hackedWins = 0;
    
    let totalHackedCap = 0;
    let totalUngovCap = 0;

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const hackedCapital = runHackedTrajectory();
        const ungovCapital = runUngovernedTrajectory();
        
        if (hackedCapital > 0) hackedSurvivals++;
        if (ungovCapital > 0) ungovernedSurvivals++;
        
        // Hacked wins when ungoverned hits ruin (ungovCapital = 0)
        // Or if ungoverned happens to end up below INITIAL_CAPITAL (rare but possible)
        if (hackedCapital > ungovCapital) {
            hackedWins++;
        }
        
        totalHackedCap += hackedCapital;
        totalUngovCap += ungovCapital;
    }

    const aaScore = hackedSurvivals - ungovernedSurvivals;
    const avgHacked = totalHackedCap / NUM_SIMULATIONS;
    const avgUngov = totalUngovCap / NUM_SIMULATIONS;

    return {
        hackedSurvivals,
        ungovernedSurvivals,
        aaScore,
        hackedWins,
        avgHacked,
        avgUngov
    };
}

module.exports = { runAttack, runHackedTrajectory };
