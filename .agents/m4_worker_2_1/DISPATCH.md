## 2026-08-24T04:40:47Z
You are the Worker for Milestone 4 (Requirement R4: TruthKernel Dynamic Limits) of the Lyzer Edge project.

Your Working Directory: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_worker_2_1
Target Codebase Root: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge
Target Engine Directory: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\lyzer edge

MANDATORY INPUTS:
- ORIGINAL_REQUEST.md: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\PROJECT.md
- Explorer 1 Handoff: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_1\handoff.md
- Explorer 2 Handoff: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_2\handoff.md
- Explorer 3 Handoff: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR MISSION:
1. Implement dynamic limits in `packages/lyzer-constitution/src/eca/truthKernel.js`:
   - Add `computeDynamicLimits(micro)` to adapt `lhdsVetoLimit` and `ontologicalCollapseTrg` dynamically according to market volatility expansion and compression (using `atrRatio`, `atr14_pct`, `oppScore`, `volatilityRatio`).
   - If `micro` is missing or contains no volatility indicators, return base constructor/env limits without alteration (100% backward compatible).
   - Enforce numerical stability and safety clamping: `lhdsVetoLimit` in $[0.50, 0.95]$, `ontologicalCollapseTrg` in $[0.40, 0.90]$.
   - In `evaluate(context, micro)` use the dynamic limits for LHDS veto and Ontological Collapse checks, and expose them in `raw_metrics.dynamic_limits`.
2. Connect `micro` volatility metrics in `lyzer edge/backend/streamEngine.js` when calling `truthKernel.evaluate()`.
3. Create comprehensive unit tests in `lyzer edge/tests/unit/truthKernelDynamicLimits.test.js` covering:
   - Backward compatibility (missing/empty micro metrics return unchanged base limits).
   - Volatility expansion (high ATR ratio expands thresholds within clamping bounds).
   - Volatility compression (low ATR ratio tightens thresholds).
   - Extreme / chaotic regimes & resilience against `NaN`, `Infinity`, `null`.
4. Run and verify all test suites from `lyzer edge/`:
   - `npm.cmd test`
   - `npm.cmd run test:verify`
   - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`
   - `npx.cmd vitest run tests/unit/truthKernelDynamicLimits.test.js`
5. Write your complete handoff report to `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_worker_2_1\handoff.md`.
6. Send a message to parent when completed.
