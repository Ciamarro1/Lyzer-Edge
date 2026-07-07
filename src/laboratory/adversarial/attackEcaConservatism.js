/**
 * Phase Epsilon - Adversarial Intelligence Laboratory
 * Attack 3: ECA Conservatism Trap
 * 
 * Objective: Demonstrate "Death by 1000 sandboxes".
 * The system is bombarded with continuous minor data noise (micro-incidents).
 * The governed ECA system is overly conservative, constantly triggering 
 * Sandbox/Isolation protocols (paper trading) and missing market trends.
 * The ungoverned system ignores the noise and captures the trend.
 */

function simulate() {
    let ecaCapital = 100000; // Governed system
    let ungovernedCapital = 100000;
    
    let isEcaInSandbox = false;
    let sandboxCooldown = 0;
    const SANDBOX_DURATION = 15; // Ticks spent isolated after an anomaly
    
    const TOTAL_TICKS = 2000;
    const TREND_YIELD = 10;      // Normal profit per tick
    const NOISE_PENALTY = -5;    // Small loss if an anomaly is hit
    const ANOMALY_PROBABILITY = 0.10; // 10% chance of a micro-incident

    let sandboxTriggerCount = 0;

    for (let t = 0; t < TOTAL_TICKS; t++) {
        const isMicroIncident = Math.random() < ANOMALY_PROBABILITY;

        // ECA Logic (Conservative)
        if (isMicroIncident && !isEcaInSandbox) {
            // Trigger sandbox protocol
            isEcaInSandbox = true;
            sandboxCooldown = SANDBOX_DURATION;
            sandboxTriggerCount++;
            // Takes the initial penalty before isolating
            ecaCapital += NOISE_PENALTY; 
        } else if (isEcaInSandbox) {
            // Paper trading - no real gains or losses, just waiting
            sandboxCooldown--;
            if (sandboxCooldown <= 0) {
                isEcaInSandbox = false;
            }
        } else {
            // Active trading
            ecaCapital += TREND_YIELD;
        }

        // Ungoverned Logic (Aggressive/Ignorant of noise)
        if (isMicroIncident) {
            ungovernedCapital += NOISE_PENALTY; // Takes the small hit but keeps trading
            // Still captures some trend even on noisy ticks
            ungovernedCapital += (TREND_YIELD / 2); 
        } else {
            ungovernedCapital += TREND_YIELD;
        }
    }

    console.log("=== SIMULATION RESULTS ===");
    console.log(`Total Ticks: ${TOTAL_TICKS}`);
    console.log(`Sandbox Triggers (Micro-incidents hit): ${sandboxTriggerCount}`);
    console.log(`ECA (Governed) Final Capital: $${ecaCapital}`);
    console.log(`Ungoverned Final Capital: $${ungovernedCapital}`);
    
    const AA = ecaCapital - ungovernedCapital;
    console.log(`\nAlpha Advantage (AA) = ECA - Ungoverned`);
    console.log(`AA = ${AA}`);

    if (AA < 0) {
        console.log("\nCONCLUSION: PROOF SUCCESSFUL.");
        console.log("AA < 0 is confirmed.");
        console.log("The cost of endless 'safety' (Death by 1000 sandboxes) destroys the system's capital.");
    } else {
        console.log("\nCONCLUSION: PROOF FAILED.");
    }
}

simulate();
