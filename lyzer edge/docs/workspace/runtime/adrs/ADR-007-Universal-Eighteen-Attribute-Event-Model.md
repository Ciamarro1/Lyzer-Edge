# ADR-007: Universal 18-Attribute Event Model

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
To ensure strict event-driven consistency and complete causal lineage across all subsystems.

## Decision Drivers
- Mandatory presence of 18 universal attributes (`id`, `type`, `version`, `timestamp`, `source`, `actor`, `context`, `payload`, `metadata`, `correlation_id`, `causation_id`, `confidence`, `importance`, `visibility`, `permissions`, `trace_id`, `parent_event`, `isoTime`).

## Consequences
- **Positive**: Complete causal traceability and auditability across all events.
