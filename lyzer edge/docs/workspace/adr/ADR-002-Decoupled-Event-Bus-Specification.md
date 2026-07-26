# ADR-002: Decoupled Event Bus Architecture

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
Direct widget-to-widget communication creates tight coupling, memory leaks, and cascading UI failure modes.

## Decision Drivers
- Mandatory use of `LACWEventBus` for all cross-component messaging.
- Topic-filtered wildcard subscriptions (`agent:*`, `layout:*`).
- Priority queues (`HIGH`, `NORMAL`, `LOW`) with backpressure control.

## Consequences
- **Positive**: Complete component decoupling. Widgets can be hot-swapped without impacting peer components.
