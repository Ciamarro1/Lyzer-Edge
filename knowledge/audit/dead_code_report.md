# Dead Code Report — L4 Adversarial Audit

**Mission**: L4 — System Optimization  
**Date**: 2026-07-24  
**Methodology**: Import graph tracing from `streamEngine.js` → all transitive deps

---

## Executive Summary

| Area | Total Files | ACTIVE | DEAD | Potential Removal |
|---|:---:|:---:|:---:|:---:|
| `engine/` | 41 | 7 | 34 | **~175 KB / ~4,100 LoC** |
| `backend/` | 36 | 18 | ~12 | **~35 KB** |
| `smc/` | 8 | 5 | 3 | **~6 KB** |
| **TOTAL** | 85 | 30 | **~49** | **~216 KB / ~5,000 LoC** |

---

## 1. Engine Directory (`packages/lyzer-shared/src/engine/`) — 41 files

### ACTIVE (7 files, ~40 KB)

| File | Size | Imported By |
|---|:---:|---|
| `kernel.js` | 3,039 | streamEngine.js |
| `residualization.js` | 3,891 | kernel.js |
| `executionTriggerLayer.js` | 1,447 | kernel.js |
| `evSignalRedesign.js` | 12,811 | streamEngine.js |
| `evProfiler.js` | 6,944 | streamEngine.js |
| `evMTFEngine.js` | 5,591 | evSignalRedesign.js |
| `evFeatureCausalEngine.js` | 6,075 | evSignalRedesign.js |

### DEAD (34 files, ~175 KB) — Safe to Archive

| File | Size | Imported By | Recommendation |
|---|:---:|---|---|
| `alerts.js` | 5,099 | NONE | REMOVE |
| `allocation.js` | 4,082 | NONE | REMOVE |
| `behavior.js` | 1,743 | intelligence.js (also dead) | REMOVE |
| `cfr.js` | 4,826 | NONE | REMOVE |
| `decay.js` | 2,610 | intelligence.js (also dead) | REMOVE |
| `decisionTrace.js` | 1,905 | NONE | REMOVE |
| `edgescore.js` | 9,518 | genome.js (also dead) | REMOVE |
| `epe.js` | 4,135 | NONE | REMOVE |
| `evDecompositionLab.js` | 19,926 | NONE | REMOVE |
| `evOptimizer.js` | 7,663 | NONE | REMOVE |
| `executionReality.js` | 3,539 | evDecompositionLab.js (also dead) | REMOVE |
| `fmc.js` | 9,228 | NONE | REMOVE |
| `gal.js` | 3,358 | NONE | REMOVE |
| `genome.js` | 4,108 | NONE | REMOVE |
| `intelligence.js` | 3,791 | fmc.js (also dead) | REMOVE |
| `montecarlo.js` | 4,722 | scenarios.js (also dead) | REMOVE |
| `opportunity.js` | 3,755 | NONE | REMOVE |
| `outliers.js` | 6,619 | NONE | REMOVE |
| `patterndiscovery.js` | 5,984 | NONE | REMOVE |
| `rdm.js` | 2,879 | NONE | REMOVE |
| `regime.js` | 3,676 | EVAlphaResearchEngineV2.js (dead) | REMOVE |
| `reliability.js` | 2,624 | intelligence.js (also dead) | REMOVE |
| `replay.js` | 1,299 | NONE | REMOVE |
| `risk.js` | 3,329 | intelligence.js (also dead) | REMOVE |
| `rsis.js` | 4,893 | regime_conditioner.js (dead backend) | REMOVE |
| `scenarios.js` | 6,928 | alerts.js (also dead) | REMOVE |
| `segmentation.js` | 7,585 | NONE | REMOVE |
| `signalEngine.js` | 2,632 | NONE (legacy wrapper) | REMOVE |
| `sizing.js` | 6,852 | NONE | REMOVE |
| `sml.js` | 13,323 | NONE | REMOVE |
| `stats.js` | 17,438 | behavior.js (also dead) | REMOVE |
| `stl.js` | 3,870 | NONE | REMOVE |
| `zPolicyEngine.js` | 1,384 | NONE | REMOVE |
| `zSpaceEVOptimizer.js` | 3,740 | NONE | REMOVE |

**Pattern**: Many of these dead files form isolated import subgraphs (e.g., `intelligence.js` imports `behavior.js`, `decay.js`, `reliability.js`, `risk.js` — but `intelligence.js` itself is only imported by `fmc.js` which is also dead). The entire subgraph is orphaned.

---

## 2. Backend Directory (`lyzer edge/backend/`) — 36 files

### ACTIVE (18 files)

| File | Size | Imported By |
|---|:---:|---|
| `server.js` | 12,453 | entrypoint |
| `streamEngine.js` | 35,980 | server.js |
| `liveDataIngestor.js` | 10,519 | streamEngine.js |
| `exchangeExecution.js` | 2,192 | streamEngine.js |
| `EVAlphaResearchEngineV3_3.js` | 6,732 | streamEngine.js |
| `dualRealityMonitor.js` | 3,945 | streamEngine.js |
| `spectrogramUI.js` | 2,620 | streamEngine.js |
| `telegram.js` | 2,974 | streamEngine.js |
| `extinctionEngine.js` | 4,758 | EVAlphaResearchEngineV3_3.js |
| `metricsTracker.js` | 1,788 | extinctionEngine.js |
| `eventsLogger.js` | 1,792 | extinctionEngine.js |
| `speciesManager.js` | 5,706 | extinctionEngine.js |
| `selectorPool.js` | 5,573 | extinctionEngine.js |
| `MetaFitnessEngine.js` | 655 | EVAlphaResearchEngineV3_3.js |
| `CounterfactualWorldSimulator.js` | 645 | EVAlphaResearchEngineV3_3.js |
| `RegimePermutationLab.js` | 371 | EVAlphaResearchEngineV3_3.js |
| `SelectorGenome.js` | 1,739 | selectorPool.js |
| `statePersistence.js` | 1,597 | server.js |

### DEAD (12+ files)

| File | Size | Status | Recommendation |
|---|:---:|---|---|
| `EVAlphaResearchEngine.js` | 294 | Legacy V1 stub | REMOVE |
| `EVAlphaResearchEngineV2.js` | 5,690 | Superseded by V3_3 | REMOVE |
| `EVAlphaResearchEngineV3.js` | 7,042 | Superseded by V3_3 | INVESTIGATE (V3_3 imports from it) |
| `EVAlphaResearchEngineV3_2.js` | 7,312 | Superseded by V3_3 | REMOVE |
| `crossAssetInference.js` | 4,622 | DEAD | REMOVE |
| `historicalCsrlAnalysis.js` | 5,055 | DEAD | REMOVE |
| `historicalDataIngestor.js` | 3,115 | DEAD | REMOVE |
| `replayStreamEngine.js` | 7,496 | DEAD | REMOVE |
| `alphaClusterEngine.js` | 1,838 | V2 only | REMOVE |
| `alphaSignals.js` | 2,676 | V2 only | REMOVE |
| `alphaTestRunner.js` | 1,750 | V2 only | REMOVE |
| `overfitDetector.js` | 1,830 | V2 only | REMOVE |
| `router.js` | 2,632 | DEAD | REMOVE |
| `arbitrator.js` | 1,564 | router.js (dead) | REMOVE |
| `rsis_classifier.js` | 1,216 | DEAD | REMOVE |
| `regimeConditioner.js` | 1,214 | V2 only | REMOVE |
| `regime_conditioner.js` | 1,068 | router.js (dead) | REMOVE |

---

## 3. SMC Directory (`packages/lyzer-shared/src/smc/`) — 8 files

| File | Size | Status | Imported By |
|---|:---:|:---:|---|
| `liquidityEngine.js` | 13,400 | ACTIVE | streamEngine.js |
| `structureEngine.js` | 5,345 | ACTIVE | streamEngine.js |
| `smcFacade.js` | 4,489 | ACTIVE | streamEngine.js |
| `timeframeManager.js` | 13,996 | ACTIVE | smcFacade.js, smc/replayEngine.js |
| `trendEngine.js` | 3,178 | ACTIVE | smcFacade.js |
| `adaptiveRegimePolicy.js` | 1,810 | **DEAD** | NONE |
| `replayEngine.js` | 7,082 | INVESTIGATE | runtimeParityReplay.js (dead) |
| `runtimeParityReplay.js` | 4,145 | **DEAD** | NONE |

---

## Total Impact

| Metric | Current | After Cleanup |
|---|:---:|:---:|
| Engine files | 41 | 7 |
| Backend files | 36 | ~18 |
| SMC files | 8 | 5 |
| Estimated LoC removed | — | **~5,000 LoC** |
| Estimated KB removed | — | **~216 KB** |
| Complexity reduction | — | **~60%** |
