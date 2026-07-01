# First Interpretation Event Log (FIEL)

**Purpose:** Captures the first irreversible interpretation event. Fires once. After firing, the system enters the post-CSB regime.

## Mechanism
FIEL operates by comparing every operation applied to the EML against the Catalog of Admissible EML Operations (CAO). 
**If operation ∉ CAO → FIE detected → FIEL fires.**

## Distinction from IIR
*   **FIEL is ONE-SHOT:** It fires exactly once, then is closed forever. It detects a regime transition.
*   **IIR is CONTINUOUS:** It is a passive registry that logs interpretation attempts indefinitely.

## Schema

1.  `timestamp`: When the event occurred.
2.  `actor`: Who performed the action (human / agent / process).
3.  `operation_attempted`: What specific operation was applied.
4.  `observations_scope`: Which EML IDs were involved.
5.  `cao_violation_type`: Category of the prohibited operation (e.g., AGGREGATE, CORRELATE).
6.  `solicited`: Was the action requested or spontaneous?
7.  `event_type`: `SYNTHETIC` | `EMPIRICAL` (A synthetic test event must never be recorded as an empirical discovery).

## Properties

*   **ONE-SHOT:** Triggers only on the very first FIE.
*   **OPERATIONAL:** Detects *actions*, not *meanings*.
*   **ANTI-GAMING:** The formulation of the request is irrelevant; only the operation against the EML matters.
*   **IRREVERSIBLE:** The recorded event constitutes a regime transition.

## Post-FIEL Protocol

Once FIEL fires, the following sequence is executed:
1.  **CRS Pauses:** Continuous streaming is halted.
2.  **Vector Classification:** The actor is classified (human / agent / structural).
3.  **Measurement:** Δt = t_csb - t₀ is recorded.
4.  **Constitutional Decision:** Should the IIR be promoted to a circuit breaker (Mode B)?

---
*Note on Residual Risk: The Silent Interpretation Layer (interpretation occurring outside the EML) is architecturally accepted. The system governs only its operational space.*
