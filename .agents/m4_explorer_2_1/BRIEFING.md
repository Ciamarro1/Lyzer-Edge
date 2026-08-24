# BRIEFING — 2026-08-24T04:40:00Z

## Mission
Investigate and design dynamic limit adaptation for TruthKernel (LHDS veto limit and ontological collapse TRG limit) based on volatility expansion/compression while preserving 100% backward compatibility.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_1
- Original parent: e2b8b784-a427-4565-97fe-b8bd17935854
- Milestone: M4 (TruthKernel Dynamic Limits - R4)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- 100% backward compatibility when micro volatility indicators are absent
- Adhere to Lyzer Edge architecture and 5-component handoff report standard

## Current Parent
- Conversation ID: e2b8b784-a427-4565-97fe-b8bd17935854
- Updated: 2026-08-24T04:40:00Z

## Investigation State
- **Explored paths**:
  - `packages/lyzer-constitution/src/eca/truthKernel.js` (lines 23-24, 60, 98)
  - `lyzer edge/backend/streamEngine.js` (lines 63-64, 87, 578-620, 674-681, 784)
  - `packages/lyzer-shared/src/research/regimeClassifier.js` (lines 66, 98-117)
  - `lyzer edge/tests/e2e_smc/e2e_suite.test.js` (Tier 1 & Tier 2 F7/F8 tests)
  - `lyzer edge/tests/unit/p0_fixes.test.js`
  - `lyzer edge/tests/verification/verify_suite.test.js`
- **Key findings**:
  - Fixed limits `this.lhdsVetoLimit` (0.8) and `this.ontologicalCollapseTrg` (0.7) are hardcoded in `truthKernel.js`.
  - Dynamic limit formula $\kappa = 1.0 + 0.25(R_v - 1.0)$ with safety bounds $[0.70, 1.30]$ and threshold clamps $[0.50, 0.98]$ for LHDS and $[0.40, 0.95]$ for Collapse TRG.
  - 100% backward compatibility achieved by evaluating exact constructor defaults when volatility metrics are absent in `micro`.
- **Unexplored areas**: None for M4 exploration scope.

## Key Decisions Made
- Designed `computeDynamicLimits(micro)` supporting multi-source volatility adaptation (`atrRatio`, `volatilityRatio`, `atr14_pct`, `oppScore`).
- Ensured upper cap for LHDS veto never exceeds 0.98 to maintain LHDS 1.0 veto invariant.
- Documented full implementation blueprint and verification commands in `handoff.md`.

## Artifact Index
- `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_1\handoff.md` — 5-component handoff report
- `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_1\progress.md` — Heartbeat and task progress
- `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m4_explorer_2_1\DISPATCH.md` — Dispatch log
