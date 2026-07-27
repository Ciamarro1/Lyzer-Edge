# DOCUMENTATION AUDIT DASHBOARD

**Executive Summary of everything found across 4 reports + synthesis**

---

## Overall Documentation Health

| Domain | Truth | Trend | Verdict |
|--------|:-----:|:-----:|:-------:|
| **Everything** | **42%** | 📉 | ⚠️ Critical gaps |
| Core Pipeline (7 layers) | 85% | 📈 | ✅ Working |
| Distributed Systems | 15% | 📉 | ❌ Fabricated |
| Constitution / Governance | 11% | 📉 | ❌ Broken |
| Knowledge Base | 65% | 📈 | ⚠️ Moderate |
| ADR Implementation | 58% | 📉 | ⚠️ Partial |

## 7 Audit Reports Created

| # | File | Focus | Size |
|:-:|------|-------|:----:|
| 1 | `ADR_CHRONOLOGY.md` | 66 ADRs traced, 58% implemented | 19KB |
| 2 | `DOCUMENTATION_TRUTH_METER.md` | Every claim vs code reality | 15KB |
| 3 | `KNOWLEDGE_AUDIT.md` | ~186 knowledge files vs code | 9KB |
| 4 | `CONSTITUTIONAL_AUDIT.md` | 4 founding docs, 9 laws, KPIs | 8KB |
| 5 | `DOCUMENTATION_TRUTH_SYNTHESIS.md` | Consolidated everything | 13KB |
| 6 | **THIS** | Executive dashboard | — |

## What Works

- **7-Layer Quant Pipeline**: Providers → Residualization → TRG → TruthKernel → C-CLIST → MOL → Constitutional Court → Execution. Fully wired in `streamEngine.js:processCandle()`.
- **SMC/ICT Suite**: 5 engines fully implemented.
- **CSRL Tensor Graph**: Scale normalization, cross-scale analysis, invariant extraction, divergence detection.
- **Reports ADRs (043-052)**: 100% implemented with Platinum test suites.
- **Frontend**: Dual-pane command center, widget framework, all routes functional.

## What Doesn't Work

- **3-Process Isolation**: Fictional. Single Node.js process.
- **gRPC Services**: Rust code exists but never built, never called from JS, not in Docker.
- **NATS JetStream**: Server runs, zero JS consumers.
- **UUIDv7**: Frontend-only. Backend uses UUIDv4 throughout.
- **CQRS/Event Sourcing**: Documented in 59 files, implemented in zero pipeline files.
- **Constitutional Governance**: 1/9 laws followed. ARB never convened.
- **Benchmark Evidence**: No `benchmark/results.json`. Top evidence tier missing.
- **ADR Compression**: ADR-033 unification mandate unexecuted. 7 scores, 15+ engines, 5 storage systems remain separate.

## Critical Integrity Risks

1. **Dual TruthKernels** — `packages/` copy uses canonical algorithm; `lyzer edge/src/` copy has divergent master switch (50%) and chop filter (0.7). Different code paths produce different trade decisions.
2. **Dual ConstitutionalCourts** — `packages/` copy has full C-CLIST + MOL; `lyzer edge/src/` stub lacks both. Pipeline uses only the full one, but stub exists as trap.
3. **Security Tokens in `.env`** — GITHUB_TOKEN and HF_TOKEN still exposed (not rotated).
4. **Phantom Dependencies** — `better-sqlite3`, `@huggingface/hub`, `isomorphic-git`, `ts-node` installed but dead.
5. **174 Dead Files** — 36,700+ lines in `_archive/` that were never pruned.

## Documentation by Honesty Level

| Honest (85-100%) | Mixed (50-84%) | Fabricated (0-49%) |
|-----------------|----------------|-------------------|
| GUARDIAN_REVELATION.md | ADR Family B (50%) | README.md (30%) |
| GUARDIAN_DASHBOARD.md | knowledge/ base (65%) | AGENTS.md (30%) |
| Reports ADRs (043-052) | engineering-audit/ (70%) | CONSTITUTION.md (0%) |
| Knowledge/modules/* | | overview.md (30%) |
| Knowledge/domain/* | | architecture.md (30%) |
| | | services.md (20%) |
| | | ADR Family A (20%) |

## The Pattern

```
Documentation describes:     "3 isolated processes + gRPC + NATS + UUIDv7"
Code implements:             "1 monolith + 7-layer pipeline + single process"
Gap: ~58% (this audit) or ~78% (GUARDIAN_REVELATION estimate)
```

The documentation consistently describes the **aspirational** system that was planned for a 5-person team. The code reflects what **one person** built in 26 days. Both versions are impressive — one as a vision, the other as execution — but they are not the same system.
