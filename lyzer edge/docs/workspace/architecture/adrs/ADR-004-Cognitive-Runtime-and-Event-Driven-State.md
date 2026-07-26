# ADR-004: Cognitive Runtime Kernel & Event-Driven State Architecture

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
To establish the invisible brain of LACW, decoupling state management from UI view rendering.

## Decision Drivers
- Truth belongs exclusively to the `CognitiveRuntimeEngine`.
- Zero polling; state changes stream via `LACWEventBus`.

## Consequences
- **Positive**: Complete UI-to-core decoupling and zero layout jitter.
