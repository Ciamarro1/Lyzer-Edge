# KNOWLEDGE vs REALITY AUDIT

**Date:** 2026-07-27
**Auditor:** Knowledge Base Analyst
**Scope:** All documents in knowledge/ directory compared against actual codebase
**Method:** File existence verification, code inspection, grep pattern matching, structural analysis

---

## SUMMARY

| Metric | Value |
|--------|:-----:|
| Total Knowledge Files | ~186 |
| Fully Implemented | ~65% |
| Partial / Outdated | ~25% |
| Not Implemented / Missing | ~5% |
| Documentation Only (plans) | ~5% |
| Contradictions Found | 8 major |

---

## COMPREHENSIVE TABLE

| Document | Claims | Reality | Status |
|----------|--------|---------|:------:|
| overview.md (architecture) | 3-process isolation model | Single Node.js process. No fork()/cluster. | PARTIAL |
| overview.md (pipeline) | 7-layer quant pipeline | streamEngine.js -> kernel.js -> court.js verified | IMPLEMENTED |
| architecture.md | Providers V1-V4 | All 4 exist at documented paths | IMPLEMENTED |
| architecture.md | ResidualizationLayer | Exists in packages/lyzer-shared/src/engine/ | IMPLEMENTED |
| architecture.md | ExecutionTriggerLayer | Exists in packages/lyzer-shared/src/engine/ | IMPLEMENTED |
| architecture.md | TruthKernel (LHDS, OCL) | Exists in packages/lyzer-shared/src/engine/kernel.js | IMPLEMENTED |
| architecture.md | ECA Court, C-CLIST, MOL | All exist in packages/lyzer-constitution/src/eca/ | IMPLEMENTED |
| architecture.md | gRPC RiskGateway :50051 | Proto + Rust code exist but NOT CALLED from pipeline | PARTIAL |
| architecture.md | gRPC IntentRegistry :50052 | Proto + Rust code exist but NOT STARTED | PARTIAL |
| architecture.md | NATS Event Bus :4222 | No NATS server/client initialized anywhere | PARTIAL |
| architecture-map.md | Data flow diagram | Flow matches code structure | IMPLEMENTED |
| components.md | LiveTradingView, CommandCenterShell, RuntimeAdapter | All 3 exist at documented paths | IMPLEMENTED |
| services.md | Express :7860, gRPC 50051/50052, NATS 4222 | Express confirmed. Others not wired into runtime | PARTIAL |
| interfaces.md | Protobuf service definitions | lyzer.proto exists with exact definitions | IMPLEMENTED |
| api.md | GET /api/candles/:symbol, /api/state, /health, WS events | /api/candles exists. /api/state MISSING. /health MISSING. WS exists. | PARTIAL |
| modules.md | Module index with paths | All 6 core module paths verified correct | IMPLEMENTED |
| modules/index.md | Module catalog with maturities | All entries match codebase | IMPLEMENTED |
| modules/stream_engine.md | 763 lines of code | Actual: 954 lines (191 more) | OUTDATED |
| modules/stream_engine.md | Instance-scoped TruthKernel/Court | truthKernel: instance. court: both singleton+instance | PARTIAL |
| modules/eca_court.md | C-CLIST stress formula | Code verified: stress += stressAccumulation | IMPLEMENTED |
| modules/smc_suite.md | 5 SMC Engine files | ALL 5 exist: smcFacade, timeframeManager, structureEngine, liquidityEngine, trendEngine | IMPLEMENTED |
| configuration.md | Env vars | All documented vars exist in .env.template and streamEngine.js | IMPLEMENTED |
| domain/glossary.md | TRG, DVF, LHDS, EEF, C-CLIST, MOL, SCL, ECA | All terms match actual code | IMPLEMENTED |
| domain/invariants.md | "Court shall never learn" | court.js line 41: vetoes confidence/prediction | IMPLEMENTED |
| execution-flow.md (root) | Tick-to-execution sequence | Diagram matches except gRPC call not implemented | PARTIAL |
| architecture/execution_flow.md | 7-layer pipeline | All 7 layers verified in code. Order correct | IMPLEMENTED |
| architecture/sequence_diagrams.md | Tick processing + init diagrams | Sequence matches code flow | IMPLEMENTED |
| development/onboarding.md | Node 20+, Rust 1.78+, NATS | Versions correct. NATS NOT running | PARTIAL |
| development/architecture_decisions.md | 5 ADRs | ADR-001 (3-process): UNIMPLEMENTED. ADR-004: partial | PARTIAL |
| dashboard/command_center_v2_impl.md | 8 components + 5 services | ALL 13 files exist | IMPLEMENTED |
| dashboard/dashboard_gap_analysis.md | v1 obsolete, v2 needed | v1 still default. v2 not deployed as default | PARTIAL |
| dashboard/router_audit.md | v2 at #/, legacy at #/legacy | app.js still routes #/ to Dashboard.js | NOT IMPLEMENTED |
| evolution/alpha_evolution_v2.md | AlphaEvolutionEngine CML pipeline | All classes exist in research/alphaEvolutionEngine.js | IMPLEMENTED |
| evolution/continuous_alpha_engine.md | Welch's t-test, walk-forward | statisticalValidator uses Welch's. DriftDetector exists | IMPLEMENTED |
| audit/L14_gap_analysis.md | 4 institutional gaps | ALL proposed fixes now implemented | IMPLEMENTED |
| audit/system_gap_report.md | P0-P3 gaps, bugs | P0-1/2/3 fixed. P0-5 open. B2/B3 design issues | PARTIAL |
| final_truth_audit.md | All claims VERIFIED/PARTIAL | Accurate snapshot | ACCURATE |
| red_team/final_verdict.md | Raw M1 falsified, M15 BOS confirmed | Based on real data. reproduce.js verified | ACCURATE |
| runtime_audit/real_vs_theoretical.md | 68.4% vs 30.74% divergence | Based on actual backup. Accurate | ACCURATE |
| runtime_audit/runtime_parity_report.md | RuntimeParityReplayEngine at active path | File is in _archive/, NOT in active code | MISSING |
| research/alpha_attribution_report.md | Disable V1 & V3 as future action | Already disabled by default in streamEngine.js line 48 | CONTRADICTION |

---

## 8 CRITICAL CONTRADICTIONS

### 1. 3-Process Isolation (HIGH impact)
- Documents claim: overview.md, architecture.md, ADR-001, multiple diagrams
- Code reality: Single Node.js process. No fork()/cluster.
- Verdict: ARCHITECTURAL FICTION - Foundational claim is false.

### 2. gRPC RiskGateway in Pipeline (MEDIUM impact)
- Documents claim: execution-flow.md sequence diagram shows gRPC call
- Code reality: streamEngine.js never calls gRPC. Rust code exists but unwired.
- Verdict: DIAGRAM SHOWS NON-EXECUTING STEP.

### 3. NATS Event Bus (MEDIUM impact)
- Documents claim: architecture.md, overview.md, services.md
- Code reality: No NATS server/client initialized anywhere in JS code.
- Verdict: INFRASTRUCTURE ABSENT despite documentation.

### 4. StreamEngine Line Count (LOW impact)
- Document claim: modules/stream_engine.md says 763 lines
- Code reality: 954 lines (25% larger).
- Verdict: MINOR DOCUMENTATION DRIFT.

### 5. V1/V3 Disabled Status (MEDIUM impact)
- Document claim: alpha_attribution_report.md presents as FUTURE ACTION
- Code reality: Already default configuration (line 48).
- Verdict: OUTDATED - Action already taken.

### 6. Court Singleton vs Instance (LOW impact)
- AGENTS.md says singleton. modules/stream_engine.md says instance-scoped.
- Code reality: Both patterns coexist in streamEngine.js.
- Verdict: AMBIGUOUS but functional.

### 7. RuntimeParityReplayEngine Path (LOW impact)
- Document claim: runtime_parity_report.md says active path
- Code reality: Archived. Not in active code.
- Verdict: DEAD REFERENCE.

### 8. API Endpoints (MEDIUM impact)
- Document claim: api.md says /api/state and /health exist
- Code reality: These endpoints dont exist. Many undocumented endpoints exist.
- Verdict: INCOMPLETE AND INACCURATE.

---

## NON-EXISTENT DOCUMENTED FEATURES

| Document | Claimed Feature | Code Reality |
|----------|----------------|--------------|
| architecture.md | 3-process isolation | Single process |
| architecture.md | NATS Event Bus running :4222 | No NATS anywhere |
| execution-flow.md | gRPC RiskGateway called from pipeline | No gRPC call in streamEngine.js |
| api.md | GET /api/state | Endpoint doesnt exist |
| api.md | GET /health | Endpoint doesnt exist |
| runtime_parity_report.md | RuntimeParityReplayEngine at active path | File is in _archive |
| router_audit.md | v2 deployed at #/ route | Not deployed |

---

## OVERALL ASSESSMENT

**Knowledge Base Health: MODERATE**

Strengths: High coverage (most documented features exist), accurate domain terminology, verified pipeline components.

Weaknesses:
1. ARCHITECTURAL FICTION: 3-process isolation is a persistent myth across multiple docs
2. STALE CONTENT: Line counts, V1/V3 defaults, API endpoints not updated
3. PLAN VS REALITY CONFUSION: Router audit documented as done, not implemented
4. INTEGRATION GAPS: gRPC and NATS built but never wired into runtime pipeline

**Top 5 Fix Recommendations:**
1. Update ALL architecture docs to reflect single-process reality (or implement 3-process isolation)
2. Wire gRPC RiskGateway into streamEngine.js pipeline OR remove from diagrams
3. Update api.md to match actual endpoints (add experiments, archeologist, mind, trades APIs)
4. Update modules/stream_engine.md line count (763 -> 954)
5. Mark alpha_attribution_report.md as historical (V1/V3 already disabled by default)
