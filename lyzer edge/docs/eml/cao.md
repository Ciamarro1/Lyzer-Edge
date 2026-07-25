# Catalog of Admissible EML Operations (CAO)

**Status:** ACTIVE, CLOSED, IMMUTABLE
**Constitutional Basis:** No operation may be added without a constitutional amendment.

## Admissible Operations

| Operation | Signature | Scope |
| :--- | :--- | :--- |
| `APPEND` | `write(observation) → EML` | 1 observation |
| `READ_HEALTH` | `read(metrics) → {storage, latency, count}` | Infrastructure only |
| `COUNT` | `read(n) → integer` | Pure numeric aggregation |
| `LIST_IDS` | `read(ids) → [id₁, id₂, ...]` | Identifiers without content |
| `READ_SINGLE` | `read(id) → observation` | 1 observation, audit only |
| `TAG_METADATA` | `write(id, class) → metadata` | 1 observation, EDC label A-G |

## Properties

*   **CLOSED:** No additions permitted.
*   **IMMUTABLE:** No redefinitions of existing operations.
*   **MECHANICAL:** Verifiable computational signatures.
*   **ATOMIC:** Operations act on 1 observation (except COUNT and LIST_IDS).

### The Atomicity Rule
**Any operation acting on ≥2 observations simultaneously that produces a non-listing result is OUTSIDE the CAO.**

## Prohibited Operations (Examples)

The following operations violate the CAO and constitute interpretation:

| Prohibited Operation | Reason it is Interpretive |
| :--- | :--- |
| `AGGREGATE` | Compression across multiple observations. |
| `CORRELATE` | Seeks patterns between observations. |
| `CLUSTER` | Groups observations by similarity. |
| `COMPRESS` | N → 1 reduction. |
| `COMPARE` | Evaluates resemblance between ≥2 observations. |
| `EXPLAIN` | Attributes causality. |
| `RANK` | Orders by relevance (requires a criteria). |
| `FILTER_BY_CONTENT`| Selects by meaning, not by ID or metadata. |

---
*Note: CAO serves as the comparison baseline for the FIEL sensor.*
