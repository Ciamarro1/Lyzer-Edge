# LACW — 10-Stage Agent Lifecycle Specification

## Lifecycle State Machine

```
CREATED ──► INITIALIZED ──► CERTIFIED ──► AVAILABLE ──► EXECUTING ──► LEARNING
                                              ▲                          │
                                              │                          ▼
                                          IMPROVED ◄── EVALUATED ◄───────┘
                                              │
                                              ▼
                                         DEPRECATED ──► ARCHIVED
```
