# OPENMOBIUS ADVERSARIAL PARITY REPORT (Phase 3.5)

Generated: 2026-08-22T06:45:39.098Z

> Testing boundary conditions, edge cases, and causal integrity.

---

## fvg_threshold (39 candles)

| Component | Expected | Actual | Match |
|-----------|----------|--------|-------|
| Swings | 52 | 52 | **100.00%** |
| FVGs | 0 | 0 | **100.00%** |
| Order Blocks | 0 | 0 | **100.00%** |
| Sweeps | 13 | 13 | **100.00%** |
| Displacements | 0 | 0 | **100.00%** |
| Volume Anomalies | 0 | 0 | **100.00%** |
| Structure Seq | 52 | 52 | **100.00%** |
| Structure Events | 1 | 1 | **100.00%** |

> ✅ **Zero divergences.**

---

## displacement_threshold (33 candles)

| Component | Expected | Actual | Match |
|-----------|----------|--------|-------|
| Swings | 48 | 48 | **100.00%** |
| FVGs | 3 | 3 | **100.00%** |
| Order Blocks | 1 | 1 | **100.00%** |
| Sweeps | 0 | 0 | **100.00%** |
| Displacements | 0 | 0 | **100.00%** |
| Volume Anomalies | 0 | 0 | **100.00%** |
| Structure Seq | 48 | 48 | **100.00%** |
| Structure Events | 1 | 1 | **100.00%** |

> ✅ **Zero divergences.**

---

## sweep_boundary (39 candles)

| Component | Expected | Actual | Match |
|-----------|----------|--------|-------|
| Swings | 52 | 52 | **100.00%** |
| FVGs | 2 | 2 | **100.00%** |
| Order Blocks | 0 | 0 | **100.00%** |
| Sweeps | 14 | 14 | **100.00%** |
| Displacements | 0 | 0 | **100.00%** |
| Volume Anomalies | 0 | 0 | **100.00%** |
| Structure Seq | 52 | 52 | **100.00%** |
| Structure Events | 1 | 1 | **100.00%** |

> ✅ **Zero divergences.**

---

## swing_boundary (30 candles)

| Component | Expected | Actual | Match |
|-----------|----------|--------|-------|
| Swings | 26 | 26 | **100.00%** |
| FVGs | 4 | 4 | **100.00%** |
| Order Blocks | 2 | 2 | **100.00%** |
| Sweeps | 3 | 3 | **100.00%** |
| Displacements | 3 | 3 | **100.00%** |
| Volume Anomalies | 0 | 0 | **100.00%** |
| Structure Seq | 26 | 26 | **100.00%** |
| Structure Events | 1 | 1 | **100.00%** |

> ✅ **Zero divergences.**

---

## order_block_boundary (38 candles)

| Component | Expected | Actual | Match |
|-----------|----------|--------|-------|
| Swings | 49 | 49 | **100.00%** |
| FVGs | 4 | 4 | **100.00%** |
| Order Blocks | 1 | 1 | **100.00%** |
| Sweeps | 2 | 2 | **100.00%** |
| Displacements | 0 | 0 | **100.00%** |
| Volume Anomalies | 0 | 0 | **100.00%** |
| Structure Seq | 49 | 49 | **100.00%** |
| Structure Events | 1 | 1 | **100.00%** |

> ✅ **Zero divergences.**

---

## edge_cases (35 candles)

| Component | Expected | Actual | Match |
|-----------|----------|--------|-------|
| Swings | 54 | 54 | **100.00%** |
| FVGs | 0 | 0 | **100.00%** |
| Order Blocks | 0 | 0 | **100.00%** |
| Sweeps | 7 | 7 | **100.00%** |
| Displacements | 0 | 0 | **100.00%** |
| Volume Anomalies | 10 | 10 | **100.00%** |
| Structure Seq | 54 | 54 | **100.00%** |
| Structure Events | 1 | 1 | **100.00%** |

> ✅ **Zero divergences.**

---

## 🔬 CAUSALITY TEST

Testing that events confirmed in candles 0→100 remain identical when candles 101→200 are added.

| Check | Short (0→100) | Full (0→200, filtered) | Match |
|-------|---------------|------------------------|-------|
| Swings (idx ≤ 97) | 192 | 192 | ✅ |
| FVGs (idx ≤ 97) | 0 | 0 | ✅ |

> ✅ **Causality preserved.** Adding future candles does not alter confirmed past events.

> **Note:** Swings use `right=2`, so pivots at indices `98` and above cannot be confirmed without future data. This is expected behavior, NOT a look-ahead violation.

---

