# Test Strategy

## Testing Pyramid
- **Unit Tests** – isolated functions, pure logic, fast (< 100 ms). Target coverage ≥ 80 % for critical modules.
- **Integration Tests** – combine microstructure, evidence adapter, and kernel interactions. Run with `npm run test`.
- **End‑to‑End (E2E) Tests** – future work (Playwright) to verify user‑facing flows.

## Scope per Layer
| Layer | Modules Covered | Example Tests |
|-------|----------------|---------------|
| Unit | `src/microstructure/*`, `src/kernelAdapters/*` | Pure function returns, edge‑case handling |
| Integration | `src/microstructure/microstructure.js`, `src/kernelAdapters/evidenceToConfidence.js` | Verify payload flows through adapter and produces expected confidence object |
| E2E (future) | Full application (frontend + backend) | Simulate user actions, verify end results |

## CI Considerations
- Run `npm run lint` and `npm run test` on each push.
- Treat any test failure as a block for promotion.
- Generate coverage report (`npm run coverage`) and enforce thresholds via Vitest config.

## Maintenance
- Add new test files alongside each module (`*.test.js`).
- Keep test names descriptive and follow the AAA pattern.
- Review coverage quarterly and add missing cases.
