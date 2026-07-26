# LACW — Institutional Event Bus Architecture

## Capabilities
- Pub/Sub with wildcard subscription (`Cognitive.*`)
- Dual priority queues (`HIGH` / `CRITICAL` vs `NORMAL`)
- Dead Letter Queue (DLQ) for dropped or unhandled events
- Replay Buffer (capped at 2000 events)
- Backpressure limit (10000 events)
