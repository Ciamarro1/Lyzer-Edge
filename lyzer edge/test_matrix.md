# Test Matrix

| Lyzer Module | Test Type | Required Fixtures |
|--------------|-----------|-------------------|
| `src/microstructure/microstructure.js` | Integration | `payloadSnapshots/*.json` (empty_window, bull_regime, bear_regime, degrading_edge) |
| `src/kernelAdapters/evidenceToConfidence.js` | Unit | Mock `EvidencePayload` objects with varying `sample_size`, `expectancy`, `performance_decay`, `structural_decay` |
| `src/microstructure/evidenceHistory.js` | Unit | Simple window arrays (`[]`, `[record]`) |
| `src/microstructure/mee.js` | Unit | Mock metric inputs |
| `src/microstructure/mdd.js` | Unit | Mock decay inputs |
| `src/engine/kernel.js` (Truth Kernel) | Integration | Realistic confidence objects from adapter |
| `src/kernelAdapters/*` (any future adapters) | Unit | Adapter‑specific payload fixtures |

**Guidelines**
- Each test file must be named `{module}.test.js` and placed beside the source file.
- Fixtures are stored in `payloadSnapshots/` and imported in tests.
- Aim for >80 % coverage on critical modules (microstructure, adapters).
- Use Vitest's `describe`/`it` blocks and the AAA pattern.
