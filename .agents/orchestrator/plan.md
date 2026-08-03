# Orchestration Plan — Lyzer Edge Repository Cleanup & Dead Code Elimination

## Overview
This plan orchestrates the repository cleanup and dead code elimination for the Lyzer Edge repository (`E:\projcts\lyzer`), as specified in `ORIGINAL_REQUEST.md` (Follow-up 2026-08-02T13:58:49Z). It targets orphaned modules, abandoned experimentation code, obsolete scientific validation scripts, zombie tests, and unused files without compromising core architecture or deployment pipelines.

## Milestones Breakdown

| Milestone | Target Scope | Core Tasks | Verification Criteria |
|---|---|---|---|
| **M1: Dead Code & Orphan Mapping (R1)** | `PROJECT_INDEX.md`, `knowledge/passports/`, entire repository | Scan `knowledge/passports/`, `PROJECT_INDEX.md`, `packages/`, `lyzer edge/`, `src-rust/`, root directory for files with 0 dependents or legacy experiment status. Check reference graphs against `server.js`, `streamEngine.js`, Rust gateways, and root scripts (`deploy-experiments.ps1`, `backup_restore.py`). | Comprehensive mapping report from Explorers categorizing candidates for deletion vs. essential core files. |
| **M2: Deletion Plan Formulation (R2/R3)** | `.agents/orchestrator/implementation_plan.md` | Synthesize explorer findings into a detailed `implementation_plan.md` detailing every file to be deleted, why it is unreachable/orphaned, and safety guarantees for core pipelines. | Validated `implementation_plan.md` artifact ready for worker execution. |
| **M3: Safe Dead Code Elimination (R2/R3)** | Candidate unused/orphaned files across repository | Dispatch Worker to execute file deletions according to `implementation_plan.md`. Run `npm run build` and `npm run test:verify` in `lyzer edge/`. | Specified dead files removed; `npm run build` succeeds with 0 errors; `npm run test:verify` passes 100%. |
| **M4: Architectural Protection & Forensic Verification** | V1-V4 Engines, Constitutional Court, RiskGateway gRPC, deploy scripts | Dispatch Reviewers, Challengers, and Forensic Auditor to independently verify code integrity, build/test pass rates, deployment script viability, and absence of cheating or regression. | Reviewers PASS, Challengers CONFIRMED, Forensic Auditor CLEAN verdict; CI/CD scripts intact. |

## Execution Methodology (Project Pattern)

1. **Exploration**: Spawn 3 `teamwork_preview_explorer` agents to independently analyze `PROJECT_INDEX.md`, `knowledge/passports/`, and scan all system directories for unreferenced/orphaned files and dead code.
2. **Plan Formulation**: Synthesize findings into `.agents/orchestrator/implementation_plan.md`.
3. **Implementation**: Spawn 1 `teamwork_preview_worker` agent armed with implementation plan and mandatory non-cheating/integrity warnings to execute file deletions and run verification commands (`npm run build`, `npm run test:verify`).
4. **Review & Challenge**: Spawn 2 `teamwork_preview_reviewer` agents and 2 `teamwork_preview_challenger` agents to verify build/test outcomes, check deployment scripts, and ensure V1-V4 engines, Constitutional Court, and RiskGateway gRPC remain 100% operational.
5. **Forensic Audit**: Spawn 1 `teamwork_preview_auditor` agent to execute static/runtime integrity checks.
6. **Gate Evaluation**: All pass criteria must hold (Build/Tests Green, No Reviewer Veto, Challenger Pass, Forensic Auditor CLEAN).

## Phase Schedule
- **Phase 1**: Exploration Dispatch & Dead Code Mapping (M1)
- **Phase 2**: Deletion Plan Artifact Creation (`implementation_plan.md`) (M2)
- **Phase 3**: Worker Execution & Verification (`npm run build`, `npm run test:verify`) (M3)
- **Phase 4**: Review, Challenge & Forensic Integrity Audit (M4)
- **Phase 5**: Synthesis & Final Handoff Report
