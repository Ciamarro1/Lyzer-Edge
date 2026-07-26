# ADR-003: Plugin SDK & Widget Contract Standard

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
To ensure third-party extensibility without compromising stability or security.

## Decision Drivers
- Strict `IWidgetPlugin` contract enforcement.
- Capability declarations verified by `LACWWidgetRegistry`.
- TC39 `Symbol.dispose` compliance.

## Consequences
- **Positive**: Hard security sandboxing, zero memory leaks, and certified Platinum plugin quality.
