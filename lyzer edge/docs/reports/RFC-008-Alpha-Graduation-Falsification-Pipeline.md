# RFC-008: Alpha Graduation & Falsification Pipeline Specification

## Author & Authority
Principal Software Architect, Security Auditor & Lyzer Guardian

## Scope
Specification of the 8-Stage Alpha Graduation Pipeline, 24/7 Research Scheduler, and Hypothesis Falsification Machine.

## 1. 8-Stage Graduation State Machine
```
Discovery (Stage 1)
       ↓
Stat Verification (Stage 2: t-stat >= 2.0, HAC SE)
       ↓
OOS Validation (Stage 3: Purged OOS window)
       ↓
Walk-Forward (Stage 4: Multi-fold embargoed splits)
       ↓
Shadow Mode (Stage 5: Live tick telemetry matching)
       ↓
Paper Trading (Stage 6: Simulated order execution)
       ↓
Micro Capital (Stage 7: Minimum live capital allocation)
       ↓
Scale (Stage 8: Full quantitative allocation)
```

## 2. Hypothesis Falsification Machine
Machine designed to aggressively measure and **discard weak hypotheses** failing significance, fee erosion ($> 80\%$), or negative Net Alpha.
