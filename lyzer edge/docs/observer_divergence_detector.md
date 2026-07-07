# Observer Divergence Detector (ODD)

## 1. Concept and Axiom
The Observer Divergence Detector (ODD) is an epistemic robustness component of the Lyzer Labs ecosystem. It exists to prevent actions based on virtualized or drifting context.

**Epistemic Axiom:** "Antes de resolver um problema, verifique se todos os observadores estão observando a mesma realidade."

## 2. Distributed Architecture
ODD is not a static tool; it is a distributed verification protocol applied at multiple phases of the agent lifecycle:

```text
Phase 0.5
     │
     ▼
ODD Pre-Check
     │
     ▼
Planning
     │
     ▼
Execution
     │
     ▼
Verification
     │
     ▼
ODD Post-Check
```

## 3. ODD Inputs

### Source Reality (The Truth)
- `filesystem` (actual files on disk)
- `git` (committed state)
- `database` (actual data schemas/records)
- `documents` (source of truth files like `GEMINI.md`)

### Observer Reality (The Models/Cache)
- `search` (grep/Select-String results)
- `index` (e.g., code-review-graph or vector DB)
- `agent memory` (context windows, summarized memories)
- `cached context` (artifact virtualization)

## 4. Epistemic Failure Severity (EFS)
When Source Reality ≠ Observer Reality, ODD assigns an Epistemic Failure Severity:

| Level | Severity | Description | Action Required |
|---|---|---|---|
| **EFS-1** | Baixo | Comentário incorreto. | Corrigir o comentário / Continuar. |
| **EFS-2** | Moderado | Busca inconsistente. | Atualizar índice / Re-verificar o arquivo base. |
| **EFS-3** | Alto | Arquitetura baseada em fato não verificado. | BLOQUEIO. Refazer Phase 0.5. |
| **EFS-4** | Crítico | Código produzido sobre realidade incorreta. | BLOQUEIO. Descartar código / Re-observar. |
| **EFS-5** | Existencial | Mudança estrutural baseada em observação falsa. | HARD STOP. Acionar Governância. Reverter estado. |

## 5. Divergence Score and Escalation Threshold
The system evaluates the divergence on a scale from 0.0 to 1.0.

- **0.30 (Warning):** Solicit verification. Do not stop execution immediately, but flag the inconsistency.
- **0.60 (Block):** Halt the current phase. Force a direct inspection (e.g., `view_file` over `grep`) and re-evaluate.
- **0.80 (Hard Stop):** Total context corruption. Terminate planning and request user intervention.

## 6. Known Drift Risks

### Risk 1: Process Inflation
**Symptom:** Running full ODD on simple tasks (e.g., fixing a typo).
**Mitigation:** Enforce strict ODD checks ONLY for `COMPLEX CODE`, `DESIGN/UI`, `ORCHESTRATION`, and `ARCHITECTURE`.

### Risk 2: ODD Becoming Bureaucracy
**Symptom:** ODD governs the system instead of observing it.
**Mitigation:** ODD must *detect*, not *govern everything*. It provides the score; the CTO Persona or orchestrator makes the decision.

### Risk 3: False Positives
**Symptom:** Temporary search index lags cause ODD to trigger.
**Mitigation:** Always `request verification` (via direct filesystem read) before escalating to a Block or Hard Stop.
