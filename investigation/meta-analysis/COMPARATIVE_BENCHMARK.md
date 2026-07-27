# Lyzer Edge — Comparative Industrial Benchmark

**Generated:** 2026-07-27
**Source:** 10 investigation reports + 2 phase-3 audit directories (15 reports)
**Author:** Comparative Benchmarker

---

## 1. OWASP Top 10 (2025) Compliance

| # | OWASP Item | Status | Evidence | Risk |
|---|------------|:------:|----------|:----:|
| **A01** | **Broken Access Control** | ❌ FAIL | Admin auth via query string (`?adminKey=`), leaked in logs/browser history. 9 sensitive routes (`/api/experiments/*`, `/api/trades/export`, `/api/candles/:symbol`) have **no authentication** at all. WebSocket has zero auth — anyone can connect and stream real-time trading data. | **HIGH** |
| **A02** | **Cryptographic Failures** | ❌ FAIL | PermissionToken forged with raw SHA-256 (no HMAC, no secret) — any observer can reconstruct the hash and forge "ALLOW" tokens. Compliance tokens generated with `Math.random()` (predictable PRNG). No UUIDv7 — all IDs use UUIDv4 or sequential integers, no causal traceability. `crypto.randomUUID()` used everywhere instead of timestamp-ordered UUIDv7. Tokens transmitted in cleartext (no TLS in production). | **CRITICAL** |
| **A03** | **Injection** | ❌ FAIL | SQL injection via template literal in `PRAGMA wal_checkpoint(${mode})` — `mode` is unsanitized user-influenceable string. Command injection via `child_process.exec()` in backup script — spawns a shell with unsanitized path. Prototype pollution via unsafe spread of `JSON.parse` results into `Object.assign`/spread patterns in DB layer (7 confirmed sites). NaN propagation from unvalidated WebSocket data through entire pipeline. | **HIGH** |
| **A04** | **Insecure Design** | ❌ FAIL | C-CLIST/MOL pre-evaluated outside `court.requestPermission()` — architectural backdoor mutates stress state twice per tick. Two divergent TruthKernel implementations under same class name (production has Residualization+ETL, frontend has masterSwitch+chopPenalty) — tests cover the wrong one (zero coverage of production kernel). 174 dead files (~36,700 lines) falsely inflate capability claims. Layer sequence not enforced by any abstraction — relies on manual ordering in 430-line method. | **HIGH** |
| **A05** | **Security Misconfiguration** | ❌ FAIL | No `helmet`, no `cors`, no rate limiting on any of 20+ API routes. Docker runs as `root` with no `.dockerignore` — secrets in image layers. CORS completely open. No HTTP security headers. Debug/admin endpoints exposed without protection. | **HIGH** |
| **A06** | **Vulnerable & Outdated Components** | ⚠️ WARN | 3 separate Rust workspaces with **incompatible dependency versions** — tokio (1.0, 1.34, 1.52.3 across workspaces), tonic (0.12 vs 0.9), prost (0.13 vs 0.11). Phantom dep `better-sqlite3` (not declared in any `package.json`, works via hoisting only). Dual lockfile drift (root + `lyzer edge/package-lock.json`). | **MEDIUM** |
| **A07** | **Identification & Authentication Failures** | ❌ FAIL | No WebSocket authentication. Admin key accepted via query string (exposed in `Referer` headers, server logs, proxy logs). No multi-factor. No session management. No token rotation. Credentials stored in process environment without encryption at rest. | **HIGH** |
| **A08** | **Software & Data Integrity Failures** | ❌ FAIL | Live GitHub token (`ghp_ZwfR...`) and HuggingFace token (`hf_oENS...`) **committed to .env files and version-controlled**. Neither `.env` nor `.gitignore` excludes secrets from the repo. Any repo reader can push to HuggingFace Spaces or access GitHub APIs on behalf of the user. CER DDL defined but **never wired** — aspirational only. 11 root-level scripts use ESM `import` but root `package.json` lacks `"type": "module"` — they will crash at runtime. | **CRITICAL** |
| **A09** | **Security Logging & Monitoring Failures** | ⚠️ WARN | `ConstitutionalLedger.entries` is a plain in-memory Array — **lost on every restart** with no recovery or replay. Prometheus metrics exist but only one endpoint (`/metrics`) with no authentication. Unbounded table growth (`causal_events_log`, `shadow_trades_v1`) — no TTL, no retention policy. Error logging without sanitization in multiple catch blocks — internal details exposed. | **HIGH** |
| **A10** | **Server-Side Request Forgery** | ⚠️ WARN | `symbol` parameter in WebSocket URL construction (`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_...`) is validated only with `.toLowerCase()` — no character filtering. Exchange URL construction similarly unsanitized. While `baseUrl` is hardcoded to Binance, a compromised ingestor could request arbitrary paths. | **MEDIUM** |

### OWASP Score: 1/10 — **FAIL**
Only A02 field (cryptographic) has partial mitigation; all others have active violations. Live tokens committed alone is a showstopper.

---

## 2. 12-Factor App Compliance

| # | Factor | Status | Evidence |
|---|--------|:------:|----------|
| **I** | **Codebase** | ⚠️ PARTIAL | Single repo tracked in git, but **two workspaces pretend to be independent packages** while all imports use relative paths (`../../packages/...`). Npm workspace names (`@lyzer/shared`, `@lyzer/constitution`) are declared but **never imported by name** in any file. 5+ files duplicated across workspace boundaries with divergent contents. Multiple "entry points" (legacy SPA, Command Center V2, gamified view) with overlapping responsibilities. |
| **II** | **Dependencies** | ❌ FAIL | Dependency declarations are **incomplete and inaccurate**: `better-sqlite3` is imported but not declared in any `package.json` (phantom dep). `@lyzer/shared` and `@lyzer/constitution` have empty `dependencies` but import `apexcharts`, `lightweight-charts`, `dexie`, `uuid`. `ts-node` declared but replaced by `tsx` (dead dep). `@huggingface/hub` and `isomorphic-git` declared in root but never imported in JS/TS (used only by Python backup script). Dual lockfiles (`package-lock.json` at root + `lyzer edge/package-lock.json`) with potential version drift. |
| **III** | **Config** | ⚠️ PARTIAL | Config loaded via `.env` + `dotenv`, which follows the factor. **However**, config includes **live secrets committed to version control** (GitHub + HF tokens). Config overrides exist as both env vars and code defaults — most match (verified in Quant Pipeline Audit §5) but `executionTriggerLayer.js` standalone default (0.8) drifts from pipeline effective default (0.4). Hardcoded magic numbers: `baseQty=0.001`, `slDistance=0.0025`, `tpDistance=0.0050`, base prices for synthetic fallback. |
| **IV** | **Backing Services** | ❌ FAIL | Backing services (SQLite databases, Binance API, WebSocket streams) are **treated as local resources**, not attached via URL/config. SQLite paths are hardcoded (`/tmp/data/historical_causal_memory.db`, `knowledge/operations/shadow_execution_database.sqlite`). Binance API base URLs are hardcoded in `exchangeExecution.js`. **No resource abstraction layer exists** — swapping from SQLite to Postgres would require rewriting `db.js`. NATS and gRPC infrastructure exists as dead/aspirational code but is never connected. |
| **V** | **Build, Release, Run** | ⚠️ PARTIAL | Vite build produces `dist/` for frontend. Docker 2-stage build exists. **However**, no build pipeline enforces strict separation — `npm run dev` runs without building. The release process is manual (commit → push to HuggingFace Spaces). No CI/CD pipeline beyond GitHub Actions (unknown if configured). No versioned releases — the `parameter_versions` table exists but only tracks module-level params, not system releases. |
| **VI** | **Processes** | ❌ FAIL | **Application is NOT stateless.** State is stored in: (a) module-level mutable arrays (`engines`, `clients` in `server.js`), (b) singleton `signalEngine` shared across 6 asset engines, (c) in-memory `ConstitutionalLedger` Array lost on restart. Race conditions exist between `processCandle` and `checkTickPositionExit` on `this.activePosition` — no mutex or locking. 6 StreamEngine instances run in the same process sharing one SQLite connection. Fallback mode accumulates candles with no cap (OOM risk). |
| **VII** | **Port Binding** | ⚠️ PARTIAL | Backend self-contains Express 5 on port 7860 — follows the factor. **However**, both HTTP and WebSocket share the same port with no separation of concerns. No HTTPS in production (traffic in cleartext including admin keys). Port is hardcoded, not configurable via `$PORT` (uses `process.env.PORT || 7860` — partial). |
| **VIII** | **Concurrency** | ❌ FAIL | **Does NOT scale out via process model.** All 6 `StreamEngine` instances run in a **single Node.js process** with a shared event loop. The system relies on the OS process model for concurrency (one process = one unit), but everything runs in one process. No worker threads, no cluster mode, no child processes for pipeline stages. Synchronous SQLite (`sqlite3` with `serialize()`) means all DB operations are serialized. The documented 3-process architecture (Execution Node, ECA Court, Dashboard) is aspirational — gRPC and NATS infrastructure exist but are never wired. |
| **IX** | **Disposability** | ❌ FAIL | **Startup is NOT fast nor graceful.** Schema creation via `CREATE TABLE IF NOT EXISTS` on every boot. Warmup synthetic candles always start at $60,000 regardless of symbol — incorrect price seeding. **Shutdown is NOT graceful:** `process.exit(0)` with 4-second timeout drops active WebSocket connections, loses in-flight DB writes, and may terminate backup script before completion. No `SIGTERM` draining of connections or active trades. No health checks (the `/api/status` endpoint exists but doesn't verify pipeline health or database connectivity). |
| **X** | **Dev/Prod Parity** | ❌ FAIL | **Significant gaps between dev and prod:** Dev uses `npm run dev` (Vite dev server, hot reload, frontend-only). Prod uses Express serving static Vite build. No API proxy in dev — frontend must connect to port 7860 directly. Dev uses `SIMULATION` mode with synthetic candles; prod can use `LIVE` mode with real Binance keys. The shadow trading mode (`shadowTradingEnabled=true`) sets `this.execution = null` but `handleExecution()` still calls `this.execution.placeOrder()` without null check — **would throw at runtime** (only works in SIMULATION where `execution` is never null). Mock data runs alongside production in frontend via `_startGamification()`. Docker environment differs from local (no systemd, read-only FS in some paths). |
| **XI** | **Logs** | ❌ FAIL | **Logs are NOT treated as event streams.** Backend uses `console.log` scattered across all modules with no structured logging, no log levels, no log correlation IDs. Error messages in Portuguese mixed with English. No centralized log aggregation. Telegram alerts exist for fleet reports but use `console.log` as primary transport. No log rotation or retention. No support for log streaming to external systems (ELK, Datadog, etc.). Admin API key appears in console.log when passed as query param. |
| **XII** | **Admin Processes** | ❌ FAIL | **No admin/management processes.** Database migrations are non-existent (`CREATE TABLE IF NOT EXISTS` is the only mechanism). No data export/import tools for production (the backup script is a Python shell exec). One-time scripts (`run_*.js`) at root level use ESM without `"type": "module"` and **will crash at runtime**. No REPL, no administrative CLI, no DB console. CER DDL defined but never executed. `SchemaCompatibilityGate` is a stub. |

### 12-Factor Score: 2/12 — **FAIL**
Only Factors I (partial), III (partial), V (partial), VII (partial) show any compliance. The project fundamentally violates Factors II, IV, VI, VIII, IX, X, XI, and XII in significant ways.

---

## 3. Trading System Standards Scorecard

| Metric | Industry Standard | Lyzer Edge | Assessment |
|--------|:-----------------:|:----------:|:----------:|
| **Decision Latency** (tick → signal) | < 50ms HFT, < 500ms retail | **Unknown** — no measurement instrumentation | ❌ No telemetry to measure this critical metric |
| **Pipeline Throughput** (candles/sec) | Depends on provider complexity | **Unknown** — 430-line `processCandle()` is synchronous | ❌ No profiling, no benchmark suite |
| **Win Rate** | 40-60% typical for systematic strategies | **No data** — no persistent trade history analysis | ❌ Cannot evaluate without production data |
| **Max Drawdown** | < 20% institutional | **No data** — simulation mode only | ❌ No drawdown monitoring |
| **Sharpe Ratio** | > 1.5 institutional, > 2.0 hedge fund | **No data** — not calculated | ❌ Missing fundamental performance metric |
| **Backtest vs Real Time Ratio** | 100:1 (industry standard) | **Simulation runs at ~2x real time** (500ms per candle) | ❌ Backtest speed is far below industry standard |
| **Number of Instruments** | 6 (allocation) | **6 symbols** (BTC, ETH, SOL, BNB, EUR, GBP) | ✅ Reasonable for solo project |
| **Position Sizing** | Kelly Criterion / Risk Parity | **Hardcoded `baseQty=0.001`** — same size for all assets | ❌ No dynamic sizing based on volatility or account equity |
| **Stop-Loss Strategy** | ATR-based, volatility-adjusted | **Hardcoded `slDistance=0.0025`** (0.25%) with micro ATR fallback | ⚠️ Basic, needs configurable per-asset parameters |
| **Take-Profit Strategy** | Risk:Reward ratio 1:2 to 1:3 | **Hardcoded `tpDistance=0.0050`** (0.50%) | ❌ No dynamic R:R, no trailing stops |
| **Execution Venue** | Multi-exchange / smart routing | **Single exchange (Binance)** — hardcoded URLs | ⚠️ Acceptable for v1, but no fallback exchange |
| **Order Types** | Market, Limit, Stop, OCO | **Market orders only** — `placeOrder()` accepts any type string | ❌ No order type validation, no limit orders, no OCO |
| **Slippage Model** | Market impact + spread model | **None** — no slippage estimation in `FILLED_MOCK` | ❌ Simulation is unrealistic |
| **Risk Controls** | Per-symbol limits, daily loss limits, correlation brakes | **MAX_DAILY_CAPITAL** env var only. No circuit breakers per symbol | ❌ Inadequate for production |
| **Shadow Trading / Paper Trading** | Mirrors live with 1:1 execution | **Exists** in `shadowTradingTelemetry.js` with `better-sqlite3` | ✅ Feature exists but shadow → live transition is manual |
| **Causal Traceability** | UUIDv7 with timestamp ordering | **UUIDv4 everywhere** — no causal ordering possible | ❌ Trade IDs are sequential integers (`trade_${index}`) |
| **Exchange Adapter Abstraction** | Adapter pattern for multi-exchange | **Thin wrapper** around Binance REST API, no interface/abstract class | ⚠️ Functional for single exchange |
| **Regime Detection** | Market state classification | **CSRL engine** with scale alignment, topology, invariants, divergence | ✅ Sophisticated approach beyond industry norm |
| **Constitutional Governance** | Rule-based circuit breakers | **7-layer pipeline** with C-CLIST, MOL, TruthKernel, ECA Court | ✅ Uniquely sophisticated for a solo project |
| **Data Integrity** | Checksummed, versioned, replayable | **Hash-chained `causal_events_log`** (ADR-007/008) | ✅ Excellent design, but not used for trade verification |

### Trading Standards Score: 15/40 — **4.75/10 weighted**

| Category | Score | Notes |
|----------|:-----:|-------|
| Core Trading Metrics (latency, throughput, win rate, drawdown, Sharpe) | 0/5 | No measurement infrastructure exists |
| Execution & Risk | 3/10 | Basic stop-losses, market-only orders, inadequate risk controls |
| Architecture & Data | 8/10 | Excellent pipeline design, causal event log, CSRL engine |
| Testing & Verification | 2/5 | Backtest is too slow, no benchmark suite, verification tests test wrong kernel |
| Institutional Readiness | 2/10 | Single exchange, no smart routing, no multi-asset risk, no circuit breakers |

---

## 4. Solo Project Benchmark (~100K lines, 26 days)

| Metric | Expected (Industry Solo) | Lyzer Edge Actual | Assessment |
|--------|:------------------------:|:-----------------:|:----------:|
| **Total Lines of Code** | — | **~106,746** (JS + TS + Rust + docs) | ✅ Remarkable output for 26 days |
| **Productivity** | 500-1000 lines/day (solo, with AI) | **~4,106 lines/day** | ✅ Extraordinary — clearly AI-augmented |
| **Active Code** | 60-80% of total | **~60,000** (56%) — rest is dead/duplicate | ⚠️ 44% dead code ratio is very high |
| **Bug Rate per KLOC** | 1-3 bugs/KLOC (prototype phase) | **~0.4 bugs/KLOC** (estimated 40+ findings from 10 reports) | ⚠️ Suspiciously low — many bugs are latent, not yet found |
| **Critical Bugs** | 1-2 | **3 showstoppers** (tokens exposed, forgeable token, pipeline backdoor) | 🔴 Critical issues are existential threats |
| **Test Coverage (lines)** | 30-50% | **< 5%** — tests import wrong kernel, no component tests | ❌ Vitally insufficient |
| **Documentation Ratio** (docs:code) | 1:10 to 1:5 | **~834 .md files** — ratio ~1:2 | ✅ Exceptionally well-documented |
| **Documentation Truthfulness** | 90% accurate | **~78% of documented architecture doesn't exist** | ❌ Beautiful docs describe an aspirational system, not reality |
| **Frontend Framework** | React/Vue/Svelte | **Vanilla JS** with `innerHTML` | ⚠️ Unconventional; increases maintenance burden |
| **Backend Language** | TypeScript (typed) | **Plain JavaScript (ESM)** — no type checking | ⚠️ High refactoring risk at this scale |
| **Schema Migrations** | Basic versioning | **None** — `CREATE TABLE IF NOT EXISTS` only | 🔴 Will cause data loss on first schema change |
| **CI/CD Pipeline** | GitHub Actions / similar | **Unknown** — CI scripts exist but may not be connected | ⚠️ Cannot assess production readiness |
| **Security Baseline** | No secrets in repo, basic auth | **CRITICAL FAILURE** — live tokens committed | 🔴 Below minimum acceptable |
| **Dev Environment** | Hot reload, test runner | **Vite + Vitest** | ✅ Good tooling choice |
| **Rust Integration** | Minimal or none | **17 crates across 3 incompatible workspaces** | 🔴 Theater architecture — never connected |
| **Complexity Score** (files) | 200-400 files | **~1,936 files** (excl. node_modules) | ⚠️ Very large for solo project — inflated by dead code |
| **Git Hygiene** | Clean commits, meaningful messages | **223 commits in 26 days**, 67% after 19:00, weekends busiest | ⚠️ Solo developer working at unsustainable pace |

### Solo Project Score: 5/10

| Strength | Weakness |
|----------|----------|
| Extraordinary output volume (4,106 lines/day) | 44% of code is dead/duplicate (36,700+ lines) |
| Exceptionally sophisticated quant pipeline design | Critical security failures (tokens, forgeable token) |
| Exceptional documentation volume (834 files) | Documentation describes aspirational, not real system |
| 7-layer pipeline is genuinely innovative | Pipeline has architectural backdoor + two divergent kernels |
| Causal event log with hash chaining is excellent | No schema migrations, in-memory ledger lost on restart |
| 100% uptime via synthetic fallback | Synthetic data unmarked — pipeline can't distinguish real from fake |

---

## 5. CIS Benchmarks — Node.js Security Hardening

| CIS Control | Status | Evidence |
|-------------|:------:|----------|
| **Use non-root user for container** | ❌ FAIL | Dockerfile has no `USER` directive — runs as root |
| **Keep Node.js updated** | ⚠️ UNKNOWN | `engines` field in `package.json` unspecified |
| **Secure HTTP headers** | ❌ FAIL | No `helmet` middleware — no X-Frame-Options, X-XSS-Protection, CSP, etc. |
| **Rate limiting** | ❌ FAIL | No `express-rate-limit` on any endpoint |
| **CORS configuration** | ❌ FAIL | No `cors` middleware — either wide open or default behavior |
| **Disable `X-Powered-By`** | ❌ FAIL | `app.disable('x-powered-by')` not present |
| **Secure WebSocket** | ❌ FAIL | No WS authentication, no heartbeat/ping-pong, no `ws.on('error')` handler |
| **Input validation** | ❌ FAIL | No schema validation library (`zod`, `ajv`) at any boundary |
| **SQL injection prevention** | ❌ FAIL | Template literal in PRAGMA, no parameterized queries in some paths |
| **Logging without secrets** | ❌ FAIL | Admin key logged in query string, error details exposed |
| **Secrets management** | ❌ FAIL | Tokens committed to repo, Binance keys in process.env without encryption |
| **Container security** | ❌ FAIL | No `.dockerignore`, `chmod 777` in backup script, runs as root |

### CIS Benchmark Score: 0/12 — **FAIL**
Zero controls pass. Every Node.js security hardening recommendation is violated.

---

## 6. SRE Best Practices

| Practice | Status | Evidence |
|----------|:------:|----------|
| **SLIs Defined** | ❌ | No Service Level Indicators exist — no latency, throughput, error rate, or saturation measurements |
| **SLOs Defined** | ❌ | No Service Level Objectives. No targets for uptime, decision latency, trade execution time |
| **Error Budget** | ❌ | No error budget concept. No way to trade reliability for velocity |
| **Runbooks** | ❌ | No runbooks for common failures (connection loss, DB corruption, exchange down) |
| **Incident Response** | ❌ | No incident management process, no postmortem template, no alerting tiers |
| **On-Call** | ❌ | No on-call rotation. Solo developer is the only responder |
| **Monitoring / Alerting** | ⚠️ PARTIAL | Prometheus metrics exist at `/metrics` but no alerting rules, no dashboard. Telegram alerts for fleet reports only |
| **Capacity Planning** | ❌ | No capacity testing. 6 engines share one SQLite connection — bottleneck unknown |
| **Chaos Engineering** | ⚠️ PARTIAL | `src/laboratory/adversarial/` has 7 attack scripts but NONE are connected to CI or production |
| **Disaster Recovery** | ❌ | No DR plan. Backup script is `exec('python3...')` shell command. In-memory ledger lost on restart. No replication |
| **Change Management** | ⚠️ PARTIAL | `parameter_versions` table tracks parameter changes (ADR-016). `experiments` system supports A/B testing. But no approval workflow or rollback automation |
| **Postmortem Culture** | ❌ | No postmortem template, no root cause analysis process |
| **Reliability Testing** | ❌ | No chaos monkey, no fault injection in CI. Tests are not configured to run automatically |

### SRE Score: 0.5/10
The project has the **hardware for SRE** (Prometheus metrics, experiment system, parameter versioning, causal event log) but **none of the process**. This is consistent with a solo prototype — SRE becomes necessary at team scale.

---

## 7. Conclusions

### Where Lyzer Edge is **ABOVE** Industry Standards

| Domain | Standard | Lyzer Edge | Advantage |
|--------|----------|------------|-----------|
| **Pipeline Sophistication** | 3-4 layer typical | **7 layers** (SMC → Residualization → ETL → TruthKernel → C-CLIST → MOL → Court) | **Unique in solo projects.** The CSRL coherence engine (scale alignment, topology graph, invariant extraction) exceeds what many institutional systems implement. |
| **Constitutional Governance** | Hardcoded rules | **ECA Court** with C-CLIST stress oracle + MOL state machine + immutable ledger + permission tokens | **Institutional-grade design.** Most trading systems at this stage have no governance layer. |
| **Data Integrity** | Basic logging | **Hash-chained causal event log** (ADR-007/008), parameter versioning (ADR-016), evolution ledger (ADR-019) | **Excellent forensic infrastructure.** Chain-of-custody for every pipeline decision. |
| **Documentation Volume** | 50-100 files | **834 .md files** (~106,000+ lines of documentation) | **Far above industry average** for a solo project. The knowledge base is genuinely comprehensive. |
| **Resilience Design** | Single point of failure | **6-endpoint fallback rotation**, synthetic candle generation during outages, WAL-mode SQLite | **100% uptime by design.** The synthetic failover guarantees the pipeline never stops. |
| **Experiment Infrastructure** | None at this stage | **Zero Entropy experiments** with champion promotion, 6-state lifecycle, cross-experiment pattern discovery | **Exceptional.** Most teams add experiments after reaching production; this was designed in from day one. |
| **Evolutionary Optimization** | None | **EVAlphaResearchEngineV3_3** with selector genomes, species management, meta-fitness, extinction engine | **Genuinely innovative.** Darwinian parameter optimization built into the pipeline. |

### Where Lyzer Edge is **BELOW** Industry Standards

| Domain | Standard | Lyzer Edge | Gap |
|--------|----------|------------|-----|
| **Secrets Management** | No secrets in repo, encrypted at rest | **Live GitHub + HF tokens committed to .env** | **Existential failure.** This alone makes the project unfit for any security-sensitive deployment. |
| **Token / Authorization Security** | HMAC-signed, expiration, rotation | **Raw SHA-256 without secret key** (forgeable). Compliance tokens use `Math.random()`. | **Critical.** The PermissionToken that guards the entire pipeline is trivially forgeable by any network observer. |
| **Testing Coverage** | 30-50% line coverage minimum | **< 5%** — tests import the wrong kernel, skip 2 pipeline layers (C-CLIST/MOL), zero component tests | **Critically inadequate.** The test suite provides false confidence by testing code that never runs in production. |
| **Schema Migrations** | Versioned, reversible | **None whatsoever** — `CREATE TABLE IF NOT EXISTS` is the only schema mechanism | **Data loss inevitable** on first schema change. Currently impossible to add a column without manual DDL on each DB. |
| **Logging / Observability** | Structured, correlated, aggregated | **`console.log` everywhere**, no structured logging, no correlation IDs, no aggregation | **Blind in production.** No way to debug issues across the pipeline without reading raw console output. |
| **Dead Code Management** | < 10% dead | **~44% dead** — 174 files (~36,700 lines) | **Massive maintenance burden.** Every new developer must spend 40% of their time navigating code that does nothing. |
| **Pipeline Integrity** | Sequence enforced by middleware | **No enforcement** — manual ordering in a 430-line method with a known backdoor (C-CLIST/MOL pre-evaluated) | **Architectural debt.** The pipeline does not execute as designed. The documented sequence is aspirational. |
| **Type Safety** | TypeScript / typed language | **Plain JavaScript** (ESM) for all backend + frontend | **High refactoring risk.** At ~100K lines, the absence of static typing makes every change dangerous. |
| **Rust Integration** | Functional with shared types | **17 crates across 3 incompatible workspaces** — never connected to JS | **Theater architecture.** 100% of the Rust code is aspirational. The actual system runs entirely in Node.js. |
| **Performance Instrumentation** | Profiling, latency tracking | **None.** No benchmarks, no latency measurements, no throughput tracking | **Flying blind.** Cannot identify bottlenecks, cannot prove latency meets requirements. |

### Overall Rating

| Dimension | Score | Industry Baseline | Delta |
|-----------|:-----:|:-----------------:|:-----:|
| OWASP Compliance | 1/10 | 8/10 (minimum) | **-7** 🔴 |
| 12-Factor App | 2/12 | 10/12 (minimum) | **-8** 🔴 |
| Trading Standards | 5/10 | 7/10 (institutional) | **-2** 🟡 |
| Solo Project Benchmark | 5/10 | 6/10 (typical) | **-1** 🟡 |
| CIS Node.js Hardening | 0/12 | 10/12 (minimum) | **-10** 🔴 |
| SRE Practices | 0.5/10 | 4/10 (startup) | **-3.5** 🔴 |
| **Composite** | **2.9/10** | **7.5/10** | **-4.6** 🔴 |

### Verdict

The project has **genuinely extraordinary strengths** — a 7-layer quantitative pipeline with constitutional governance, hash-chained causal event logging, evolutionary optimization, and 100% uptime via synthetic failover — **but is undermined by critical failures in security, testing, and architectural honesty.**

The **top 3 blockers to production readiness** are:
1. **Live secrets in repo** + **forgeable PermissionToken** = the system is compromisable today
2. **Pipeline backdoor** + **divergent kernels** = the pipeline does not run as documented
3. **44% dead code** + **no schema migrations** + **in-memory ledger** = maintenance is unsustainable

The comparison reveals a **bimodal distribution**: the quantitative architecture is ahead of industry standards for a solo prototype, while operational fundamentals (security, testing, observability, dependency management) lag behind minimum acceptable levels. The system is a **brilliant quantitative prototype** wrapped in a **fragile delivery mechanism**.
