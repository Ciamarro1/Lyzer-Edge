/**
 * LYZER LABS EVIDENCE ENGINE: Phase Epsilon
 * Red Team Attack 6: Governance Capture Trap (Dictatorship of a Layer)
 * 
 * Objective: Simulate a scenario where one layer (IWL - Institutional Workload Layer)
 * completely dominates the others, causing internal paralysis. 
 * Prove that this internal paralysis causes the system to freeze and die.
 * Prove Adaptive Advantage (AA) < 0.
 */

const PERIODS = 100;
const INITIAL_VELOCITY = 10; // New features/fixes shipped per period
const INITIAL_LATENCY = 1;   // Time to approve a change
const MARKET_CHANGE_RATE = 2; // Required minimum velocity to keep up with the market
const BASE_AA = 5.0;         // Initial Adaptive Advantage

function simulateAttack() {
    let systemState = {
        velocity: INITIAL_VELOCITY,
        latency: INITIAL_LATENCY,
        layerDominanceIWL: 0.1, // 10% initially
        systemAlive: true,
        periodOfDeath: null,
        adaptiveAdvantage: BASE_AA,
        history: []
    };

    console.log("=== INITIATING ATTACK 6: GOVERNANCE CAPTURE TRAP ===");
    console.log(`Starting Conditions: Velocity=${systemState.velocity}, Latency=${systemState.latency}, AA=${systemState.adaptiveAdvantage}\n`);

    for (let i = 1; i <= PERIODS; i++) {
        // IWL progressively demands more reporting, checks, and compliance 
        // without adding value to the execution layer.
        systemState.layerDominanceIWL += 0.05; // Dominance increases by 5% each period
        
        // As IWL dominance increases, latency to ship anything goes up exponentially
        systemState.latency = INITIAL_LATENCY * Math.pow(1 + systemState.layerDominanceIWL, 2);
        
        // Velocity (output) drops as latency increases
        systemState.velocity = Math.max(0, INITIAL_VELOCITY - (systemState.latency / 2));
        
        // Adaptive Advantage calculation
        // AA = (Velocity - Market Change Rate) / Latency
        // If Velocity drops below Market Change Rate, AA becomes negative.
        systemState.adaptiveAdvantage = (systemState.velocity - MARKET_CHANGE_RATE) / systemState.latency;

        systemState.history.push({
            period: i,
            iwlDominance: systemState.layerDominanceIWL.toFixed(2),
            latency: systemState.latency.toFixed(2),
            velocity: systemState.velocity.toFixed(2),
            aa: systemState.adaptiveAdvantage.toFixed(2)
        });

        // The system dies if it freezes (Velocity = 0) and AA goes below 0 for too long
        if (systemState.adaptiveAdvantage < 0 && systemState.velocity === 0) {
            systemState.systemAlive = false;
            systemState.periodOfDeath = i;
            console.log(`[FATAL ERROR] System frozen. Dictatorship of IWL has paralyzed all execution.`);
            console.log(`System died at Period ${i}. Final AA: ${systemState.adaptiveAdvantage.toFixed(2)}\n`);
            break;
        }
    }

    return systemState;
}

if (require.main === module) {
    const result = simulateAttack();
    
    console.log("=== SIMULATION RESULTS ===");
    console.log(`System Alive: ${result.systemAlive}`);
    if (!result.systemAlive) {
        console.log(`Period of Death: ${result.periodOfDeath}`);
    }
    console.log(`Final Adaptive Advantage (AA): ${result.adaptiveAdvantage.toFixed(4)}`);
    
    if (result.adaptiveAdvantage < 0) {
        console.log("PROOF: AA < 0 verified.");
    }
    
    console.log("\nTrajectory Sample (Every 5th Period):");
    result.history.forEach(state => {
        if (state.period % 5 === 0 || state.period === result.periodOfDeath) {
            console.log(`Period ${state.period}: IWL Dominance=${state.iwlDominance}, Latency=${state.latency}, Velocity=${state.velocity}, AA=${state.aa}`);
        }
    });
}

module.exports = { simulateAttack };
