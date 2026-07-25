---
name: lyzer-orchestrator
description: Modular Institutional Engineering Operating System for Lyzer Edge. Operates under the 9 Laws of the Engineering Constitution, State Machine Lifecycle, Evidence Graph, Architecture Review Board, and Executive Dashboards.
---

# LYZER ORCHESTRATOR — MODULAR ENGINEERING OPERATING SYSTEM

Esta Skill é a **Porta de Entrada Modular** para o Sistema Operacional de Engenharia do Lyzer Edge.

Ao ser invocada (ex: `/orchestrate` ou `@lyzer-orchestrator`), a IA lê os módulos especializados de governança, máquinas de estado e modelos em `.agents/`:

$$\text{Constituição (9 Leis)} \longrightarrow \text{State Machine} \longrightarrow \text{Evidence Graph} \longrightarrow \text{Dashboard Executivo}$$

---

## 🔑 PROTOCOLOS DE ATIVAÇÃO

Esta Skill é ativada por **gatilhos executivos**, não por prompts longos. A inteligência está nos módulos abaixo — o prompt apenas define a missão e o nível de governança.

### Trigger Padrão (L1–L3)
→ [MissionTrigger.md](.agents/templates/MissionTrigger.md) — Protocolo completo de 10 fases.

### Trigger L4 — Red Button (Missão Crítica)
→ [L4CriticalTrigger.md](.agents/templates/L4CriticalTrigger.md) — Governança máxima para pipeline quantitativo, execução financeira, arquitetura de processos.

---

## ⚡ PROTOCOLO DE EXECUÇÃO OBRIGATÓRIO (10 FASES)

Ao receber uma Missão Executiva, o Orchestrator **DEVE** seguir este ciclo completo. A profundidade de cada fase é determinada pelo Nível de Execução (L0–L4).

| Fase | Nome | Responsabilidade | Skip em L0? | Skip em L1? |
|:---:|---|---|:---:|:---:|
| 0 | **MISSION PLANNING** | Classificar nível, gerar Mission Plan | ✅ Skip | ❌ |
| 1 | **MAPA DO SISTEMA** | Analisar arquitetura, dependências, riscos. Nenhum código alterado. | ✅ Skip | ❌ |
| 2 | **DESCOBERTA DE ESPECIALISTAS** | Selecionar dinamicamente agentes necessários, gerar contratos | ✅ Skip | ✅ Skip |
| 3 | **EXECUÇÃO PARALELA** | Cada especialista produz artefatos com evidências | ✅ Skip | ✅ Skip |
| 4 | **CROSS REVIEW** | Implementador ≠ Revisor. Revisão independente obrigatória. | ✅ Skip | ✅ Skip |
| 5 | **ARCHITECTURE REVIEW BOARD** | Aprovação unânime para mudanças estruturais | ✅ Skip | ✅ Skip |
| 6 | **IMPLEMENTAÇÃO** | Solução mínima correta. Remover > Adicionar. SSOT. | ✅ Skip | ❌ |
| 7 | **VALIDAÇÃO** | npm test, vitest, build, benchmark. Sem evidência = HYPOTHESIS. | ✅ Skip | ❌ |
| 8 | **KNOWLEDGE SYNC** | Atualizar docs necessários. Eliminar duplicação. | ✅ Skip | ❌ |
| 9 | **RELEASE GOVERNANCE** | Testes verdes, git limpo, rollback possível, riscos documentados. | ✅ Skip | ✅ Skip |

### Especialistas Disponíveis (Seleção Dinâmica na Fase 2)

O Orchestrator **NÃO** convoca todos. Seleciona apenas os necessários para a missão:

- Principal Software Architect
- Backend Engineer
- Frontend Engineer
- Quant Guardian
- Quant Researcher
- Performance Engineer
- Security Red Team
- Code Archaeologist
- Dependency Analyst
- Test Engineer
- Benchmark Engineer
- Knowledge Guardian
- Documentation Engineer
- Release Engineer

---

## 📚 ESTRUTURA MODULAR DO FRAMEWORK DE GOVERNANÇA

### 📜 1. Constituição & Políticas (`.agents/constitution/`)
- 🏛️ [ENGINEERING_CONSTITUTION.md](.agents/constitution/ENGINEERING_CONSTITUTION.md) — As **9 Leis Fundamentais de Engenharia** (incluindo a *Lei IX da Proporcionalidade*).
- 📊 [EVIDENCE_POLICY.md](.agents/constitution/EVIDENCE_POLICY.md) — Escala de Confiança de Evidências ($0\text{--}100$) e Hierarquia do **Decision Engine** ($1\text{--}8$).
- 🛡️ [REVIEW_POLICY.md](.agents/constitution/REVIEW_POLICY.md) — Regra de Revisão Cruzada e Consenso Unânime do **Architecture Review Board (ARB)**.
- 📉 [COMPLEXITY_POLICY.md](.agents/constitution/COMPLEXITY_POLICY.md) — Regras de Dívida Técnica e Budget de Complexidade de Arquivos.
- 🚀 [RELEASE_POLICY.md](.agents/constitution/RELEASE_POLICY.md) — Checklist de Liberação e Push Sincronizado para GitHub & Hugging Face.

### 🎛️ 2. Motor de Orquestração (`.agents/orchestrator/`)
- 🔄 [ORCHESTRATOR.md](.agents/orchestrator/ORCHESTRATOR.md) — **State Machine Lifecycle** (11 Estados) e Rastreabilidade por **Decision Graph**.
- 🎚️ [EXECUTION_LEVELS.md](.agents/orchestrator/EXECUTION_LEVELS.md) — Profundidade Adaptativa de Execução (**L0 a L4**).
- 🎒 [CONTEXT_ROUTER.md](.agents/orchestrator/CONTEXT_ROUTER.md) — Otimizador de Contexto Estrito por Especialista.
- 💵 [RESOURCE_MANAGER.md](.agents/orchestrator/RESOURCE_MANAGER.md) — Motor de Alocação e Budget de Recursos.
- 🕸️ [EVIDENCE_GRAPH.md](.agents/orchestrator/EVIDENCE_GRAPH.md) — Grafo de Rastreabilidade Causal em 7 Nós.
- 📊 [SYNTHESIS_PROTOCOL.md](.agents/orchestrator/SYNTHESIS_PROTOCOL.md) — Protocolo de Síntese Hierárquica e os **10 KPIs de Engenharia**.

### 📄 3. Templates Oficiais (`.agents/templates/`)

**Gatilhos de Ativação:**
- 🚀 [MissionTrigger.md](.agents/templates/MissionTrigger.md) — Prompt de ativação padrão (L1–L3).
- 🔴 [L4CriticalTrigger.md](.agents/templates/L4CriticalTrigger.md) — Prompt de ativação crítica (L4 Red Button).

**Artefatos de Engenharia:**
- 🗺️ [MissionPlan.md](.agents/templates/MissionPlan.md) — Plano de Missão Pré-Flight (Fase 0).
- 📑 [Contract.md](.agents/templates/Contract.md) — Contrato de Execução entre Especialistas.
- 📝 [ADR.md](.agents/templates/ADR.md) — Modelo de Architectural Decision Record.
- 📈 [ExecutiveDashboard.md](.agents/templates/ExecutiveDashboard.md) — Resumo Executivo CTO de 1 página.
- 📊 [Benchmark.md](.agents/templates/Benchmark.md) — Relatório de Benchmark Executável.
- 🔄 [Retrospective.md](.agents/templates/Retrospective.md) — Retrospectiva de Aprendizado Contínuo.

---

## ⚙️ HIERARQUIA DO DECISION ENGINE (CONFLICT RESOLUTION)

Quando houver divergência entre especialistas, o conflito é resolvido estritamente pela hierarquia:
1. **Benchmark Executável** (`benchmark/results.json`)
2. **Teste Automatizado** (`npm test`, `vitest`)
3. **Replay Determinístico** (`RuntimeParityReplay`)
4. **ADR Existente** (`docs/adr/ADR-0XX.md`)
5. **Código Executável** (`src/`, `backend/`, `packages/`)
6. **Documentação Oficial** (`knowledge/`, `README.md`)
7. **Inferência Técnica**
8. **Opinião Pessoal** (Desqualificada)

---

## 🛡️ GUARDIANIA DO PIPELINE QUANTITATIVO

O subagente **Quant Guardian** deve certificar a preservação absoluta do fluxo de 7 camadas:

$$\text{1. Ingestão} \xrightarrow{\text{Queues MTF}} \text{2. SMC Engine} \xrightarrow{\text{M15 BOS}} \text{3. Trigger Layer} \xrightarrow{\text{TRG } \ge 0,40} \text{4. TruthKernel} \xrightarrow{\text{LHDS } < 0,80} \text{5. ECA Court} \xrightarrow{\text{Stress Oracle}} \text{6. Execution} \xrightarrow{\text{UUIDv7}} \text{7. Replay}$$

---

## 📏 REGRA SUPREMA

```
Evidência > Opinião
Código > Documentação
Testes > Argumentos
Simplicidade > Complexidade
Remover > Adicionar
Reprodutibilidade acima de tudo
Single Source of Truth
```
