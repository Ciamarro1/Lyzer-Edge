# Orchestration Plan — Lyzer Edge Technical Debt & Security Hardening

## Overview
This plan orchestrates the technical debt resolution and security remediation for the Lyzer Edge repository (`E:\projcts\lyzer`), as specified in `ORIGINAL_REQUEST.md` and informed by audit findings in `ESTADO_REAL_LYZER_EDGE.md`.

## Milestones Breakdown

| Milestone | Target Scope | Core Tasks | Verification Criteria |
|---|---|---|---|
| **M1: Fix Prototype Pollution (R1)** | `db.js`, `server.js`, `streamEngine.js`, and all occurrences of `JSON.parse` + spread | Refactor unsafe object spread after `JSON.parse` across codebase; introduce safe parsing/sanitization helpers. | Unit tests & static check for prototype pollution vulnerabilities; no regressions in existing tests. |
| **M2: Fix SSRF Vulnerabilities (R2)** | `liveDataIngestor.js`, `exchangeExecution.js`, external HTTP/WS request modules | Validate/sanitize URLs and payloads strictly; restrict target domains/IPs; prevent private IP access. | Security/SSRF test suite; verify valid requests succeed and SSRF attempts fail. |
| **M3: DB Schema Migrations & DB Lifecycle (R3)** | `db.js`, SQLite schema, Court Ledger persistence | Implement schema migration framework (`PRAGMA user_version` + `_migrations`), add TTL for tables, persist Constitutional Court ledger in SQLite table `court_ledger`. | SQLite migration verification tests; court ledger survival across database restart; TTL cleanup verification. |
| **M4: Code Deduplication (R4)** | `packages/` vs `lyzer edge/` | Identify byte-for-byte identical duplicate files, eliminate redundancies, unify imports. | Clean file structure; code integrity check; unit test verification. |
| **M5: Final Verification & Integration Testing** | Entire codebase & `lyzer edge/tests/verification/verify_*.js` | Run full test suite; run adversarial check; run forensic auditor verification. | 100% of `verify_*.js` tests pass; Forensic Auditor CLEAN verdict. |

## Execution Methodology (Project Pattern)

For each milestone M1 through M4:
1. **Exploration**: Spawn 3 `teamwork_preview_explorer` agents to analyze target code, identify exact line numbers/vulnerabilities, and propose remediation strategies.
2. **Implementation**: Spawn 1 `teamwork_preview_worker` agent armed with detailed instructions and mandatory non-cheating/integrity warnings to implement the changes and execute unit tests.
3. **Review**: Spawn 2 `teamwork_preview_reviewer` agents independently to evaluate code quality, correctness, and side effects.
4. **Adversarial Verification**: Spawn 2 `teamwork_preview_challenger` agents to attempt edge cases / exploits against the milestone implementation.
5. **Forensic Audit**: Spawn 1 `teamwork_preview_auditor` agent to run static/runtime integrity checks.
6. **Gate Evaluation**: All 4 criteria must pass (Build/Tests Green, No Reviewer Veto, Challenger Pass, Forensic Auditor CLEAN).

## Phase Schedule
- **Phase 1**: Orchestration Setup, Project Spec & Explorer Dispatch for M1, M2, M3, M4
- **Phase 2**: Sequential/Parallel Implementation & Gate Verification for M1, M2, M3, M4
- **Phase 3**: Final Verification Suite Execution (`verify_*.js`), System Integration & Hardening
- **Phase 4**: Executive Summary & Final Handoff
