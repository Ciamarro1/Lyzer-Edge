# Validation Architecture

## Overview
The Validation Infrastructure Layer (VIL) provides a formal **Testing** and **Linting** foundation for Lyzer. It isolates quality concerns from business logic, enabling rapid feedback and safe refactoring.

## Components
- **Vitest** – test runner, unit & integration execution, coverage collection.
- **ESLint** – static code analysis, style enforcement, and error detection.
- **Scripts** – npm scripts (`test`, `test:watch`, `coverage`, `lint`) expose the tools uniformly.

## Responsibilities
| Responsibility | Who Enforces |
|----------------|--------------|
| Execute unit/integration tests | Vitest (`npm run test`)
| Generate coverage reports | Vitest (`npm run coverage`)
| Enforce coding standards | ESLint (`npm run lint`)
| Fail builds on lint/test failures | CI pipeline (future)

## Integration Points
- **Microstructure → Evidence Payload** – unchanged; VIL consumes the payload via the existing adapter.
- **Truth Kernel** – unchanged; VIL does not affect runtime behavior.

## Failure Handling
- Test failures abort the CI step and surface as a **Validation Mirage**.
- Lint violations are reported but do not block CI by default; they can be promoted to failures via configuration.

## Future Extensions
- Add **Playwright** for end‑to‑end scenarios.
- Introduce **type‑checking** (TypeScript) if the codebase evolves.

*All files are located at the project root.*
