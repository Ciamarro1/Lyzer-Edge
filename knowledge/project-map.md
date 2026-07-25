---
titulo: "Lyzer Edge — Mapa do Projeto"
versao: "3.4.0-institutional"
---

# 📁 Lyzer Edge — Mapa do Projeto

## 🌳 Árvore Lógica do Repositório

```text
/ (Root)
├── packages/
│   ├── lyzer-shared/            # Engens quantitativos: kernel, csrl, providers, research
│   └── lyzer-constitution/      # Corte Constitucional ECA, C-CLIST, MOL
├── lyzer edge/                  # Main Application Space
│   ├── backend/                 # Express 5, StreamEngine, LiveDataIngestor, SQLite WAL
│   ├── src/                     # Frontend SPA, Command Center V2, Router, Visualizers
│   ├── src-rust/                # IntentRegistry, RiskGateway, OMS gRPC Binaries
│   ├── src-proto/               # Contratos Protobuf (lyzer.proto)
│   └── tests/                   # Suíte Vitest (Unit, Integration, E2E)
├── src-rust/                    # Root Rust Workspace (lyzer-eca, lyzer-oal, lyzer-ocr, spine)
├── lyzer-workspace/             # Root Rust Workspace (core-models, arbitration, memory, hub)
├── docs/                        # ADRs 005 a 037 e documentação técnica
├── knowledge/                   # Base de Conhecimento Viva e Snapshots
└── benchmark/                   # Resultados empíricos de Monte Carlo e calibração
```

---

## 🔗 Links Relacionados
- 🌐 [Overview](overview.md)
- 📂 [Mapa do Repositório](repository-map.md)
