# System Simplification Plan — Architecture Optimization

**Mission**: L4 — Continuous Alpha Evolution  
**Date**: 2026-07-24  
**Principle**: "Não adicione complexidade sem prova de ganho."

---

## Current State

```
Total Source Files: ~85 (engine + backend + smc)
Active in Pipeline: ~30 (~35%)
Dead/Orphaned: ~49 (~58%)
Under Investigation: ~6 (~7%)

Engine Directory: 41 files → only 7 active (83% dead)
Backend Directory: 36 files → only 18 active (50% dead)
```

---

## Phase 1: Safe Removals (Zero Risk)

These files have **no imports from any active code path**:

### 1.1 Engine Dead Code (34 files → archive to `_archive/engine/`)

```
alerts.js          allocation.js     behavior.js       cfr.js
decay.js           decisionTrace.js  edgescore.js      epe.js
evDecompositionLab.js               evOptimizer.js    executionReality.js
fmc.js             gal.js            genome.js         intelligence.js
montecarlo.js      opportunity.js    outliers.js       patterndiscovery.js
rdm.js             regime.js         reliability.js    replay.js
risk.js            rsis.js           scenarios.js      segmentation.js
signalEngine.js    sizing.js         sml.js            stats.js
stl.js             zPolicyEngine.js  zSpaceEVOptimizer.js
```

**Evidence**: Import graph trace from `streamEngine.js` finds zero paths to any of these files.

### 1.2 Backend Legacy Versions (4 files)

```
EVAlphaResearchEngine.js     (V1 stub, 294 bytes)
EVAlphaResearchEngineV2.js   (Superseded, 5,690 bytes)
EVAlphaResearchEngineV3.js   (→ INVESTIGATE first: V3_3 may extend it)
EVAlphaResearchEngineV3_2.js (Superseded, 7,312 bytes)
```

### 1.3 Backend Orphans (8+ files)

```
crossAssetInference.js    historicalCsrlAnalysis.js
historicalDataIngestor.js replayStreamEngine.js
alphaClusterEngine.js     alphaSignals.js
alphaTestRunner.js        overfitDetector.js
router.js                 arbitrator.js
rsis_classifier.js        regimeConditioner.js
regime_conditioner.js
```

### 1.4 SMC Dead Code (2 files)

```
adaptiveRegimePolicy.js   runtimeParityReplay.js
```

---

## Phase 2: Consolidation Opportunities

| Current | Proposal | Rationale |
|---|---|---|
| V1 provider duplicates SMC Engine | Merge or remove V1 | Both detect FVGs and BOS on same data |
| `smc/replayEngine.js` vs `research/replayEngine.js` | Keep research/, remove smc/ | Research version is newer and more complete |
| `evSignalRedesign.js` + `evMTFEngine.js` + `evFeatureCausalEngine.js` | Move to `engine/signal/` subfolder | Logical separation from TruthKernel core |

---

## Phase 3: Complexity Budget

### Current

| Component | Files | LoC (est.) | Active? |
|---|:---:|:---:|:---:|
| engine/ | 41 | ~5,300 | 7 files active |
| backend/ | 36 | ~4,500 | 18 files active |
| smc/ | 8 | ~1,000 | 5 files active |
| csrl/ | 4 | ~300 | 4 files active |
| providers/ | 4 | ~600 | 4 files active |
| causality/ | 4 | ~250 | 3 files active |
| constitution/ | ~15 | ~1,200 | ~8 files active |
| research/ | 5 | ~900 | 5 files active |
| **TOTAL** | **~117** | **~14,050** | **~54 active** |

### Target (After Phase 1)

| Component | Files | LoC (est.) | Change |
|---|:---:|:---:|:---:|
| engine/ | 7 | ~1,200 | -34 files (-4,100 LoC) |
| backend/ | ~18 | ~2,800 | -13 files (-1,700 LoC) |
| smc/ | 5 | ~700 | -3 files (-300 LoC) |
| csrl/ | 4 | ~300 | unchanged |
| providers/ | 4 | ~600 | unchanged |
| causality/ | 3 | ~200 | -1 file (-50 LoC) |
| constitution/ | ~8 | ~800 | -7 files (-400 LoC) |
| research/ | 5 | ~900 | unchanged |
| **TOTAL** | **~54** | **~7,500** | **-63 files (-6,550 LoC)** |

### Complexity Reduction: **46% fewer LoC, 54% fewer files**

---

## Risk Assessment

| Action | Risk | Mitigation |
|---|:---:|---|
| Remove 34 engine files | LOW | No active imports found; move to `_archive/` first |
| Remove V1/V2/V3 EV engines | LOW | Only V3_3 is imported by streamEngine |
| Remove backend orphans | LOW | Import graph confirms no references |
| Remove SMC dead code | LOW | No active imports |
| Merge V1 into SMC | MEDIUM | Requires integration test — defer to RE9 experiment |

---

## Execution Plan

```
Step 1: mkdir _archive/engine _archive/backend _archive/smc
Step 2: Move 34 dead engine files to _archive/engine/
Step 3: Move 13 dead backend files to _archive/backend/
Step 4: Move 2 dead smc files to _archive/smc/
Step 5: npm test (verify nothing breaks)
Step 6: If tests pass → commit with message "chore: archive ~50 dead code files (~6.5K LoC)"
Step 7: Monitor for 1 week in staging
Step 8: If no issues → delete _archive/
```
