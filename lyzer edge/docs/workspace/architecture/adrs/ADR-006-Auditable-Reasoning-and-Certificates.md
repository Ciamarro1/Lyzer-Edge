# ADR-006: Auditable Reasoning & Cryptographic Certificates Architecture

## Status
**APPROVED / RATIFIED**

## Context & Problem Statement
Preventing uninspectable "magic" AI decisions and ensuring legal/regulatory compliance.

## Decision Drivers
- Mandatory step-by-step reasoning chain logging in `ReasoningEngine`.
- SHA-256 cryptographic certificate signing via `CertificationEngine`.

## Consequences
- **Positive**: Complete systemic transparency and auditability.
