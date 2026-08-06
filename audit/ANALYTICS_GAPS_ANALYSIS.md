# LYZER EDGE — ANALYTICS GAPS ANALYSIS
**Role:** Analytics Engineer | **Date:** 2026-08-06 | **Classification:** RESEARCH ONLY

---

## 1. EXECUTIVE SUMMARY

| Dimension | Status | Severity |
|-----------|--------|----------|
| **Telemetry Integrity** | 🔴 **COMPROMISED** — 132,820 ticks/sec hardcoded (R10), synthetic metrics in scorecards | P0 |
| **Business Event Traceability** | 🟡 **PARTIAL** — Court ledger + trade history exist but disconnected; no end-to-end correlation IDs | P1 |
| **Event Taxonomy** | 🔴 **ABSENT** — No unified schema; infra topics ≠ business events; Rust/Node schemas divergent | P0 |
| **Data Quality Checks** | 🔴 **ABSENT** — No validation, schema enforcement, anomaly detection, or freshness SLAs | P1 |
| **Funnel Analysis** | 🟡 **STATIC ONLY** — Dashboard shows funnel but backed by static snapshot, not live telemetry | P1 |

**Bottom Line:** The system produces *infrastructure telemetry* (latency, throughput, error rates) but lacks *business telemetry* (signal→decision→execution→outcome causality). Decisions today are made on fabricated or disconnected data.

---

## 2. TELEMETRY INVENTORY: REAL vs FABRICATED

### 2.1 What Is Actually Telemetred (Real)

| Component | Metrics | Transport | Veracity |
|-----------|---------|-----------|----------|
| **Pipeline Latency** | `tickProcessingHistogram` (p50/p95/p99), `csrlProcessingHistogram`, `cclistEvaluationHistogram` | Prometheus (`/metrics`) | ✅ Real — instrumented in `streamEngine.js:491-961` |
| **Throughput** | `ticksReceivedCounter` by symbol/source | Prometheus | ✅ Real — `recordTickReceived()` at WebSocket ingest |
| **Governance Decisions** | `ecaEvaluationsCounter` (ALLOW/REJECT), `constitutionalVetoCounter` by reason_code | Prometheus | ✅ Real — `recordEcaEvaluation()` in Court path |
| **Risk Gateway** | `riskGatewayLatencyHistogram` (gRPC IPC) | Prometheus | ⚠️ Partial — client exists but server not built in Dockerfile |
| **Persistence** | `sqliteWriteDurationHistogram`, `sqliteLockWaitHistogram` | Prometheus | ✅ Real |
| **System Errors** | `systemErrorsCounter` by component/error_type | Prometheus | ✅ Real |
| **Court Ledger** | Append-only records: verdict, reason, state snapshot, tokenId, nearMissType | SQLite (`causal_memory.db`) | ✅ Real — `ConstitutionalLedger.appendRecord()` |
| **Trade History** | In-memory array + SQLite via `ExperimentManager` | In-memory + SQLite | ✅ Real — `engine.tradeHistory` + `db.insertExperimentTrade()` |
| **Event Bus** | 5 topics: MARKET_OBSERVATION, UI_STATE_UPDATE, AGENT_STATE_CHANGE, STORAGE_FLUSH, EXPLAINABILITY_TRACE | NATS (Rust) | ✅ Real — 5,000 events delivered, 0 dropped |

### 2.2 What Is Fabricated / Misleading

| Artifact | Claim | Reality | Source |
|----------|-------|---------|--------|
| **132,820 ticks/sec** | "Extreme throughput" benchmark | **Hardcoded constant** in `execution-trace.json:5` | R10 finding |
| **Empirical Runtime Scorecard** | 98.75/100 "Platinum Certified" | Based on synthetic throughput above | `empirical-runtime-scorecard.md` |
| **ContinuousMeasurementEngine** | Implied live measurement | No such class found; value injected in trace JSON | Referenced in investigation |
| **Monte Carlo / Stress Tests** | Sharpe 4.01, "Stable PnL" | **Synthetic, non-reproducible** — contradict real backtest (Sharpe -2.16) | Investigation R7, R8 |
| **Frontend `_realRuntime`** | Live metrics display | Sine/cosine/random, confidence 94.2%, `eef=true` | R9 finding |

---

## 3. BUSINESS EVENT TRACEABILITY ANALYSIS

### 3.1 Current Event Flow (What Exists)

```
┌─────────────┐   ┌──────────────┐   ┌────────────┐   ┌─────────────┐   ┌──────────────┐
│  PROVIDER   │──▶│ TRUTH KERNEL │──▶│  C-CLIST   │──▶│  ECA COURT  │──▶│  EXECUTION   │
│  SIGNALS    │   │  (TRG/DVF)   │   │  (STRESS)  │   │  (PERM TOKEN)│   │  (BINANCE)   │
└─────────────┘   └──────────────┘   └────────────┘   └─────────────┘   └──────────────┘
      │                │                  │                  │                  │
      ▼                ▼                  ▼                  ▼                  ▼
  [NO EVENT]      [NO EVENT]         [NO EVENT]       [LEDGER RECORD]    [TRADE HISTORY]
                  (kernelResult)      (stress)         (PermissionToken)  (resolvedTrade)
```

### 3.2 Traceability Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **No Correlation ID** | No `trace_id`/`correlation_id` linking provider signal → kernel → court → execution | Cannot reconstruct why a specific trade was approved/rejected |
| **Disconnected Stores** | Court ledger (SQLite) ≠ Trade history (SQLite) ≠ Experiment DB — no foreign keys | Cross-analysis requires manual joins; no automated lineage |
| **Missing Veto Events** | Vetos logged in ledger but not emitted as Prometheus events with context | Cannot alert on veto patterns; no veto rate dashboard |
| **No Signal Quality Metrics** | Provider confidence, narrative, causal answers not telemetred | Cannot measure provider degradation or regime fitness |
| **Execution Gap** | `ExchangeExecution.placeOrder()` result not linked back to originating signal | Cannot measure slippage, fill rate, or execution quality per strategy |

---

## 4. EVENT TAXONOMY STATUS

### 4.1 Existing Schemas (Fragmented)

| Layer | Schema | Coverage | Language |
|-------|--------|----------|----------|
| **Rust Proto** | `rio_telemetry.proto` (referenced in `build.rs:10`) | Infrastructure topics only | Rust |
| **Governance Contracts** | `governanceContracts.ts` | Thermodynamic, Capital, Causal events | TypeScript |
| **Court Ledger** | `ConstitutionalLedger` record shape | Permission decisions only | TypeScript |
| **StreamEngine Payload** | `arl` event emitted to WS | Full snapshot per tick | TypeScript |
| **Prometheus Metrics** | `metricsRegistry.js` | Counters/histograms only | TypeScript |

### 4.2 Taxonomy Gaps

| Missing | Needed For |
|---------|------------|
| **Unified Event Envelope** | Cross-language correlation (Rust ↔ Node) |
| **Business Event Types** | `SIGNAL_GENERATED`, `KERNEL_EVALUATED`, `CCLIST_STRESS`, `COURT_DECISION`, `ORDER_PLACED`, `ORDER_FILLED`, `POSITION_CLOSED` |
| **Semantic Versioning** | Schema evolution without breaking consumers |
| **Event Catalog/Registry** | Discovery, documentation, consumer contracts |
| **Dead Letter / DLQ Strategy** | Handling schema violations, late arrivals |

---

## 5. DATA QUALITY CHECKS — ABSENT

| Check | Status | Risk |
|-------|--------|------|
| **Schema Validation** | ❌ None — Prometheus metrics accept any label values; ledger stores raw JSON | Silent data corruption |
| **Freshness SLAs** | ❌ No `last_seen` tracking for critical metrics | Stale dashboards undetected |
| **Completeness** | ❌ No assertion that `signalsGenerated = kernelApproved + kernelRejected` | Funnel math unverifiable |
| **Consistency** | ❌ No cross-store reconciliation (ledger vs trade history vs experiment DB) | Audit gaps |
| **Anomaly Detection** | ❌ No statistical bounds on latency, veto rate, throughput | Silent degradation |
| **Cardinality Control** | ❌ Prometheus labels unbounded (symbol, reason_code, source) | Cardinality explosion risk |

---

## 6. FUNNEL ANALYSIS — STATIC ONLY

### 6.1 Current Dashboard (DecisionAnalytics.js)

```javascript
// HARDCODED from robustness_results.js (static snapshot)
funnel: {
  "signalsGenerated": 107,
  "kernelApproved": 107,
  "sizingApproved": 107,
  "ecaApproved": 0,      // ← BUG: Court almost always rejects (R4)
  "executedCount": 25,
  "winnersCount": 16
}
```

### 6.2 Required Live Funnel (Not Implemented)

| Stage | Source Event | Metric | Current Reality |
|-------|--------------|--------|-----------------|
| 1. Signal Generated | Provider emits signal | `signals_generated_total` | ❌ Not emitted |
| 2. Kernel Approved | `TruthKernel.evaluate()` → `eef=true` | `kernel_approved_total` | ❌ Not emitted |
| 3. Sizing Approved | `DynamicSizing.getDynamicSize()` → qty > 0 | `sizing_approved_total` | ❌ Not emitted |
| 4. Court Approved | `PermissionToken.granted=true` | `court_approved_total` | ✅ Via `ecaEvaluationsCounter` |
| 5. Order Placed | `ExchangeExecution.placeOrder()` success | `orders_placed_total` | ❌ Not emitted |
| 6. Order Filled | Fill confirmation / WS execution report | `orders_filled_total` | ❌ Not emitted |
| 7. Winner | Closed trade PnL > 0 | `winners_total` | ✅ Via trade history (post-hoc) |

**Critical Finding:** Stage 4 (Court) shows 0 approvals in static data, confirming R4 (Court almost always rejects). Live funnel would expose this in real-time.

---

## 7. ANALYTICS GAPS MATRIX

| ID | Gap | Severity | Decision Impact | Effort | Owner |
|----|-----|----------|-----------------|--------|-------|
| **A1** | **Fabricated throughput metric (132k ticks/s) used in scorecards** | **P0** | False confidence in capacity; misleading investors/operators | 1 day | Platform |
| **A2** | **No correlation IDs across pipeline stages** | **P0** | Cannot debug "why this trade?"; no root-cause analysis | 3 days | Analytics |
| **A3** | **No unified event taxonomy / schema registry** | **P0** | Rust/Node drift; consumers break silently; no governance | 5 days | Analytics |
| **A4** | **Funnel is static snapshot, not live telemetry** | **P1** | Operators see fake conversion rates; cannot detect Court regression | 3 days | Analytics |
| **A5** | **No data quality checks (schema, freshness, completeness)** | **P1** | Silent data corruption; dashboards lie | 5 days | Platform |
| **A6** | **Signal quality not telemetred (confidence, narrative, causal)** | **P1** | Cannot measure provider degradation; no regime adaptation signal | 3 days | Quant |
| **A7** | **Execution quality not linked to originating signal** | **P1** | Cannot measure slippage/fill rate per strategy; no execution alpha | 5 days | Execution |
| **A8** | **Veto reasons not queryable as time-series** | **P2** | Cannot alert on veto pattern changes; no veto rate dashboard | 2 days | Analytics |
| **A9** | **No event catalog / consumer contracts** | **P2** | New consumers reverse-engineer; breaking changes undetected | 3 days | Analytics |
| **A10** | **Prometheus label cardinality unbounded** | **P2** | OOM risk at scale; query performance degradation | 2 days | Platform |

---

## 8. PROPOSED MINIMAL EVENT TAXONOMY

### 8.1 Event Envelope (All Events)

```json
{
  "event_id": "uuid-v7",           // Globally unique, time-ordered
  "event_type": "SIGNAL_GENERATED", // From controlled vocabulary
  "event_version": "1.0.0",        // Semantic version
  "timestamp_ns": 1722931200000000000, // Nanosecond epoch
  "trace_id": "uuid-v7",           // Links full pipeline: signal→kernel→court→execution
  "span_id": "uuid-v7",            // This specific operation
  "source": "stream-engine:v4-imce", // Component identifier
  "symbol": "BTCUSDT",             // Business key
  "payload": { ... },              // Type-specific (validated by schema)
  "metadata": {
    "environment": "testnet",
    "deployment_id": "sha256-git",
    "schema_registry": "lyzer-events@v1"
  }
}
```

### 8.2 Core Business Event Types (Minimum Viable)

| Event Type | Trigger | Key Payload Fields | Consumers |
|------------|---------|-------------------|-----------|
| `SIGNAL_GENERATED` | Provider emits non-flat signal | `provider`, `signal`, `confidence`, `regime`, `narrative`, `causal_answers` | Funnel, Provider Health |
| `KERNEL_EVALUATED` | `TruthKernel.evaluate()` returns | `trg`, `dvf`, `eef`, `epistemic_authority`, `reason_codes`, `sds`, `lhds` | Funnel, Kernel Health |
| `CCLIST_STRESS_EVALUATED` | `ContinuousCLIST.evaluateStress()` | `stress_level`, `is_lethal_illusion`, `drawdown`, `accumulation` | Funnel, Risk |
| `COURT_DECISION` | `ConstitutionalCourt.requestPermission()` | `action`, `granted`, `reason`, `token_id`, `mol_state`, `doi`, `scl` | Funnel, Governance, Alerting |
| `ORDER_PLACED` | `ExchangeExecution.placeOrder()` succeeds | `order_id`, `side`, `quantity`, `price`, `order_type`, `latency_ms` | Execution Quality, Funnel |
| `ORDER_FILLED` | Fill confirmation (WS/REST) | `order_id`, `fill_price`, `fill_qty`, `fees`, `slippage_bps` | Execution Quality, PnL Attribution |
| `POSITION_OPENED` | Local position created | `position_id`, `entry_price`, `stop_loss`, `take_profit`, `quantity`, `governance_decision` | Position Tracking, Risk |
| `POSITION_CLOSED` | SL/TP/Veto/Manual exit | `position_id`, `exit_price`, `exit_reason`, `pnl`, `hold_duration_ms` | PnL, Funnel, Regime Analysis |
| `VETO_TRIGGERED` | Any layer vetoes (Kernel, CCLIST, MOL, Court, Dampener) | `layer`, `reason_code`, `context_snapshot` | Alerting, Governance Analytics |

### 8.3 Schema Governance

- **Registry:** Single source of truth (e.g., `buf` schema registry or JSON Schema in repo)
- **Compatibility:** BACKWARD only (consumers read old + new)
- **Validation:** Producer-side (gate at emit) + Consumer-side (gate at ingest)
- **Versioning:** `event_version` in envelope; schema stored at `schemas/{event_type}/v{major}.json`

---

## 9. MINIMUM VIABLE ANALYTICS PLAN

### Phase 1: Stop the Bleeding (Week 1)

| Task | Owner | Deliverable |
|------|-------|-------------|
| **Remove fabricated 132k ticks/s** | Platform | Delete hardcoded value; scorecard reads live `ticksReceivedCounter` |
| **Add correlation ID propagation** | Analytics | `trace_id` generated at WebSocket ingest → passed through Kernel → Court → Execution |
| **Emit `SIGNAL_GENERATED` + `KERNEL_EVALUATED` events** | Quant | Two new Prometheus counters + structured log lines (JSON) |
| **Wire Court veto reasons to Prometheus** | Analytics | `constitutionalVetoCounter` already exists — ensure all veto paths call it |
| **Live funnel dashboard** | Analytics | Replace static `robustness_results.js` with live PromQL queries |

### Phase 2: Schema & Quality (Week 2-3)

| Task | Owner | Deliverable |
|------|-------|-------------|
| **Define event schemas (JSON Schema)** | Analytics | `schemas/` directory with 9 event types v1.0.0 |
| **Producer validation middleware** | Platform | `validateEvent(event)` throws on schema mismatch |
| **Consumer validation + DLQ** | Platform | Invalid events → dead letter topic + alert |
| **Freshness SLAs + alerts** | Platform | `lyzer_pipeline_ticks_received_total` no increase > 60s → PagerDuty |
| **Cross-store reconciliation job** | Analytics | Nightly: ledger.count ≈ trade_history.count ≈ experiment_trades.count |

### Phase 3: Execution & Attribution (Week 4)

| Task | Owner | Deliverable |
|------|-------|-------------|
| **Emit `ORDER_PLACED` / `ORDER_FILLED`** | Execution | Linked to `trace_id` from Court decision |
| **Slippage / fill rate per strategy** | Analytics | Dashboard: `slippage_bps` by `trace_id.provider` |
| **PnL attribution to signal source** | Quant | Join `POSITION_CLOSED` → `trace_id` → `SIGNAL_GENERATED.provider` |
| **Veto rate dashboard** | Analytics | Time-series of `constitutionalVetoCounter` by `reason_code` |

### Phase 4: Hardening (Ongoing)

| Task | Owner | Deliverable |
|------|-------|-------------|
| **Schema registry (buf/Confluent)** | Platform | CI gate: `buf breaking` on schema changes |
| **Event catalog UI** | Analytics | Searchable docs: event type → schema → producers → consumers |
| **Cardinality guards** | Platform | Relabel `reason_code` → bucketed enum; drop high-cardinality labels |
| **Replay / backfill pipeline** | Platform | Kafka/NATS retention + ClickHouse for historical queries |

---

## 10. IMMEDIATE ACTION ITEMS (Today)

```bash
# 1. Kill the fake metric
sed -i 's/"throughputTicksPerSec": 132820/"throughputTicksPerSec": null  # REMOVED - was fabricated/' engineering-audit/runtime-telemetry/execution-trace.json

# 2. Add trace_id to streamEngine ingest
# In updateMtfCandles(): const traceId = crypto.randomUUID(); pass through processCandle()

# 3. Emit signal event at line 581 (baseSignal construction)
# recordSignalGenerated(symbol, provider, signal, confidence, traceId)

# 4. Emit kernel event at line 557 (kernelResult)
# recordKernelEvaluated(symbol, trg, dvf, eef, epistemic_authority, traceId)

# 5. Ensure Court calls recordEcaEvaluation for ALL paths (granted + rejected)
# Already at line 778 — verify rejected path at line 863 also calls it
```

---

## 11. SUCCESS CRITERIA (Definition of Done)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Telemetry Honesty** | 0 fabricated metrics in dashboards | Audit: grep for hardcoded constants |
| **End-to-End Traceability** | 100% trades have `trace_id` linking signal→execution | Sample 100 trades; verify join |
| **Funnel Freshness** | Live funnel updates < 5s latency | Dashboard shows current hour conversion |
| **Data Quality** | 0 schema validation errors/day | Prometheus: `lyzer_event_schema_errors_total` |
| **Veto Visibility** | Veto rate by reason_code queryable in < 1s | Grafana dashboard loads < 1s |

---

*This analysis is RESEARCH ONLY. No code changes made. Implementation requires Phase 1 execution.*