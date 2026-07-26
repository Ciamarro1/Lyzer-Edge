# ADR-005: 8-Tier Cognitive Memory Architecture

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
Different operational tasks require distinct memory lifetimes and access semantics.

## Decision Drivers
- Support 8 distinct tiers: WORKING, SESSION, OPERATIONAL, KNOWLEDGE, LONG_TERM, ARCHIVED, SEMANTIC ($10^9$ vector capacity), PROCEDURAL.

## Consequences
- **Positive**: Clear scoping and zero memory pollution across operational boundaries.
