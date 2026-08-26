# LYZER EDGE — SESSION STATE & HANDOFF

> **Branch:** `main` | **Target Space:** Railway (Exp 3.5)
> **System Status:** 🟢 OPERATIONAL

---

## 1. Immediate Objective (Próxima Missão)
- **Current Mission:** Monitorar o Experimento 3.5 no Railway.
- **Goal:** Nenhuma alteração estrutural no núcleo até a conclusão do experimento.

---

## 2. Last Session Handoff (Onde Paramos)
- **Completed:**
  - ✅ Limpeza profunda do repositório (removidos logs pesados e pastas de subagentes mortos).
  - ✅ Implementação do Protocolo Stateless (`/boot` e `/handoff`).
- **Verification Evidence:**
  - `git status` limpo, sem rastros de lixo documental.

---

## 3. Active Configuration & Flags
| Config / Env Var | Current Value | Context / Rationale |
|---|---|---|
| `ARL_MODE` | `SIMULATION` | Validação sem envio de ordens reais |

---

## 4. System Architecture Index (Map of Truth)
- **Regras Operacionais e Agentes:** `AGENTS.md`
- **Constituição e Corte ECA:** `CONSTITUTION.md`
- **Histórico Completo de Mudanças:** `CHANGELOG.md`
- **Arquivo Morto:** `docs/archive/`

---

## 5. Quick Verification Commands
```bash
npm test                 # Execução completa da suíte de testes unitários/integração
npm run test:verify      # Smoke tests rápidos de regressão
npm run backend          # Inicia servidor backend e StreamEngine na porta 7860
```
