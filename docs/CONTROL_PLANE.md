# LYZER EDGE — OPERATIONS & CONTROL PLANE

## ARCHITECTURAL FLOW

The Lyzer Edge ecosystem separates research, provider issuance, orchestration, execution, and observability into sovereign, independent domains.

```text
                 ┌─────────────────┐
                 │ RESEARCH LAB    │
                 │ CLOSED/FROZEN   │
                 └────────┬────────┘
                          │
                    signed artifact
                          │
                          ▼
                 ┌─────────────────┐
                 │ PROVIDER        │
                 │ IMMUTABLE       │
                 └────────┬────────┘
                          │
                   Execution Contract
                          │
                          ▼
                 ┌─────────────────┐
                 │ NODE / EXPRESS  │
                 │ ORCHESTRATION   │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ RUST            │
                 │ RISK + EXEC     │
                 │ SOVEREIGN       │
                 └────────┬────────┘
                          │
                          ▼
                    ┌───────────┐
                    │ EXCHANGE  │
                    └─────┬─────┘
                          │
                    Exchange Truth
                          │
                          ▼
                 ┌─────────────────┐
                 │ RECONCILIATION  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ OBSERVABILITY   │
                 │ + INCIDENT LOG  │
                 └─────────────────┘
```

## THE FIREWALL

There is a permanent, impenetrable firewall between `RESEARCH` and `PRODUCTION`.
Production metrics (L2, PnL, ERG) **cannot** be used to automatically optimize the Provider.
If the operational envelope (ERG, Slippage) deteriorates (K4 Reality Break), the system halts. It does not adapt. Adaptation is a Research function requiring a new Batch.

## CAPITAL AUTHORIZATION CEREMONY

Capital transitions (e.g., T2 to T3) or recovery from severe halts (K3/K4/K5) require explicit, versioned, out-of-band cryptographic signatures from external Human Governance. 
The system can recommend scaling. It can NEVER authorize it.
