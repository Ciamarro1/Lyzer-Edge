---
titulo: "Lyzer Edge — Módulos do Sistema"
versao: "3.4.0-institutional"
---

# 🧩 Lyzer Edge — Módulos do Sistema

| Módulo | Localização | Função Primária |
| :--- | :--- | :--- |
| **StreamEngine** | `lyzer edge/backend/streamEngine.js` | Processa velas, avalia provedores V1-V4, aciona TruthKernel e Corte |
| **TruthKernel** | `packages/lyzer-shared/src/engine/kernel.js` | Avalia resíduo (DVF), geometria de risco (TRG) e divergência topological (LHDS) |
| **ResidualizationLayer** | `packages/lyzer-shared/src/engine/residualization.js` | Filtra e destrói o consenso streaming (SCD) entre provedores |
| **ConstitutionalCourt** | `packages/lyzer-constitution/src/eca/court.js` | Gate final inviolável com C-CLIST e MOL |
| **C-CLIST** | `packages/lyzer-constitution/src/eca/c-clist.js` | Oráculo de estresse estrutural do mercado |
| **MOL** | `packages/lyzer-constitution/src/eca/mol.js` | Gerenciador de estado de recuperação pós-veto |

---

## 🔗 Links Relacionados
- 🧩 [Componentes](components.md)
- 🔌 [Serviços](services.md)
