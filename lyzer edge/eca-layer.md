# Plan: External Constraint Layer (ECA) - Release 1.7.5

Architectural plan to build the External Constraint Layer (ECA) for the Lyzer Edge Analyst platform. This layer establishes a deterministic, structural boundary to safely unblock the Release 1.8 Autonomous Refactoring Engine.

## Overview
The ECA is implemented as a complete validation layer rather than a simple engine component. It is positioned between the Causal Intelligence Layer and the Autonomous Refactoring Engine. Any proposed self-modification must pass through the Constitutional Court, validating structural axioms and reality benchmarks.

## Project Type
- **Type:** WEB (Node.js engine)

## Success Criteria
- [ ] Refactoring proposals that exceed the daily cognitive budget are blocked (Exploration Spam control).
- [ ] Refactoring proposals that violate structural invariants are rejected with `CONSTITUTIONAL_VIOLATION` severity.
- [ ] Refactoring proposals that fail reality checks are rejected with `REJECTED` severity.
- [ ] Reality vectors (combining RDI, Walk Forward, Counterfactuals, and Live Deltas) are verified successfully.
- [ ] Causal triggers are logged in `src/eca/ledger.js`.
- [ ] Hard rollbacks restore the vault state and place failed builds under `src/eca/quarantine/`.

## Tech Stack
- **Node.js (ES Modules)**: Leverages existing JS syntax of the engines.

## File Structure
- `src/eca/`
  - `axioms.js` — Structural invariant definitions
  - `riskPolicy.js` — Financial/market limits (drawdown, allocation)
  - `proposalBudget.js` — Daily energy and failure caps for self-modification
  - `realityAnchor.js` — Multi-dimensional reality vector validation (RDI, Walk Forward, Stress, Counterfactual)
  - `court.js` — Gateway validator for self-refactorings with verdict levels
  - `vault.js` — Snapshot storage and state recovery manager
  - `ledger.js` — Causal constitutional history ledger
  - `quarantine/` — Directory for failed/rolled-back snapshots

- `verify_eca.js` — Sandbox test verification script

---

## Task Breakdown

### Task 1: Create axioms.js & riskPolicy.js (ECA-1)
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Separation of concerns (structural axioms vs financial parameters).
- **OUTPUT**: Files `src/eca/axioms.js` and `src/eca/riskPolicy.js`.
- **VERIFY**: Ensure imports work.

### Task 2: Create proposalBudget.js (ECA-6)
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Daily proposal and cognitive budget limits.
- **OUTPUT**: File `src/eca/proposalBudget.js` exporting the ProposalBudget class.
- **VERIFY**: Check budget limits reject proposals when daily cost exceeds threshold.

### Task 3: Create realityAnchor.js (ECA-2)
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Reality Vector parameters and trend/velocity evaluation logic.
- **OUTPUT**: File `src/eca/realityAnchor.js`.
- **VERIFY**: Test rejecting cases where RDI shows rapid upward acceleration or live delta is too low.

### Task 4: Create ledger.js (ECA-5)
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Logger interface matching schema with causal indicators.
- **OUTPUT**: File `src/eca/ledger.js`.
- **VERIFY**: Check data appends properly in-memory or to log files.

### Task 5: Create vault.js (ECA-4)
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P1
- **Dependencies**: None
- **INPUT**: System snapshot states and quarantine archive logic.
- **OUTPUT**: File `src/eca/vault.js` and folder `src/eca/quarantine/`.
- **VERIFY**: Rollback operations store the failed state into quarantine as a JSON file.

### Task 6: Create court.js (ECA-3)
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`
- **Priority**: P1
- **Dependencies**: Task 1, Task 2, Task 3, Task 4, Task 5
- **INPUT**: Evaluate proposal logic and output severity levels.
- **OUTPUT**: File `src/eca/court.js`.
- **VERIFY**: The evaluate function calls the ledger and decides correctly.

### Task 7: Create verify_eca.js Integration Test
- **Agent**: `test-engineer`
- **Skills**: `testing-patterns`
- **Priority**: P2
- **Dependencies**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
- **INPUT**: Scenario runner mimicking refactoring trials.
- **OUTPUT**: Main script `verify_eca.js` in the project root.
- **VERIFY**: Run `node verify_eca.js` and ensure all test scenarios pass.

---

## Phase X: Verification
- [ ] No purple/violet hex codes used in UI.
- [ ] Socratic Gate was respected.
- [ ] Full test script `node verify_eca.js` reports success.
- [ ] All checklist validation scripts pass.
