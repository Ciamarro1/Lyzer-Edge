# LACW — Cognitive Knowledge Graph Architecture

## Overview
The Cognitive Knowledge Graph visualizes all interconnected concepts across the Lyzer Edge ecosystem: agents, memories, decisions, evidence providers, feature discoveries, and legal boundary certificates.

---

## Node & Edge Taxonomy
- **Nodes**: `Agent`, `MemoryVector`, `DecisionRecord`, `EvidenceEngine`, `ECAConstraint`, `ConceptDriftEvent`
- **Edges**: `PUBLISHES_EVIDENCE`, `EVALUATES_HYPOTHESIS`, `VETOES_EXECUTION`, `MATCHES_MEMORY`, `ATTRIBUTES_WEIGHT`

---

## Interactive Capabilities
- **Node Focus**: Double-clicking any node centers the canvas and highlights incoming/outgoing causal edges.
- **Explainability Drill-Down**: Single-clicking any node opens the LACW Explainability Engine modal.
