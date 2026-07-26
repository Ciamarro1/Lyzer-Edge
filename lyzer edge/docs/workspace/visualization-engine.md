# LACW — Decoupled Visualization Engine Specification

## Overview
The `LACWVisualizationEngine` is a framework-agnostic mathematical contract generator for 20+ visualization types. It does not depend on React or DOM libraries directly; it outputs immutable, serializable visual specs consumed by rendering widgets.

---

## Supported Chart & Graph Specifications
1. **Knowledge Graph Spec**: Nodes, edges, force-directed coordinates, relationship weights.
2. **Decision Tree Spec**: Root decisions, evidence attributions, confidence scores, ECA certificates.
3. **Time-Series Spec**: High-frequency telemetry sparklines, P50–P99.9 latency quantiles.
4. **Agent Graph Spec**: Multi-agent interaction topologies and causal reflection graphs.
5. **Memory Graph Spec**: Vector embedding distances and cosine similarity clusters.
