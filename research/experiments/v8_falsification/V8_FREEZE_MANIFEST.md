# V8 Institutional Quant Signal Engine — Freeze Manifest
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Date/Time UTC**: `2026-09-03T00:43:00.000Z`  
**Git Baseline Commit**: `af29a48794c58b89ca51d6762fc5507e0d95e173`  
**Node Runtime**: `v24.15.0` (x64 / Windows NT 10.0.19045)  
**Status**: 🔒 **LOCKED (IMMUTABLE BASELINE)**  

---

## 1. Frozen Object Specification

- **Class Name**: `InstitutionalQuantSignalEngine`
- **Engine Source ID**: `INSTITUTIONAL_QUANT` (Engine Alias: `V8`)
- **Version**: `1.1.0`
- **Target File**: `packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js`
- **SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`
- **Byte Size**: `34,339 bytes`

---

## 2. Integrated Codebase Cryptographic Hashes

| Component | Relative Path | SHA-256 | Size (Bytes) |
|---|---|---|---|
| **V8 Core Provider** | `packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js` | `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` | 34,339 |
| **V8 Provider Alias** | `packages/lyzer-shared/src/providers/v8_institutional_quant.js` | `4ecb42c7a81763b927cc445c20bded02b6aa9638ddf354363cc4dc33e7155bf4` | 325 |
| **Lyzer Shared Index** | `packages/lyzer-shared/src/index.js` | `3de04a970a59b6b121c2923f39f6764eb75f354a3f12fcea56cc230e60cb0145` | 292 |
| **Dynamic Weight Matrix** | `packages/lyzer-shared/src/engine/weightMatrix.js` | `97d5d195469b3f0e9a52b158935f62e0acc641cd72144c9344f071d4f2139796` | 2,236 |
| **Truth Kernel ECA Gate** | `packages/lyzer-constitution/src/eca/truthKernel.js` | `c7d303eed0e9af02ebe9f2489a459ccc724aee97d88f47cdfe276d69e46e60fc` | 11,257 |
| **Production StreamEngine** | `lyzer edge/backend/streamEngine.js` | `720cf08ccf03d5fb1f889d3ecbf46457f4e6c7d4cc24e8435c054a1366fc2916` | 103,134 |
| **Evidence Fusion Engine** | `lyzer edge/src/components/commandCenter/sdk/evidence/fusion/EvidenceFusionEngine.js` | `8e91ad2cc89221943026b5697e09edbd22c36ab9ea8e1a0ac5eecf3b181c8ac7` | 9,711 |
| **V8 Unit Test Suite** | `lyzer edge/tests/providers/institutional_quant_signal_engine.test.js` | `c501d93f76a4db6638f0d35b9148f1b66460ee2019008606c26db408f7d804d4` | 19,004 |

---

## 3. Frozen Effective Parameters (Zero Modification Rule)

```json
{
  "lookback": 64,
  "minBars": 30,
  "significanceLevel": 0.05,
  "zScoreThreshold": 1.96,
  "tStatThreshold": 2.00,
  "hurstMeanReversionMax": 0.45,
  "hurstTrendingMin": 0.55,
  "minHalfLife": 2.0,
  "maxHalfLife": 35.0,
  "volShockMultiplier": 2.8,
  "volShockFloor": 0.005,
  "maxExpectedShortfall": 0.06,
  "maxNegativeSkew": -1.2,
  "maxPositiveSkew": 1.2,
  "kurtosisThreshold": 3.0,
  "ofiVetoThreshold": 0.30,
  "preferredTimeframe": "intermediate"
}
```

---

## 4. Pre-Registered Datasets for Falsification

| Dataset Identifier | Relative File Path | SHA-256 | Bars | Time Range (UTC) |
|---|---|---|---|---|
| **BTCUSDT_1h** | `research/datasets/batch039/BTCUSDT_1h.json` | `d2ab2b0234ee372cd01ba56cc9e952a0bc0d05802dcc2a8ed07b4e022011a79f` | 32,136 | 2023-01-01T00:00Z → 2026-08-31T23:00Z |
| **ETHUSDT_1h** | `research/datasets/batch039/ETHUSDT_1h.json` | `e760a6fb079e3364860f139c99d20ada7cd47842263d6afcb30fda1728e7b124` | 32,136 | 2023-01-01T00:00Z → 2026-08-31T23:00Z |
| **SOLUSDT_1h** | `research/datasets/batch039/SOLUSDT_1h.json` | `b9c9732ee4a4b57746acd5df4d15efe1bbda3c3000f01a1d136897fb6303660d` | 32,136 | 2023-01-01T00:00Z → 2026-08-31T23:00Z |

---

## 5. Non-Negotiable Governance & Anti-P-Hacking Axioms

1. **Absolute Freeze**: Any code change to V8 creates a distinct version (e.g. `V8.1`) and invalidates the current freeze.
2. **Fail-Closed Principle**: If any statistical or economic null hypothesis cannot be rejected with empirical significance, the result is classified as `REJECT - FALSE POSITIVE / NULL FAILURE`.
3. **Execution Gate Ordering**: No future gate (G1..G10) may be executed prior to formal authorization of the preceding gate.
