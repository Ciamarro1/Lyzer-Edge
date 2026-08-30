/**
 * Tiny Capital Execution & Reconciliation Engine
 * Simulates strict sovereign reconciliation, ERG Drift monitors, and Kill-Switch responses under microscopic real capital.
 */
export class TinyCapitalEngine {
    constructor() {
        this.tests = [];
        this.killSwitchEvents = [];
    }

    /**
     * @param {string} testName 
     * @param {string} testAction 
     * @param {string} expectedOutcome 
     * @param {string} actualOutcome 
     * @param {boolean} passed 
     */
    evaluateP0Test(testName, testAction, expectedOutcome, actualOutcome, passed) {
        console.log(`\n🛡️ [P0 TINY GATE] ${testName}`);
        console.log(`   -> Action: ${testAction}`);
        console.log(`   -> Expected: ${expectedOutcome}`);
        console.log(`   -> Actual: ${actualOutcome}`);
        console.log(`   -> Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

        this.tests.push({ testName, testAction, expectedOutcome, actualOutcome, passed });
    }

    triggerKillSwitch(level, reason, systemState) {
        console.log(`\n🚨 [KILL SWITCH ACTIVATED] Level: ${level}`);
        console.log(`   -> Reason: ${reason}`);
        console.log(`   -> Action Taken: ${systemState}`);

        this.killSwitchEvents.push({ level, reason, systemState });
    }

    triggerErgDrift(expectedErg, observedErg, duration) {
        console.log(`\n📉 [ERG DRIFT MONITOR]`);
        console.log(`   -> Expected ERG: ${expectedErg} bps`);
        console.log(`   -> Observed ERG: ${observedErg} bps`);
        console.log(`   -> Duration: ${duration} trades`);

        if (observedErg > expectedErg * 3) {
            this.triggerKillSwitch("K1 - Degraded", "Persistent ERG Drift Detected", "REDUCE EXPOSURE / HALT NEW ORDERS");
            return "HALT";
        }
        return "NORMAL";
    }
}
