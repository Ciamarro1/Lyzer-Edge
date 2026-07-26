# LACW — Cognitive State Machine Specification

## State Transition Matrix
```
[UNINITIALIZED] --(registerAgent)--> [IDLE] --(executeWorkflow)--> [RUNNING]
                                                                        |
                                       [COMPLETED] <--(finishStep)-------+
```
