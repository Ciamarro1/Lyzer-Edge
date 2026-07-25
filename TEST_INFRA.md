# E2E Test Infra: StreamEngine SMC Transformation

## Test Philosophy
- **Opaque-box, requirement-driven**: Tests validate the StreamEngine and its subcomponents (TruthKernel, ECA Court, Providers) purely by injecting inputs (ticks/candles/configurations) and asserting observed outputs (telemetry payloads, ledger state, execution alerts, court permission tokens).
- **Methodology**: 4-Tier Model:
  - **Tier 1 - Feature Coverage**: Direct verification of the happy path for each of the 11 features (minimum 5 tests per feature).
  - **Tier 2 - Boundary Value Analysis (BVA)**: Probing of execution limits, threshold boundaries, edge cases, and invalid inputs (minimum 5 tests per feature).
  - **Tier 3 - Pairwise Cross-Feature Combinations**: Validating interaction between pairs of components/features (minimum 11 tests).
  - **Tier 4 - Real-World Application Scenarios**: Simulating complex market dynamics and end-to-end trading workloads (minimum 5 tests).

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Multi-Timeframe Ingestion & Alignment (MTF) | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 2 | Provider V1 (SMC/ICT) Signal Generation | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 3 | Provider V2 (Structural Boundary) Signal Generation | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 4 | Provider V3 (Momentum RSI) Signal Generation | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 5 | Streaming Consensus Residualization (consensusLimit) | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 6 | Execution Eligibility Trigger (TRG Threshold) | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 7 | Truth Kernel Veto: Reality Divergence (LHDS) | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 8 | Truth Kernel Veto: Ontological Collapse | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 9 | Constitutional Axiom Check (Confidence Leak Veto) | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 10 | C-CLIST Stress Accumulation & Veto | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |
| 11 | Meta-Observation Layer (MOL) Recovery Lock | ORIGINAL_REQUEST §1, streamEngine.js | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Vitest (in jsdom env, configured via ESM).
- **Invocation**: `npx vitest run lyzer edge/tests/e2e_smc/` (prepending Node path).
- **Test Case Format**: Each test initializes a `StreamEngine` instance (or its mock equivalent), overrides the environment configurations where applicable, feeds synthetic candles or mock telemetry, and asserts the output properties on the emitted `arl` packets or permission requests.
- **Directory Layout**:
  - `lyzer edge/tests/e2e_smc/e2e_suite.test.js` (main test file containing programmatically generated cases for 4 tiers).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Translucent Consensus (Quiet Normal Market) | F1, F2, F3, F4, F6 | Medium |
| 2 | Stability Illusion (Flat Market) | F1, F5, F10 | Medium |
| 3 | Temporal Reality Divergence (HFT desync) | F1, F7 | High |
| 4 | Structural Collapse & MOL Recovery Walk | F1, F7, F11 | High |
| 5 | Daily Capital Safeguard Limit | F1, F6 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature (55 total)
- Tier 2: ≥5 per feature (55 total)
- Tier 3: pairwise coverage of major feature interactions (11 total)
- Tier 4: ≥5 realistic application scenarios (5 total)
- **Total E2E test cases: 126**
