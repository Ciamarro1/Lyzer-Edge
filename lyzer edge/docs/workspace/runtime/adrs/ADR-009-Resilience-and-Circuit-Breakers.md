# ADR-009: Resilience & Circuit Breaker Architecture

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
Preventing cascading failures when upstream providers or sub-engines degrade.

## Decision Drivers
- Implementation of `FailureManagerEngine` with exponential backoff, fallbacks, and 3-state circuit breakers (`CLOSED`, `OPEN`, `HALF_OPEN`).

## Consequences
- **Positive**: Antifragile failure containment.
