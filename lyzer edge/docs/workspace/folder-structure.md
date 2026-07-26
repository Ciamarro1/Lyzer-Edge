# LACW — Monorepo & Directory Structure Specification

```
lyzer edge/
├── docs/workspace/                     # Institutional LACW Documentation Suite
│   ├── adr/                            # Architectural Decision Records
│   ├── rfc/                            # Request for Comments
│   ├── diagrams/                       # Visual Architecture & Sequence Diagrams
│   ├── wireframes/                     # UI Wireframe Specifications
│   └── figma-spec/                     # Design Tokens & UI Specs
├── src/components/commandCenter/
│   ├── sdk/
│   │   ├── evidence/                   # 9 Evidence Subdirectories (telemetry, rigor, etc.)
│   │   └── lacw/                       # Core LACW SDK Engines
│   │       ├── LACWEventBus.js
│   │       ├── LACWLayoutEngine.js
│   │       ├── LACWWidgetRegistry.js
│   │       ├── LACWCommandPalette.js
│   │       ├── LACWVisualizationEngine.js
│   │       └── LACWExplainabilityEngine.js
│   └── widgets/                        # 15 Certified Widget Plugins
│       └── lacwWorkspace/              # Master LACW Workspace Widget
├── scripts/
│   └── architectureCertification.js   # Automated Compliance Gate Runner
└── tests/unit/commandCenter/sdk/
    └── lacwSuite.test.js               # Vitest Execution Suite
```
