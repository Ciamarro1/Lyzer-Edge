# Lyzer Edge — Hidden Patterns & Emergent Architecture

> Generated: 2026-07-27
> Scope: Full codebase analysis (6,291 JS files, 37 source directories, 3 Rust workspaces)
> Purpose: Document the shadow architecture — what the code WANTS to be vs what it IS

---

## Section 1: Emergent Architecture

### 1.1 Layered Architecture (Partially Emergent)

An implicit 4-layer architecture has formed organically:

```
L4: APPLICATION LAYER
(server.js, streamEngine.js, alphaDiscoveryEngine.js, experimentManager.js, lyzerMindMRI.js, lyzerArcheologist.js)

L3: DOMAIN LAYER
(engine/*, eca/*, causal-*, smc/*, providers/*, csrl/*, mic/*, sil/*, adaptive-*, evolution-*, cognitive-*)

L2: INFRASTRUCTURE
(db/*, lib/*, services/*, workers/*, vm/*, types/*, observability/*, dsl/*)

L1: PRESENTATION
(components/*, styles/*, designSystem/*)
```

**Evidence**: The import graph shows Engine modules never import from Components. Database modules never import from Engine. However, streamEngine.js (L4) does import from all layers simultaneously — a violation of the implicit layering.

### 1.2 Hexagonal/Ports-Adapters Attempt (Failed)

The commandCenter/sdk/providers/ directory contains a clear ports/adapters attempt:
- IDataProvider.js — port/interface
- LiveProvider.js, ReplayProvider.js, MockProvider.js, HistoricalProvider.js — adapters
- ProviderRegistry.js — registry pattern

However, this pattern is **incomplete and orphaned**:
- It is only used by RealityOrchestrator.js and CommandCenterView.js
- The main trading pipeline (streamEngine.js) does NOT use it — it hard-imports providers directly
- No unit tests validate the provider contract (contracts/dataProvider.contract.js exists but may not run)
- The port/interface pattern co-exists awkwardly alongside the direct v1_smc_ict.js, v2_snd_snr.js import style

### 1.3 Accidental Monolith

Despite npm workspaces, the codebase operates as a monolith:

1. **Workspace packages are imported via relative paths**, never by package name (e.g., ../../packages/lyzer-shared/src/engine/kernel.js instead of @lyzer/shared)
2. This means the packages cannot be extracted and versioned independently — they are physically separated but logically coupled
3. The package.json declares @lyzer/shared and @lyzer/constitution as workspace packages, but NO file imports them by name
4. This is a **phantom monorepo** — the workspace structure exists but is unused

### 1.4 The Duplication Fractal

15 directories are **exactly mirrored** between lyzer edge/src/ and packages/lyzer-shared/src/:

| Mirrored Directory | Purpose |
|---|---|
| components | Vue/SPA components |
| db | Dexie database layer |
| dsl | Domain-specific language |
| engine | Signal processing, kernel, stats |
| kernelAdapters | TruthKernel adapter layer |
| laboratory | Adversarial testing |
| lib | Utility library |
| mic | Market Integrity Commission |
| microstructure | Market microstructure |
| providers | v1-v4 signal providers |
| services | Service layer |
| styles | CSS/styles |
| types | Type definitions |
| vm | Virtual machine |
| workers | Web workers |

**Impact**: Changes must be made in two places. The duplication is NOT a cache — the files within are NOT identical copies but have drifted independently. This is a **fractured mirror** pattern.

### 1.5 The ECA Duplication (Critical)

There are **TWO ECA (Constitutional Court)** implementations:

| Aspect | lyzer edge/src/eca/ (Frontend) | packages/lyzer-constitution/src/eca/ (Package) |
|---|---|---|
| Files | 10 | 12 |
| Has C-CLIST? | No | Yes (c-clist.js) |
| Has MOL? | No | Yes (mol.js) |
| court.js constructor | new ConstraintEngine() only | new ConstraintEngine() + new ContinuousCLIST() + new MetaObservationLayer() |
| Has configure() method? | No | Yes |
| Imported by | adversarialTesting.js, test files | streamEngine.js, replayEngine.js, test files |

The **package version** is the canonical one (used by production streamEngine.js). The **src version** is a stale fork. The presence of both creates ambiguity — which court.js does a new developer import?

---

## Section 2: Module Clusters

### 2.1 ECA Cluster (Constitutional Court)
Files that import from ECA modules (court, ledger, axioms, vault, permission, etc.):
- packages/lyzer-shared/src/laboratory/adversarialTesting.js — imports 5 ECA modules
- lyzer edge/src/laboratory/adversarialTesting.js — imports 5 ECA modules (mirrored)
- packages/lyzer-shared/src/smc/replayEngine.js — imports ConstitutionalCourt
- lyzer edge/backend/streamEngine.js — imports ConstitutionalCourt, court
- packages/lyzer-constitution/src/eca/court.js — imports ledger, constraintEngine, c-clist, mol
- packages/lyzer-shared/src/mic/zombieEngine.js — imports KillSwitch
- packages/lyzer-shared/src/mic/gateway.js — imports verifyToken
- 12+ test/verification files

### 2.2 Engine Cluster (Trading Pipeline)
Files that import from engine/*:
- **SystemHealthView** — imports 8 engine modules (sml, fmc, epe, gal, cfr, rsis, rdm, stl) — **heaviest consumer**
- **DecisionStream** — imports SignalEngine, TruthKernel
- **Dashboard** — imports calcAllStats, calcEdgeScore
- **EdgeExplorerView, Recommendations, ReplayView, BehaviorView, EdgeScoreRing, MonteCarloView, StrategyLab** — various engine imports
- streamEngine.js — imports EvSignalEngine, computeTradeEV, TruthKernel
- workers/worker.js — imports 4 engine modules
- 20+ test/verification files

### 2.3 Provider Cluster
Files that import from providers/*:
- streamEngine.js — imports v1, v2, v3, v4 providers
- run_binance_backtest.js — imports v1, v2, v3 providers
- optimize_backtest.js — imports v1, v2, v3 providers
- packages/lyzer-shared/src/research/replayEngine.js — imports v1, v2, v3, v4 providers
- CommandCenterView.js — imports ProviderRegistry, LiveProvider
- RealityOrchestrator.js — imports ProviderRegistry

### 2.4 Overlap Zone — The God Modules
Modules that import from **3+ clusters** simultaneously:

| Module | Engine | ECA | Providers | CSRL | SMC | Observability |
|---|---|---|---|---|---|---|
| **streamEngine.js** | YES | YES | YES | YES | YES | YES |
| **full_system_execution_auditor.js** | YES | YES | - | - | - | - |
| **adversarialTesting.js** | YES | YES | - | - | - | - |
| **runtime_profiler_harness.js** | YES | YES | - | - | - | - |
| **replayEngine.js** (research) | YES | YES | YES | - | - | - |
| **verify_stream.js** | YES | YES | - | - | - | - |
| **verify_robustness.js** | YES | YES | - | - | - | - |
| **verify_mne.js** | YES | YES | - | - | - | - |

**streamEngine.js is the super-god module** — it imports from all 6 identified clusters plus local backend files and observability. It is 954 lines and growing.

### 2.5 The SystemHealthView Anomaly
SystemHealthView.js (both src/ and packages/ versions) imports **8 modules from engine/** — more than any other single file. These are all metacognitive/systemic modules (sml, fmc, epe, gal, cfr, rsis, rdm, stl). This cluster forms an implicit **"System Health" sub-domain** that could be extracted into its own module.

---

## Section 3: The Shadow Architecture

### 3.1 What The Code WANTS To Be

**Microservice Boundaries (Documented But Not Implemented)**

The file lyzer edge/docs/runtime_topology.md describes a 3-process distributed architecture:
1. Execution Node (trading pipeline)
2. ECA Court Node (constitutional enforcement)
3. Dashboard Node (UI + reporting)

However, in reality:
- The ECA Court runs **in-process** as a singleton (export const court = new ConstitutionalCourt())
- No inter-process communication exists between these nodes
- The gRPC services defined in lyzer.proto are partially implemented in Rust (src-ts/ TypeScript stubs exist) but the JS backend does NOT use them
- NATS server is started in Docker but not leveraged for inter-module communication

**CQRS (Command Query Responsibility Segregation)**

Evidence of attempted CQRS:
- causal-memory/EventStore.js — command-side event append
- causal-learning/MemoryMiningEngine.js — query-side pattern mining
- However, the main pipeline uses **mutable shared state** (module-level signalEngine singleton) rather than event-driven CQRS

**Event Sourcing**

Evidence:
- causal-memory/ directory with EventStore, RewindEngine
- adaptive-sandbox/ParameterVersionStore.js — versioned parameter changes
- But the trading pipeline does NOT use event sourcing for its core decisions
- No event replay mechanism exists for production recovery

**What The Code WANTS To Be**: A 3-node distributed system with CQRS/event sourcing, inter-process gRPC communication, and pluggable provider architecture.

**What The Code IS**: A single-process monolith with microservice scaffolding that surrounds but never connects to the core pipeline.

### 3.2 Attempted-But-Abandoned Patterns

| Pattern | Evidence | Status |
|---|---|---|
| Ports/Adapters | IDataProvider.js, 4 adapters, registry | Used only in CommandCenter, not main pipeline |
| Codebase archeology | lyzerArcheologist.js, lyzerMindMRI.js | Built, documented, but not integrated into pipeline |
| Experiment management | ExperimentManager.js, .env.exp-* files | Fully functional but operates as a sidecar, not influencing live trading |
| Autonomous research | ResearchScientist.js, AutoExperiments.js | Complete but disconnected from the main pipeline |
| Adaptive sandbox | AdaptivePipelineController.js, AdaptiveShadowEngine.js | Built as shadow system, not yet authoritative |
| Distributed runtime | distributed-runtime/ directory | Tests exist but no production entrypoint uses it |

**Interpretation**: The codebase has a pattern of **building the future architecture alongside the present one** without ever completing the migration. The result is a palimpsest — layers of architectural ambition written over a functioning but simpler system.

### 3.3 The Ghost Network

The gRPC services defined in lyzer.proto describe:
- RiskGateway.Authorize — risk checking service
- IntentRegistry.{RegisterIntent, AppendIntentEvent, AuditQuery} — audit trail service
- UUIDv7 for causal traceability

These services are implemented as TypeScript stubs in src-ts/ and Rust binaries, but:
- The main JS backend (server.js, streamEngine.js) does NOT call these gRPC services
- The RiskGateway concept exists in src-ts/governance/ protos but not in JS
- The IntentRegistry has DB-backed TS stubs but is never invoked by the trading pipeline

This is a **ghost network** — the contracts exist, the infrastructure is scaffolded, but the actual data flows bypass it entirely.

---

## Section 4: Naming Convention Drift

### 4.1 File Naming Patterns

Analysis reveals **8 distinct naming conventions**:

| Convention | Example | Prevalence | Notes |
|---|---|---|---|
| PascalCase | AlphaDecayEngine.js | **Dominant** for classes | Consistent with class naming |
| camelCase | alphaDecayMonitor.js | Common for utilities | Inconsistent with file class name |
| kebab-case | N/A | None | Not used at all |
| snake_case | v1_smc_ict.js, v2_snd_snr.js | Providers only | Consistent sub-domain convention |
| Dotted | c-clist.js, mol.js | Rare | Used for acronym/abbreviated modules |
| ALL lower | stats.js, risk.js, db.js | Common utilities | Functional, not semantic |
| Mixed | evSignalRedesign.js, evProfiler.js | Frequent | ev lowercase prefix convention |

### 4.2 Class Name vs File Name Mismatches

Files where the class name does NOT match the file name:
- court.js exports ConstitutionalCourt (name is more general than class)
- kernel.js exports TruthKernel (kernel is generic, TruthKernel is specific)
- signalEngine.js exports SignalEngine (matches)
- ledger.js exports ConstitutionalLedger (file under-specified)
- permission.js exports PermissionToken and verifyToken (file named for concept, exports function + class)
- vault.js exports IrreversibilityVault (file under-specified)

### 4.3 Abbreviation Drift

The codebase is inconsistent about when it abbreviates:

| Abbreviation | Full Form | Files Using Abbrew. | Files Using Full |
|---|---|---|---|
| EV | Expected Value | ev*.js, EvSignalEngine | (rare) |
| TRG | Tail Risk Geometry | Config vars only | (not in filenames) |
| SMC | Smart Money Concepts | smc/ directory | (0 files) |
| CSRL | Cross-Scale Representation Learning | csrl/ directory | (not expanded anywhere) |
| ECA | Epistemic Constitutional Authority | eca/ directory | (not expanded anywhere) |
| MIC | Market Integrity Commission | mic/ directory | (not expanded anywhere) |
| MOL | Meta Observation Layer | mol.js | (not expanded anywhere) |
| LHDS | Latent Harmonic Divergence Score | Config vars only | (not in filenames) |
| DVF | Divergence Vector Field | Config vars only | (not in filenames) |
| C-CLIST | Cumulative Continuous Lethal Illusion Stress Test | c-clist.js | (not expanded anywhere) |

**Observation**: Acronyms are NEVER expanded in file paths. A new developer cannot derive the meaning of csrl/, eca/, or mic/ from the filesystem alone. This is an **accretion of jargon** — the domain model has become opaque to outsiders.

---

## Section 5: Configuration Chaos

### 5.1 Configuration Sources

The codebase reads configuration from at least 5 different sources:

1. **Environment variables** — process.env.* with inline fallbacks (in streamEngine.js, server.js)
2. **Hardcoded defaults** — multiple layers (e.g., TRG_THRESHOLD default 0.4 appears in streamEngine.js AND .env.template AND AGENTS.md)
3. **Constructor defaults** — e.g., new TruthKernel({ trgThreshold: 0.8 }) in test files (DIFFERENT from the 0.4 default in streamEngine.js)
4. **Config objects** — e.g., cclistConfig = { dvfFloor: ..., stressAccumulation: ... }
5. **Inferred defaults** — e.g., DISABLED_PROVIDERS defaults to 'v1,v3' only in streamEngine.js

### 5.2 Default Value Dispersion

The same default values appear in MULTIPLE places:

| Parameter | streamEngine.js | .env.template | AGENTS.md | Tests |
|---|---|---|---|---|
| TRG_THRESHOLD | 0.4 | 0.4 | 0.4 | 0.8 (cognitive_flow.test.js) |
| RESIDUAL_CONSENSUS_LIMIT | 0.1 | 0.1 | 0 | - |
| LHDS_VETO_LIMIT | 0.8 | 0.8 | - | - |
| ONTOLOGICAL_COLLAPSE_TRG | 0.7 | 0.7 | - | - |
| MOL_SCL_THRESHOLD | 3 | 3 | - | - |

**Problem**: If someone changes the default in .env.template, the hardcoded fallback in streamEngine.js still uses the old value. There is no single source of truth for defaults.

### 5.3 The .env Explosion

8 .env-related files exist:
- .env (root)
- lyzer edge/.env
- lyzer edge/.env.example
- lyzer edge/.env.template
- lyzer edge/.env.exp-a through .env.exp-d (experiment configs)

The experiment configs (.exp-a through .exp-d) are used by deploy-experiments.ps1 but there is no validation that they contain all required variables. A mistyped variable name would silently fall through to the hardcoded default.

---

## Section 6: The Hidden Contract

### 6.1 Implicit Module Contracts

**Contract 1: The court Singleton Contract**
- court is exported as a module-level singleton from BOTH lyzer edge/src/eca/court.js AND packages/lyzer-constitution/src/eca/court.js
- **Implicit assumption**: Only one court instance exists in the process
- **Enforcement**: None. Multiple imports could create multiple instances if tree-shaking fails
- **Violation risk**: If streamEngine.js imports from packages/lyzer-constitution/src/eca/court.js and adversarialTesting.js imports from ../eca/court.js (relative), they get DIFFERENT singletons
- **Current state**: streamEngine.js imports from the package version; adversarialTesting.js imports from src version. These are DIFFERENT instances.

**Contract 2: The Pipeline Ordering Contract**
- The trading pipeline has an implicit order: Candles -> Providers -> Residualization -> ExecutionTrigger -> TruthKernel -> C-CLIST -> MOL -> Court -> Execution
- **Implicit assumption**: Steps execute in strict order, each receiving output from the previous
- **Enforcement**: None. It is enforced by processCandle() method ordering in streamEngine.js
- **Violation risk**: Any new pipeline stage added to the middle must update the ordering manually

**Contract 3: The EEF Field Protocol**
- TruthKernel.evaluate() returns an object containing eef (Execution Eligibility Flag)
- court.requestPermission('EXECUTE_TRADE', rawState, { eef, reason }) expects eef in the payload
- **Implicit assumption**: The eef field always exists and is a boolean
- **Enforcement**: None by TypeScript (there is none). JavaScript will silently pass undefined

**Contract 4: The Provider Interface Contract**
- v1 (v1_smc_ict.js), v2 (v2_snd_snr.js), v3 (v3_momentum_rsi.js), v4 (v4_imce.js) all export a class with analyze(candles) method
- **Implicit assumption**: All providers return objects with a consistent shape (containing signal, direction, confidence)
- **Enforcement**: None. There is no base class or interface validation

**Contract 5: The signalEngine Singleton Contract**
- signalEngine is created at module scope in streamEngine.js (const signalEngine = new EvSignalEngine())
- All 6 StreamEngine instances share this one signalEngine
- **Implicit assumption**: EvSignalEngine is stateless or thread-safe
- **Enforcement**: None. If EvSignalEngine has internal mutable state, concurrent candle processing from 6 engines will corrupt it

**Contract 6: The LHDS/DVF Semantic Contract**
- TruthKernel calculates LHDS (Latent Harmonic Divergence Score)
- C-CLIST consumes DVF (Divergence Vector Field) — NOT LHDS
- DVF is the output of ResidualizationLayer
- **Implicit assumption**: DVF has been calculated before C-CLIST evaluates
- **Enforcement**: C-CLIST does not check if DVF is provided; it defaults to 0

**Contract 7: The Causality Hash Chain Contract**
- causal-memory/EventStore.js implements a hash-linked event chain
- Each event stores previousHash and computes its own hash
- **Implicit assumption**: The caller provides a correct previousHash
- **Enforcement**: The EventStore computes SHA256(previousHash + eventData) but does NOT verify the chain integrity on read

### 6.2 Structural Risks Summary

| Risk | Severity | Likelihood | Impact |
|---|---|---|---|
| Dual court singletons | HIGH | MEDIUM | Two independent court instances with different state |
| SignalEngine shared state corruption | HIGH | LOW-MEDIUM | Concurrent access to mutable state from 6 engines |
| Provider interface drift | MEDIUM | HIGH | One provider returning different shape breaks pipeline silently |
| Pipeline ordering violation | MEDIUM | LOW | Wrong stage ordering produces incorrect results |
| Config default drift | LOW | HIGH | Changed .env.template but streamEngine.js fallback unchanged |
| EventStore integrity not validated | MEDIUM | LOW | Tampered events not detectable on read path |
| No payload validation | MEDIUM | HIGH | Undefined fields propagate silently through the pipeline |

### 6.3 Accidental Complexity Metrics

| Metric | Count | Interpretation |
|---|---|---|
| throw statements | 15,659 | Extremely defensive — errors are thrown at every boundary |
| try/catch blocks | 7,158 | 46% of throws are caught; 54% propagate |
| callback patterns | 4,730 | Heavily callback-based, despite async/await being available |
| async function | ~100 | Underused; main pipeline uses callbacks instead of async |
| .then() chains | 8 | Near-absence of Promise chaining — callbacks preferred |
| Exported classes | 808 | Primary architectural unit |
| Exported functions | 2,308 | Utility functions complement classes |
| new Xxx() at module scope | 63 | 63 module-level singletons/instances |

**The callback dominance** (4,730 callbacks vs ~100 async functions) is a notable architectural choice. The main pipeline in streamEngine.js uses async/await for top-level methods but callbacks for the data ingestion chain (_doPoll passes a callback). This creates an **async/callback hybrid** that makes the control flow harder to trace.

---

## Section 7: NPM Workspace Phantom

The monorepo declares 3 workspace packages:
```
packages/
  lyzer-shared/      -> @lyzer/shared
  lyzer-constitution/ -> @lyzer/constitution
  data/              -> (unnamed?)
```

**Current state**: NO file in the codebase imports from @lyzer/shared or @lyzer/constitution. All imports use relative paths like ../../packages/lyzer-shared/src/engine/kernel.js.

**Consequence**: The npm workspace resolution is never exercised. The packages could be removed from package.json without changing behavior. This is a **workspace phantom** — the structure exists for future use but currently serves no purpose.

---

## Section 8: Process Topology Gap

### Documented Topology (from runtime_topology.md)
```
Execution Node <-> ECA Court Node <-> Dashboard Node
```

### Actual Topology
```
Single process (Node.js)
  server.js (Express 5 + WebSocket)
    6 x StreamEngine instances
      TruthKernel (per instance)
      court (shared SINGLETON)
      signalEngine (shared SINGLETON)
    ExperimentManager (SQLite-backed)
    LyzerArcheologist, LyzerMindMRI (sidecars)
    All in ONE process, ONE event loop
```

**The gap**: The documented 3-node architecture with gRPC boundaries exists in documentation, protobuf definitions, and TypeScript stubs — but the actual production system is a single-process monolith. The distributed architecture is a **designed future state** that has been scaffolded but never wired into the running system.

---

## Appendix A: Key File Paths

| Role | Absolute Path |
|---|---|
| Production entrypoint | .../lyzer edge/backend/server.js |
| God module | .../lyzer edge/backend/streamEngine.js |
| Court singleton (package canonical) | .../packages/lyzer-constitution/src/eca/court.js |
| Court stale fork (src) | .../lyzer edge/src/eca/court.js |
| Truth kernel | .../packages/lyzer-shared/src/engine/kernel.js |
| Signal engine | .../packages/lyzer-shared/src/engine/evSignalRedesign.js |
| Provider v1 | .../packages/lyzer-shared/src/providers/v1_smc_ict.js |
| Provider v2 | .../packages/lyzer-shared/src/providers/v2_snd_snr.js |
| Provider v3 | .../packages/lyzer-shared/src/providers/v3_momentum_rsi.js |
| Provider v4 | .../packages/lyzer-shared/src/providers/v4_imce.js |
| Event store | .../lyzer edge/src/causal-memory/EventStore.js |
| gRPC proto | .../lyzer edge/src-proto/lyzer.proto |
| Config template | .../lyzer edge/.env.template |
| Process topology doc | .../lyzer edge/docs/runtime_topology.md |
| C-CLIST (package only) | .../packages/lyzer-constitution/src/eca/c-clist.js |
| MOL (package only) | .../packages/lyzer-constitution/src/eca/mol.js |

---

*Generated by Pattern Matcher analysis — no source code was modified.*
