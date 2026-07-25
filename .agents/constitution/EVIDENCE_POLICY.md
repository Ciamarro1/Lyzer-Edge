# EVIDENCE POLICY & DECISION HIERARCHY

- **Domain**: Evidence Classification & Decision Engine Priority
- **Scope**: Decision resolution and metric publication.

---

## 1. EVIDENCE CONFIDENCE SCALE (0–100)

| Score Range | Classification | Required Evidence Artifact |
|:---:|---|---|
| **95–100** | **`VERIFIED`** | Reproducible benchmark output file on disk (`benchmark/results.json`). |
| **80–94** | **`HIGH CONFIDENCE`** | Validated unit or integration test suite execution (`npm test`, `vitest`). |
| **60–79** | **`MODERATE`** | Audited static code analysis or module dependency graph. |
| **30–59** | **`LOW`** | Inferred from code comments or documentation text. |
| **0–29** | **`HYPOTHESIS`** | Unvalidated quantitative assumption or conjecture. |

---

## 2. DECISION ENGINE PRIORITY (CONFLICT RESOLUTION)

When specialists diverge or conflict on an architectural or code decision, the disagreement is resolved strictly according to the **Decision Hierarchy**:

1. **Executable Benchmark** (`benchmark/results.json`)
2. **Automated Test Suite** (`npm test`, `vitest`)
3. **Deterministic Replay** (`RuntimeParityReplay`)
4. **Existing ADR** (`docs/adr/ADR-0XX.md`)
5. **Executable Code** (`src/`, `backend/`, `packages/`)
6. **Official Documentation** (`knowledge/`, `README.md`)
7. **Technical Inference** (Reasoned logical deduction)
8. **Personal Opinion** (Disqualified as authority)

*Never resolve conflicts by majority vote or personal authority. Always resolve by highest evidence tier.*
