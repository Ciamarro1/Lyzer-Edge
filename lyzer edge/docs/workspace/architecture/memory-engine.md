# LACW — 8-Tier Cognitive Memory Architecture

## Overview
The `CognitiveMemoryEngine` provides 8 distinct memory tiers for different operational scopes:

| Memory Tier | Purpose | Capacity / Lifetime |
|---|---|---|
| **WORKING** | Active task scratchpad | Transient (per task) |
| **SESSION** | Multi-turn user interaction context | Session duration |
| **OPERATIONAL** | Live pipeline & tick execution state | Live tick window |
| **KNOWLEDGE** | Verified market facts & regime rules | High validity window |
| **LONG_TERM** | Persistent historical lessons | Permanent |
| **ARCHIVED** | Cold storage snapshots | Permanent |
| **SEMANTIC** | Vector embeddings | $10^9$ vector capacity |
| **PROCEDURAL** | Tool patterns & execution workflows | Permanent |
