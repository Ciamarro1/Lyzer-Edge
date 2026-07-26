# LACW — Core Engineering & Architectural Principles

## Fundamental Axiom
> **No interface element exists purely for aesthetic decoration. Every UI element, animation, graph, and layout shift must serve a explicit cognitive function.**

---

## The 10 Principles of Cognitive Interface Engineering

### 1. Function Over Ornamentation
Every widget, chart, and visual indicator must directly answer a concrete operational question:
- *Am I healthy?*
- *Am I learning?*
- *Am I profitable?*
- *Where is systemic risk emerging?*
- *Which agent requires human intervention?*

### 2. Mandatory Contract Anatomy
Every component in the LACW ecosystem must possess:
1. **Objective**: Explicit operational purpose
2. **Input Contract**: Strictly typed props/data schema
3. **Output Contract**: Event emission specification
4. **State Machine**: Deterministic internal state transitions
5. **Telemetrics**: Latency, render time, and heap impact tracking
6. **Explainability Metadata**: Causal attribution link
7. **Permission Scope**: Granted capabilities
8. **Disposal Lifecycle**: Native TC39 `[Symbol.dispose]()` compliance

### 3. Decoupled Event-Driven Communication
Direct widget-to-widget references are strictly prohibited. All cross-component communication occurs via topic-filtered, priority-queued messages published to `LACWEventBus`.

### 4. Zero Dead Code Assurance
No component may remain in production without active dynamic import coverage. `DynamicGraphAuditor` continuously validates 100% path coverage.

### 5. Instant Keyboard-First Accessibility
Every action, preset, search, query, or inspection must be triggerable within $\le 3$ keystrokes via the Ctrl+K Command Palette.

### 6. Sub-Microsecond Performance SLA
Workspace rendering and event dispatching must maintain $60\,\text{FPS}$ framerates, with UI event queue dispatch latencies $< 50\,\mu\text{s}$.

### 7. Universal Causal Lineage
Clicking on any metric, percentage, or status badge opens the Explainability Modal, presenting the complete causal lineage, evidence weight, memory vector matches, and Constitutional Court certificate.

### 8. Capability-Based Zero-Trust Security
Widgets run inside capability sandboxes. No widget may access telemetry, layout state, or commands unless explicitly declared in its manifest capabilities.

### 9. Antifragile Isolation
A crash, unhandled exception, or memory spike inside a single widget must be contained within its isolated boundary without destabilizing the workspace container.

### 10. Continuous Self-Observation
The workspace measures itself. Telemetry engines continuously stream heap usage, frame rates, span latencies, and path coverage back into the Observability Presets.
