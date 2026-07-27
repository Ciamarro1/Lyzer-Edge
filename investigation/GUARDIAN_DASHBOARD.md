# Lyzer Edge — Guardian Executive Dashboard

**Prepared by:** Chief Scientist / Chief Software Architect (Lyzer Guardian)
**Date:** 2026-07-27
**Source:** 10 investigation reports (System Map, Backend, Frontend, Security, Data, Synthesis, Deep Archaeology, Red Team Deep, Quant Pipeline Audit, Dependency Deep Audit)

---

## 1. Executive Summary

Lyzer Edge is an institutional algorithmic trading system with a well-conceived 7-layer quantitative pipeline, 3 Rust workspaces (17 crates), and a Node.js backend serving a vanilla-JS frontend. However, **the system has critical security vulnerabilities (live tokens committed, forgeable PermissionToken, command injection surface), pipeline integrity violations (C-CLIST/MOL backdoor, two divergent TruthKernel classes under the same name), and 174 dead/duplicated files (~36,700 lines) masquerading as features.** The architectural vision is sound — 3-process isolation, UUIDv7 causal traceability, constitutional governance — but the implementation has drifted from the blueprint. The system runs in production on Hugging Face Spaces with real API keys, making remediation time-critical.

---

## 2. Critical Findings — Must Fix Now

| # | Finding | Severity | Domain | File | Line |
|---|---------|:--------:|--------|------|:----:|
| 1 | GITHUB_TOKEN + HF_TOKEN expostos — rotação imediata necessária | CRITICAL | Security | `.env` | 1-4 |
| 2 | Dois TruthKernels divergentes — testes importam kernel errado, zero cobertura do kernel de produção | CRITICAL | Pipeline | `kernel.js` (both) | — |
| 3 | C-CLIST/MOL executado fora do `requestPermission` — backdoor de mutação de estado | HIGH | Pipeline | `streamEngine.js` | 552-553 |
| 4 | `exec()` sem sanitização — injeção de comando via shell | HIGH | Security | `server.js` | 472 |
| 5 | PermissionToken assinado com SHA-256 sem HMAC — forjável sem chave secreta | HIGH | Security | `permission.js` | 34 |
| 6 | C-CLIST fallback silencioso SDS=0.0 — falsa estabilidade mina MOL recovery | HIGH | Pipeline | `streamEngine.js` | 517-527 |
| 7 | 174 arquivos mortos/duplicados (~36.700+ linhas) disfarçados de código ativo | HIGH | Code | multiple | — |
| 8 | Phantom dep `better-sqlite3` + dual lockfile drift — quebra silenciosa em hoisting | HIGH | Deps | multiple | — |
| 9 | SQL injection via template literal em PRAGMA `wal_checkpoint(${mode})` | HIGH | Security | `db.js` | 412 |
| 10 | Compliance tokens gerados com `Math.random()` — previsíveis | HIGH | Security | `complianceEngine.js` | 88 |
| 11 | Sem rate limiting em nenhum endpoint API — vetor de flooding | HIGH | Security | `server.js` | all |
| 12 | Rotas sensíveis sem autenticação — `/api/experiments/*`, `/api/trades/export`, `/api/candles/:symbol` | HIGH | Security | `server.js` | multiple |
| 13 | Sem schema validation em WebSocket incoming — NaN propaga pelo pipeline | HIGH | Pipeline | `liveDataIngestor.js` | 272-296 |
| 14 | Sem uuidv7 — todos os IDs usam uuidv4 ou inteiros sequenciais | MEDIUM | Pipeline | multiple | — |
| 15 | Frontend court sem C-CLIST/MOL — stub vazio, testes ignoram 2 camadas | MEDIUM | Frontend | `src/eca/court.js` | — |
| 16 | Sem helmet, cors, rate-limit, WebSocket auth — servidor Express exposto | MEDIUM | Security | `server.js` | — |
| 17 | 11 root scripts ESM quebrados (sem `type:module` no root) | MEDIUM | Config | root/ | — |
| 18 | 8 TODO stubs em `worker.js` — handlers Monte Carlo, Risk Analysis vazios | LOW | Code | `worker.js` | 18-40 |
| 19 | Race conditions em `this.activePosition` — sem mutex entre processCandle e checkTickPositionExit | MEDIUM | Pipeline | `streamEngine.js` | 394-763 |
| 20 | Prototype pollution via unsafe spread em JSON.parse → Object spread | MEDIUM | Security | `db.js`, `server.js`, `streamEngine.js` | multiple |
| 21 | SSRF via `symbol` não sanitizado em URLs de fetch | MEDIUM | Security | `exchangeExecution.js`, `liveDataIngestor.js` | 33-263 |
| 22 | Unbounded array growth em fallback mode (OOM risk) | MEDIUM | Pipeline | `streamEngine.js` | 380 |
| 23 | In-memory ConstitutionalLedger perdido no restart — edge-riding counters zerados | CRITICAL | Data | `ledger.js` | — |
| 24 | Nenhum schema migration — `CREATE TABLE IF NOT EXISTS` é o único mecanismo | CRITICAL | Data | `db.js` | — |
| 25 | Docker executa como root sem `.dockerignore` — segredos em layers da imagem | MEDIUM | Security | `Dockerfile` | — |
| 26 | Config drift: ExecutionTriggerLayer standalone default 0.8 vs pipeline 0.4 | LOW | Pipeline | `executionTriggerLayer.js` | 12 |
| 27 | Admin API key via query string — vazada em logs, proxies, browser history | MEDIUM | Security | `server.js` | 43 |
| 28 | `process.exit()` forçado com timeout de 4s — dados em voo perdidos no shutdown | LOW | Security | `server.js` | 486-491 |

---

## 3. Pipeline Health Score

| Layer | Status | Finding |
|-------|:------:|---------|
| 1. Providers V1-V4 | ✅ | V1 (SMC/ICT), V2 (SnD/SNR), V3 (Momentum RSI), V4 (IMCE) operacionais. Importados corretamente via `streamEngine.js`. |
| 2. ResidualizationLayer | ⚠️ | DVF + TRG + consensus destruction funcionais. Mas sem validação de contrato na saída — NaN ou undefined propagam. |
| 3. ExecutionTriggerLayer | ✅ | TRG >= 0.4 OK. Config drift menor (standalone default 0.8 vs pipeline 0.4). Sem efeito em produção. |
| 4. TruthKernel | 🔴 | **DUAS implementações divergentes com o mesmo nome.** Produção (`packages/lyzer-shared/`) tem sub-layers Residualization + ExecutionTrigger. Frontend (`lyzer edge/src/`) tem masterSwitchThreshold + chopPenalty. Verificação testa o kernel errado. |
| 5. C-CLIST | 🔴 | Silenciosamente pré-avaliado fora do `requestPermission` (streamEngine.js:552). Falha CSRL → SDS=0.0 → falsa estabilidade. Mutação de estado duplicada por tick. |
| 6. MOL | 🔴 | SDS=0.0 falseia estabilidade. MOL vê `sds <= 0.7` e permite recovery prematuro. Backdoor via streamEngine.js:553 atualiza estado fora do court. |
| 7. ConstitutionalCourt | ⚠️ | PermissionToken forjável (SHA-256 sem HMAC). C-CLIST + MOL reavaliados dentro do court (redundante). Ledger in-memory sem persistência. Frontend court é stub sem C-CLIST/MOL. |

---

## 4. Scorecard Final

| Dimension | Score (0-10) | vs Baseline | Trend |
|-----------|:-----------:|:-----------:|:-----:|
| Architecture Integrity | 4/10 | — | 🔴 |
| Security | 2/10 | — | 🔴 |
| Pipeline Fidelity | 4/10 | — | 🔴 |
| Code Quality | 4/10 | — | 🟡 |
| Testing | 3/10 | — | 🟡 |
| Dependencies | 5/10 | — | 🟡 |
| Documentation | 6/10 | — | 🟢 |

**Trend Legend:**
- 🔴 Deteriorating / needs immediate intervention
- 🟡 Stable but requires attention
- 🟢 Acceptable or improving

**Notes:**
- **Architecture Integrity (4/10):** 7-layer pipeline is sound in concept but violated by C-CLIST/MOL backdoor, divergent kernels, and lack of layer sequence enforcement. 3-process isolation documented but not implemented in runtime.
- **Security (2/10):** Live tokens in repo is a showstopper. Forgeable PermissionToken, command injection, no helmet/CORS/rate-limit, SQL injection, insecure PRNG, SSRF, prototype pollution — systemic weakness across every layer.
- **Pipeline Fidelity (4/10):** Double kernel, double C-CLIST/MOL evaluation, false SDS=0.0 fallback, no UUIDv7 causal traceability. The pipeline runs but does not execute as designed.
- **Code Quality (4/10):** 430-line `processCandle`, 625-line `GamifiedCommandCenterView`, 174 dead files, no TypeScript, `innerHTML` everywhere, no state management. High technical debt.
- **Testing (3/10):** Vitest infra exists but tests cover the wrong kernel, missing C-CLIST/MOL path, no component tests, no integration tests for the production pipeline path.
- **Dependencies (5/10):** Phantom `better-sqlite3`, dual lockfile, 11 broken ESM scripts, zombie package names never used, workspace packages don't self-declare deps.
- **Documentation (6/10):** 834 .md files, comprehensive AGENTS.md, but some docs describe aspirational features as working (CER, SchemaCompatibilityGate), and `run_final_independent_review.js` falsely claims "no lateral shortcuts."

---

## 5. Hidden Threats — Things NOT in the Docs

The following critical threats were discovered during investigation but are **not mentioned** in any design document, README, or AGENTS.md:

| Threat | Source | Why It's Hidden |
|--------|--------|----------------|
| **Backdoor pipeline bypass** — C-CLIST/MOL pre-evaluated on every tick outside `court.requestPermission()` (`streamEngine.js:552-553`), creating a redundant state mutation path that can silently diverge from the court's internal state. | Quant Pipeline Audit F1, streamEngine.js | The architecture diagram shows 7 layers in sequence with the court as the sole gate. No document mentions the pre-evaluation. |
| **Forgeable PermissionToken** — Signed with raw SHA-256 hash of deterministic fields, no HMAC, no secret key. Anyone who observes one token can forge any other. | Red Team Deep finding 3, permission.js:34 | Comment in code says "In a real multi-process system, this is signed with the Court's private key" — this placeholder was never replaced. No document warns of this. |
| **Fake C-CLIST stability** — CSRL divergence failure silently defaults SDS to 0.0 (`streamEngine.js:517-527`). MOL interprets SDS=0 as "perfect coherence" and allows premature recovery exits. | Quant Pipeline Audit F3 | The catch block logs a warning but no document describes this fallback behavior or its implications. |
| **Wrong kernel under test** — 5 verification files import `lyzer edge/src/engine/kernel.js` (frontend kernel) instead of `packages/lyzer-shared/src/engine/kernel.js` (production kernel). Tests pass green on code that never runs in production. | Quant Pipeline Audit F2 | No document tracks the two-kernel divergence. The test suite provides zero coverage of the production pipeline path. |
| **Dead code disguised as features** — 91 files in `packages/lyzer-shared/src/research/` (~75 never imported), 23 orphaned lab files, 58 archived files. These inflate the codebase by 36,700+ lines but appear in file counts as "active research." | Deep Archaeology sections 1-5 | Root directory structure and knowledge base list these as active capabilities. No document identifies them as dead. |
| **In-memory ledger = zero audit trail on restart** — `ConstitutionalLedger.entries` is a plain Array. Every process restart resets edge-riding counters to zero. No replay or recovery. | Data Analysis finding 2, Final Synthesis | Documents describe the ledger as "append-only" and "immutable" but omit that it is purely in-memory with zero persistence. |
| **3 Rust workspaces can't compile together** — Different tokio versions (1.0, 1.34, 1.52.3), mismatched tonic (0.12 vs 0.9) and prost (0.13 vs 0.11) across workspaces. | Deep Archaeology section 9 | Documents present 17 crates as a unified Rust ecosystem. They are not interoperable. |

---

## 6. Top 5 Actions (Ordered)

### 1. 🔴 ROTACIONAR GITHUB_TOKEN E HF_TOKEN IMEDIATAMENTE
**Why:** Both tokens are live and committed to a public repository (or accessible to anyone with repo access). Any delay gives attackers a window to use GitHub/HF privileges.
**How:** Revoke `ghp_***REDACTED***` at https://github.com/settings/tokens and `hf_***REDACTED***` at https://huggingface.co/settings/tokens. Add `.env` to `.gitignore`. Purge from git history with `git filter-branch`.
**Owner:** Security / DevOps
**Estimate:** 1 hour

### 2. 🔴 UNIFICAR OS DOIS TRUTHKERNELS
**Why:** Two incompatible `TruthKernel` classes with the same name. Production pipeline uses one (`packages/lyzer-shared/`), verification tests use the other (`lyzer edge/src/`). Zero test coverage of the production kernel.
**How:** Choose the production kernel (with ResidualizationLayer + ExecutionTriggerLayer) as canonical. Remove or re-export from the frontend path. Update all 5 verification files to import the canonical kernel. Verify tests actually exercise the production path.
**Owner:** Pipeline / Quant Engineering
**Estimate:** 2-3 days

### 3. 🔴 MOVER C-CLIST/MOL PARA DENTRO DO `court.requestPermission`
**Why:** Lines 552-553 of `streamEngine.js` silently mutate C-CLIST and MOL state outside the court's single entry point, creating a backdoor that can diverge from the court's internal state.
**How:** Remove the pre-evaluation calls from `processCandle()`. The court already evaluates C-CLIST and MOL internally inside `requestPermission()`. Verify `processCandle` → `court.requestPermission()` is the sole path.
**Owner:** Pipeline / Quant Engineering
**Estimate:** 1 day

### 4. 🟡 SUBSTITUIR SHA-256 POR HMAC-SHA256 NO PERMISSIONTOKEN
**Why:** `permission.js:34` uses `crypto.createHash('sha256')` with no secret key. Every field in the payload is deterministic and known to the caller — the hash is trivially forgeable. This bypasses the entire 7-layer pipeline.
**How:** Replace `createHash('sha256').update(payload).digest('hex')` with `createHmac('sha256', COURT_SECRET_KEY).update(payload).digest('hex')`. Load `COURT_SECRET_KEY` from environment, never exposed to Execution Node.
**Owner:** Security / Constitutional Court
**Estimate:** 4 hours

### 5. 🟡 REMOVER 174 ARQUIVOS MORTOS (~36.700 LINHAS)
**Why:** Dead code is not inert — it misleads developers, inflates maintenance burden, creates false security (tests pass on wrong code), and wastes CI/cognitive resources.
**How (in order):**
1. Delete `_archive/` directory (58 files, ~15,000 lines) — already confirmed dead by declaration.
2. Delete `src/laboratory/` (23 files, ~2,500 lines) — zero imports across codebase.
3. Delete duplicate `lyzer edge/src/cer/` files (contracts.ts, types.ts, SQLiteSchema.ts, SchemaCompatibilityGate.ts) — canonical versions in `packages/lyzer-constitution/`.
4. Delete duplicate `lyzer edge/src/db/` files — canonical in `packages/lyzer-shared/src/db/`.
5. Audit and delete dead research files in `packages/lyzer-shared/src/research/` (~75 files, ~15,000 lines) — verify each file has zero imports.
6. Delete `lyzer edge/package-lock.json` (dual lockfile).
7. Add `"type": "module"` to root `package.json` or rename root scripts to `.mjs`.
8. Add `better-sqlite3` to `lyzer edge/package.json` dependencies.

**Owner:** Code Quality / Tech Lead
**Estimate:** 3-5 days total

---

## Appendix: Scores Breakdown

### Architecture Integrity (4/10)
| Criterion | Score | Rationale |
|-----------|:-----:|-----------|
| 3-process isolation | 0/2 | Documented but not implemented — everything runs in one Node.js process |
| 7-layer pipeline sequence | 2/2 | Layers exist, correct imports, proper parameter wiring |
| Layer sequence enforcement | 0/2 | No pipeline orchestrator, state machine, or middleware chain |
| Single responsibility | 1/2 | Good package separation but `processCandle` violates SRP |
| Frontend architecture | 1/2 | Widget shell good, but dual runtime paths and no state management |

### Security (2/10)
| Criterion | Score | Rationale |
|-----------|:-----:|-----------|
| Secrets management | 0/2 | Live tokens committed, no `.gitignore`, no encryption at rest |
| Authentication | 0.5/2 | Admin via query string, WS has no auth, missing auth on sensitive routes |
| Authorization | 0/2 | PermissionToken forgeable, no HMAC, no key |
| Input validation | 0.5/2 | SQL injection in PRAGMA, NaN propagation from WS, no schema validation |
| Network security | 0/2 | No helmet/CORS/rate-limit, no TLS, SSRF surface, prototype pollution |

### Pipeline Fidelity (4/10)
| Criterion | Score | Rationale |
|-----------|:-----:|-----------|
| Kernel correctness | 0/2 | Two divergent kernels, tests cover the wrong one |
| Layer order integrity | 1/2 | C-CLIST/MOL backdoor outside requestPermission |
| Fallback behavior | 0.5/2 | SDS=0.0 silent fallback undermines MOL, synthetic data unmarked |
| Causal traceability | 0.5/2 | UUIDv4 everywhere, trade IDs are sequential integers |
| Parameter consistency | 2/2 | All env vars match code defaults (minor drift in ETL standalone default) |

### Code Quality (4/10)
| Criterion | Score | Rationale |
|-----------|:-----:|-----------|
| Dead code | 0/2 | 174 files, 36,700+ lines dead or duplicated |
| Method size | 0.5/2 | 430-line processCandle, 625-line GamifiedCommandCenterView |
| Error handling | 1/2 | Inconsistent try/catch, silent catch blocks, missing response on update-status |
| Type safety | 0.5/2 | No TypeScript in backend, no schema validation at boundaries |
| Code duplication | 1/2 | 5+ DB files duplicated, 5 TS files forked, 2 kernels, 2 worker.js |

### Testing (3/10)
| Criterion | Score | Rationale |
|-----------|:-----:|-----------|
| Pipeline tests | 0/2 | Tests import wrong kernel, skip C-CLIST/MOL, zero production path coverage |
| Component tests | 0/2 | No frontend component tests |
| Integration tests | 1/2 | Certification scripts exist but require NATS + risk-gateway running |
| Test infrastructure | 1/2 | Vitest, jsdom, coverage configured — but no setupFiles, no mocking |
| Verification tests | 1/2 | 5 verification files exist but test the non-production kernel path |

### Dependencies (5/10)
| Criterion | Score | Rationale |
|-----------|:-----:|-----------|
| Correct declarations | 1/2 | better-sqlite3 phantom dep, workspace packages miss deps |
| Lockfile hygiene | 0.5/2 | Dual lockfile with potential version drift |
| No dead deps | 1/2 | ts-node dead, @huggingface/hub and isomorphic-git not imported |
| ESM compliance | 0.5/1 | 11 root scripts broken without type:module |
| Rust workspace consistency | 1/1 | 3 workspaces (incompatible but separate) |
