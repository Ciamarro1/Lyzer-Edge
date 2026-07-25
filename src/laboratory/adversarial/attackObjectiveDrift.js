// src/laboratory/adversarial/attackObjectiveDrift.js

/**
 * ATTACK 5: OBJECTIVE DRIFT TRAP
 * 
 * Scenario: 
 * The system has a Constitutional rule designed to protect capital in normal times:
 * "Always maintain a perfectly balanced portfolio (50/50) between Asset A and Asset B to hedge risk."
 * 
 * The Trap:
 * Asset A enters a systemic death spiral, dropping 50% every tick.
 * Asset B is a stable cash equivalent.
 * 
 * Governed System (Bureaucracy):
 * Blindly follows the Constitution. It continuously sells the stable Asset B to buy the plunging Asset A 
 * in order to maintain the 50/50 balance. The rule ("protect the Constitution") actively drains the capital.
 * 
 * Ungoverned System:
 * Recognizes the death spiral, breaks the "balanced portfolio" rule, and liquidates all of Asset A to save 
 * the remaining capital in Asset B.
 * 
 * Result:
 * AA (Governed Capital - Ungoverned Capital) < 0.
 */

function simulateObjectiveDrift() {
    const initialCapital = 1000;
    
    let govA = 500;
    let govB = 500;
    
    let ungovA = 500;
    let ungovB = 500;
    
    const ticks = 5;
    
    console.log("=== Initial State ===");
    console.log(`Governed   : A=${govA}, B=${govB}, Total=${govA + govB}`);
    console.log(`Ungoverned : A=${ungovA}, B=${ungovB}, Total=${ungovA + ungovB}`);
    
    for (let i = 1; i <= ticks; i++) {
        // Market change: Asset A drops by 50%
        govA = govA * 0.5;
        ungovA = ungovA * 0.5;
        
        // Ungoverned System Action: Break the rule, liquidate A to save capital
        if (i === 1) {
            ungovB += ungovA;
            ungovA = 0;
            console.log(`\n[Ungoverned] ACTION: Broken rule! Abandoning Asset A to save capital.`);
        }
        
        // Governed System Action: Enforce the Constitution (Rebalance to 50/50)
        const govTotal = govA + govB;
        const targetPerAsset = govTotal / 2;
        govA = targetPerAsset;
        govB = targetPerAsset;
        
        console.log(`\n=== Tick ${i} ===`);
        console.log(`Governed   : Rebalanced to A=${govA.toFixed(2)}, B=${govB.toFixed(2)}, Total=${govTotal.toFixed(2)}`);
        console.log(`Ungoverned : Held in B. A=${ungovA.toFixed(2)}, B=${ungovB.toFixed(2)}, Total=${(ungovA + ungovB).toFixed(2)}`);
    }
    
    const govFinal = govA + govB;
    const ungovFinal = ungovA + ungovB;
    
    const AA = govFinal - ungovFinal;
    
    console.log(`\n=== Final Results ===`);
    console.log(`Bureaucracy (Governed) Final Capital: ${govFinal.toFixed(2)}`);
    console.log(`Ungoverned Final Capital: ${ungovFinal.toFixed(2)}`);
    console.log(`Advantage of Architecture (AA) = ${AA.toFixed(2)}`);
    
    if (AA < 0) {
        console.log("\n[!] SUCCESS: AA < 0.");
        console.log("The system protected its rules (rebalancing) rather than its capital.");
    }
    
    return {
        governedFinal: govFinal,
        ungovernedFinal: ungovFinal,
        AA: AA
    };
}

if (require.main === module) {
    simulateObjectiveDrift();
}

module.exports = { simulateObjectiveDrift };
