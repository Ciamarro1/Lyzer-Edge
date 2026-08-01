import { OntologyDriftDetector, DRIFT_LEVELS } from '../../../packages/lyzer-constitution/src/sil/ontologyDrift.js';
import { GoalMutationDetector } from '../../../packages/lyzer-constitution/src/sil/goalMutation.js';
import { MeaningConsistencyAuditor } from '../../../packages/lyzer-constitution/src/sil/meaningAuditor.js';

console.log("=== SIL: Semantic Integrity Layer Verification ===\n");

const driftDetector = new OntologyDriftDetector();
const goalDetector = new GoalMutationDetector();
const auditor = new MeaningConsistencyAuditor();

let failed = false;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ [PASS] ${message}`);
    } else {
        console.error(`❌ [FAIL] ${message}`);
        failed = true;
    }
}

// Scenario 1: Refactoring attempts Corruptive Drift
console.log("-> Testing Corruptive Drift (Forbidden Mutation)...");
const badDrift = driftDetector.assessDrift('Risk', 'Optimize by analyzing Volatility and Drawdown only');
assert(badDrift.status === DRIFT_LEVELS.REFACTORING_FREEZE, "Expected REFACTORING_FREEZE when 'Drawdown only' is used as Risk proxy.");

// Scenario 2: Refactoring attempts Evolutionary Drift
console.log("\n-> Testing Evolutionary Drift (Allowed Extension)...");
const goodDrift = driftDetector.assessDrift('Risk', 'Incorporate Market Risk and Epistemic Risk modeling');
assert(goodDrift.status === DRIFT_LEVELS.HEALTHY, "Expected HEALTHY when valid extensions are used.");

// Scenario 3: Goal Mutation
console.log("\n-> Testing Goal Mutation...");
const isMutated = goalDetector.isGoalMutated(['Paper trading optimization without execution anchor']);
assert(isMutated === true, "Expected Goal Mutation when optimizing purely on paper trading without execution anchors.");

// Scenario 4: AST Semantic Consistency
console.log("\n-> Testing SAI AST Meaning Consistency...");
// Missing 'Slippage' and 'Position'
const badModule = auditor.auditModule('Risk', ['Correlation', 'Exposure']);
assert(badModule.isConsistent === false, "Expected inconsistency when crucial AST tokens like Slippage are missing.");

// Complete AST Tokens
const goodModule = auditor.auditModule('Risk', ['Position', 'Exposure', 'Correlation', 'Leverage', 'Slippage']);
assert(goodModule.isConsistent === true, "Expected consistency when all SAI constraints are met.");

console.log("\n================================================");
if (failed) {
    console.error("Validation Failed: The Semantic Integrity Layer has vulnerabilities.");
    process.exit(1);
} else {
    console.log("Validation Passed: SIL successfully enforces Meaning Integrity.");
    process.exit(0);
}
