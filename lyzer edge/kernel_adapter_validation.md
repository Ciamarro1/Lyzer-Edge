# Kernel Adapter Validation Report

## Overview
This report evaluates the compatibility of the newly created **adapter** `src/kernelAdapters/evidenceToConfidence.js` with the existing **TruthKernel** contract defined in `src/engine/kernel.js`.

## TruthKernel Expected Output
`TruthKernel.evaluate` constructs a **kernel result** object with the following shape (excerpt from `src/engine/kernel.js`):
```json
{
  "signal": "<finalSignal>",
  "confidence": <roundedConfidence>,
  "reason_codes": ["…"],
  "raw_metrics": {
    "system_equilibrium": <number>,
    "alignments": {},
    "context_confidences": {
      "regime": <number>,
      "timeframe": <number>,
      "correlation": <number>,
      "behavior": <number>
    }
  }
}
```
Key required fields:
* `signal`
* `confidence` (numeric, 0‑1 after rounding)
* `reason_codes` (array of strings)
* `raw_metrics` (object with nested structure)

## Adapter Output
`evidenceToConfidence` returns a **pure confidence object**:
```js
{
  confidence: number, // 0‑1, clamped
  confidence_components: {
    hit_rate: number,
    persistence: number,
    survival: number,
    decay_penalty: number
  }
}
```
The adapter **does not** provide:
* `signal`
* `reason_codes`
* `raw_metrics`
* any of the contextual confidence fields required by `TruthKernel`.

## Compatibility Assessment
| Requirement | Adapter Provides | Verdict |
|-------------|------------------|--------|
| `signal` | ❌ – Not generated | **Incompatible** |
| `confidence` | ✅ – Numeric 0‑1 | ✅ |
| `reason_codes` | ❌ – Missing | **Incompatible** |
| `raw_metrics` (including `context_confidences`) | ❌ – Missing | **Incompatible** |
| Overall shape matches TruthKernel payload | ❌ – Different schema | **Incompatible** |

### Conclusion
The adapter **is not 100 % compatible** with the current TruthKernel contract. It supplies a confidence value and its component breakdown, but the kernel expects a richer object that includes a trading signal, reason codes, and contextual metrics.

## Recommended Integration Strategies
1. **Wrapper Layer** – Create a thin wrapper inside `src/engine/kernel.js` that calls `evidenceToConfidence` and then enriches the result with the missing fields (e.g., default `signal` = "neutral", empty `reason_codes`, and a stub `raw_metrics`). This keeps the adapter pure while satisfying the kernel contract.
2. **Kernel Refactor** – Update `TruthKernel.evaluate` to accept the new confidence object directly and derive the missing fields from existing context (if available). This would align the kernel with the emerging **Evidence Standardization Layer**.
3. **Hybrid Approach** – Modify the adapter to also return the required fields (populate `signal` based on a simple rule, forward any existing `reason_codes` from the incoming payload, and map `performance_decay`/`structural_decay` into `context_confidences`). This would make the adapter a drop‑in replacement.

Until one of these strategies is applied, the pipeline will raise a contract mismatch error when the kernel attempts to consume the adapter output.

---
*Prepared by the orchestrator using the `backend‑specialist` perspective.*
