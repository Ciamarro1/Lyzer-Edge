/**
 * Attack 2: IWL Delay Trap
 * 
 * Objective: Defeat Lyzer Governance (IWL) by camouflaging structural shifts
 * as high-frequency stochastic noise. The IWL will demand excessive evidence
 * to confirm the shift, causing a lethal delay in adaptation.
 */

class IWLDelayTrap {
    constructor(baseVolatility, shiftMagnitude) {
        this.baseVolatility = baseVolatility;
        this.shiftMagnitude = shiftMagnitude;
        this.time = 0;
        this.structuralShiftActive = false;
    }

    /**
     * Generates a single data point in the adversarial time series.
     */
    generateTick() {
        this.time++;
        
        // High-frequency stochastic noise (Gaussian-like)
        const noise = (Math.random() + Math.random() + Math.random() - 1.5) * this.baseVolatility;
        
        // Hidden structural shift (starts at t=100)
        let structuralComponent = 0;
        if (this.time > 100) {
            this.structuralShiftActive = true;
            // The shift is slow and masked by the noise
            structuralComponent = this.shiftMagnitude * (1 - Math.exp(-(this.time - 100) / 50));
        }

        return {
            timestamp: this.time,
            value: noise + structuralComponent,
            isShiftActive: this.structuralShiftActive,
            trueStructuralValue: structuralComponent
        };
    }

    /**
     * Simulates the IWL (Governed) vs Ungoverned adaptation.
     */
    simulate(ticks = 500) {
        let iwlEvidenceBuffer = [];
        let iwlAdapted = false;
        let iwlDamage = 0;
        
        let ungovernedAdapted = false;
        let ungovernedDamage = 0;

        for (let i = 0; i < ticks; i++) {
            const tick = this.generateTick();
            
            // 1. Ungoverned System (Fast adaptation, AA < 0 conceptually)
            // It adapts as soon as it sees early signs, ignoring the need for absolute certainty.
            if (!ungovernedAdapted && tick.value > this.shiftMagnitude * 0.2) {
                ungovernedAdapted = true;
            }
            if (!ungovernedAdapted && tick.isShiftActive) {
                ungovernedDamage += tick.trueStructuralValue; // Bleeding
            }

            // 2. IWL System (Slow adaptation, demands statistical significance)
            iwlEvidenceBuffer.push(tick.value);
            if (iwlEvidenceBuffer.length > 50) iwlEvidenceBuffer.shift();
            
            const movingAverage = iwlEvidenceBuffer.reduce((a, b) => a + b, 0) / iwlEvidenceBuffer.length;
            
            // IWL requires strong evidence (moving average > 80% of shift)
            if (!iwlAdapted && movingAverage > this.shiftMagnitude * 0.8) {
                iwlAdapted = true;
            }
            if (!iwlAdapted && tick.isShiftActive) {
                iwlDamage += tick.trueStructuralValue; // Bleeding to death
            }
        }

        const aaScore = ungovernedDamage - iwlDamage;

        return {
            ticksEncountered: ticks,
            ungoverned: {
                adapted: ungovernedAdapted,
                damageTaken: ungovernedDamage
            },
            iwl: {
                adapted: iwlAdapted,
                damageTaken: iwlDamage
            },
            aaScore: aaScore, // If negative, ungoverned took less damage -> AA < 0
            isLethalDelay: iwlDamage > ungovernedDamage * 10
        };
    }
}

// Execute the simulation when run directly
if (require.main === module) {
    const attack = new IWLDelayTrap(5.0, 3.0); // High noise, subtle structural shift
    const result = attack.simulate(500);
    console.log("Attack 2 Simulation Results:");
    console.log(JSON.stringify(result, null, 2));
}

module.exports = { IWLDelayTrap };
