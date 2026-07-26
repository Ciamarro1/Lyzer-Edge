# LACW — Capability-Based Security Architecture

## Overview
LACW enforces zero-trust permission boundaries across all widgets and third-party plugins.

---

## Security Invariants
- **No Trade Execution Signals in UI**: UI components output observational telemetry and explainability data only; zero direct order routing.
- **Capability Verification**: `LACWWidgetRegistry` rejects plugins requesting ungranted system capabilities.
- **Content Security Policy (CSP)**: Strict inline script bans and origin isolation.
