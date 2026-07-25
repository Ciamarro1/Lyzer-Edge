# 🏛️ COMMAND CENTER v2 — SHELL DESIGN SPECIFICATION

**Data de Emissão:** 2026-07-25  
**Autoridade:** Principal Frontend Architect, Institutional Systems Designer  
**Status:** DESIGN APROVADO PARA IMPLEMENTAÇÃO ETAPA 2  

---

## 1. ESTRUTURA DOM

```
<div id="command-center-shell">

  <!-- HEADER: Institutional Status Bar -->
  <header class="cc-header">
    <div class="cc-header-brand">
      LYZER EDGE — INSTITUTIONAL COMMAND CENTER
    </div>
    <div class="cc-header-status">
      <span class="cc-status-pill">L15 ACTIVE</span>
      <span class="cc-status-pill">GOVERNANCE: GREEN</span>
      <span class="cc-status-pill">ALPHA: IMMUTABLE</span>
      <span class="cc-status-pill">CAPITAL: NOT CONNECTED</span>
    </div>
  </header>

  <!-- NAVIGATION: 8 Module Tabs -->
  <nav class="cc-navigation">
    <button class="cc-nav-item active" data-module="overview">
      Executive Overview
    </button>
    <button class="cc-nav-item" data-module="reality">
      Reality Observatory
    </button>
    <!-- ... 6 more modules -->
  </nav>

  <!-- VIEWPORT: Active Module Container -->
  <main class="cc-viewport" id="cc-viewport">
    <!-- Active component renders here -->
  </main>

  <!-- FOOTER: Read-Only Attestation -->
  <footer class="cc-footer">
    MODE: READ-ONLY FIDUCIARY | VETO COUNT: 0
  </footer>

</div>
```

---

## 2. HIERARQUIA VISUAL

```
┌──────────────────────────────────────────────────────────┐
│ HEADER (40px)                                            │
│ Brand + 4 Status Pills (Stage/Gov/Alpha/Capital)         │
├──────────────────────────────────────────────────────────┤
│ NAVIGATION (36px)                                        │
│ 8 Module Tabs — Horizontal, Dense, Monospaced            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ VIEWPORT (flex: 1, overflow-y: auto)                     │
│                                                          │
│ Active Component renders here.                           │
│ Only ONE component mounted at a time.                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ FOOTER (24px)                                            │
│ Read-Only Attestation + Veto Counter                     │
└──────────────────────────────────────────────────────────┘
```

---

## 3. NAVEGAÇÃO — 8 MÓDULOS

| Index | Module Key       | Label                  | Component Class            |
| :---: | :---             | :---                   | :---                       |
| 0     | `overview`       | Executive Overview     | `ExecutiveOverview`        |
| 1     | `reality`        | Reality Observatory    | `RealityObservatory`       |
| 2     | `alpha`          | Alpha Integrity        | `AlphaIntegrityMonitor`    |
| 3     | `shadow`         | Shadow Execution       | `ShadowExecutionCenter`    |
| 4     | `endurance`      | Operational Survival   | `OperationalSurvivalCenter`|
| 5     | `blackswan`      | Black Swan Defense     | `BlackSwanDefensePanel`    |
| 6     | `forensics`      | Data Lineage           | `DataLineageForensics`     |
| 7     | `oversight`      | Human Oversight        | `HumanOversightPanel`      |

Navigation is tab-based, not route-based. The Shell controls which component
is mounted inside `cc-viewport`. The outer app router only needs to know about
a single route (`#/` or `#/command-center`) that mounts the entire Shell.

---

## 4. ESTADOS GLOBAIS

The Shell maintains a single consolidated state snapshot provided by the
`CommandCenterRuntimeAdapter`. The Shell itself has NO knowledge of:

- `RealityGapMonitor`
- `ShadowExecutionEngine`
- `ShadowWarEnduranceSuite`
- `AlphaObservationFirewall`
- `TruthKernel`

It consumes a **flat, pre-digested contract**:

```javascript
{
  system_stage: "L15",
  governance: "GREEN",
  alpha_state: "IMMUTABLE",
  capital_status: "NOT_CONNECTED",

  reality: {
    score: 98,
    state: "GREEN",
    slippage: 0.02,
    latency_ms: 12,
    ntp_drift_ms: 0.3
  },

  alpha: {
    truth_kernel_hash: "a8f5...",
    imce_hash: "c3d4...",
    smc_hash: "e7d1...",
    regime_hash: "f0a2...",
    mutation_attempts: 0,
    veto_count: 12
  },

  execution: {
    simulated_orders: 1240,
    filled: 1201,
    rejected_spread: 36,
    rejected_clock: 3
  },

  endurance: {
    uptime_pct: 99.99,
    heap_status: "GREEN",
    heap_growth_mb: 12.4,
    reconnect_events: 3,
    ledger_integrity: "VALID"
  },

  black_swan: {
    overall: "PASSED",
    scenarios_passed: 6,
    scenarios_total: 6
  },

  lineage: {
    verified: true,
    last_hash: "a8f5b2c9...",
    chain_length: 3
  }
}
```

---

## 5. RESPONSABILIDADES DOS COMPONENTES

### CommandCenterShell.js
- Owns the full-page layout (header, nav, viewport, footer)
- Obtains consolidated state from `CommandCenterRuntimeAdapter`
- Passes state to header status pills
- Delegates active module mounting to `CommandCenterRouter`
- Calls `securityGuard.inspect()` on any action attempt

### CommandCenterRouter.js
- Manages which of the 8 components is currently mounted
- Handles mount/unmount lifecycle cleanly
- Does NOT interact with the browser hash — the outer app router does that
- Exposes `navigateTo(moduleKey)` for tab switches

### CommandCenterNavigation.js
- Renders the 8-tab navigation bar
- Highlights the active tab
- Emits `onNavigate(moduleKey)` callbacks to the Shell
- Purely presentational — no data logic

### dashboardRuntimeAdapter.js
- **SOLE BRIDGE** between the Command Center UI and L15 runtime layers
- Consumes `dashboardDataProvider` internally
- Exposes ONLY `getSnapshot()` → returns consolidated contract above
- Has ZERO write methods
- Any attempt to add a write method must trigger `DASHBOARD_CONTROL_VETO`

---

## 6. SECURITY MODEL

All components remain strictly read-only:
- No `POST`, `PUT`, `PATCH`, `DELETE` methods
- No direct imports from L15 modules
- All data flows through `RuntimeAdapter → DataProvider → Validators`
- `securityGuard.inspect()` called on any suspicious action

```
Forbidden                              Allowed
─────────                              ───────
UI → RealityGapMonitor          ❌     UI → RuntimeAdapter.getSnapshot() ✅
UI → ShadowExecutionEngine      ❌     UI → RuntimeAdapter.getSnapshot() ✅
UI → TruthKernel                ❌     UI → RuntimeAdapter.getSnapshot() ✅
UI → dashboardDataProvider      ❌     RuntimeAdapter → dataProvider     ✅
```
