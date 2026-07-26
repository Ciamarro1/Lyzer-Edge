# LACW — Distributed State Engine Architecture

## Overview
The `CognitiveStateEngine` manages state records across the distributed runtime, enforcing versioning, audit trails, TTLs, and rollback policies.

---

## State Record Contract
Every state record contains:
- `owner`: Agent or engine owner ID
- `source`: Processing module source
- `timestamp`: Creation/mutation timestamp
- `confidence`: Bayesian confidence score $[0.0, 1.0]$
- `ttlMs`: Time-to-live in milliseconds
- `evidenceRef`: Underlying evidence artifact ID
- `priority`: Priority classification
- `version`: Transparently incremented version counter
