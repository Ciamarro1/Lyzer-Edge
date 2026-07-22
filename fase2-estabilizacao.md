# Plano de Ação — Fase 2 (Estabilização) do Lyzer Edge

**Slug**: `fase2-estabilizacao.md`  
**Data**: 2026-07-22  
**Status**: PLANEJAMENTO CONCLUÍDO (Modo Somente Planejamento)  
**Autor**: Arquiteto Cognitivo & Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🎯 Objetivo da Fase 2

A **Fase 2 (Estabilização)** visa eliminar a duplicação computacional de motores de sinal, padronizar a suíte de testes de verificação e garantir resiliência aos canais de observabilidade e alerta do ecossistema Lyzer Edge.

---

## 📋 Decomposição das Tarefas (Task Breakdown)

### Task 2.1: Consolidação do Pipeline SMC (Eliminação da Duplicidade de Engines)
- **Escopo**:
  - Unificar a geração de narrativa de sinal no `StreamEngine.js` para utilizar primariamente o `TimeframeManager` + `StructureEngine` + `LiquidityEngine` do pacote `@lyzer/shared/src/smc/`.
  - Manter compatibilidade com os adaptadores legados V1/V2/V3 através de uma interface unificada (`SmcProviderAdapter`).
- **Arquivos Envolvidos**:
  - [lyzer edge/backend/streamEngine.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/streamEngine.js)
  - [packages/lyzer-shared/src/smc/](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/packages/lyzer-shared/src/smc/)
- **Impacto**: Redução de ~30% no tempo de processamento por candle tick e eliminação de inconsistências entre a UI e o TruthKernel.

### Task 2.2: Organização e Padronização dos Scripts de Verificação (`verify_*.js`)
- **Escopo**:
  - Relocar os 12 scripts `verify_*.js` soltos na raiz de `lyzer edge/` para a subpasta dedicada `lyzer edge/tests/verification/`.
  - Criar runner unificado `npm run test:verify` no `package.json` para acionar todas as verificações ad-hoc sob o Vitest.
- **Arquivos Envolvidos**:
  - `lyzer edge/verify_*.js` $\rightarrow$ `lyzer edge/tests/verification/`
  - [lyzer edge/package.json](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/package.json)

### Task 2.3: Resiliência de Alertas e Telemetria do Telegram
- **Escopo**:
  - Adicionar fila simples com retentativas (retry queue com exponential backoff) em [telegram.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/telegram.js).
  - Impedir perda de alertas de auditoria em momentos de oscilação da API do Telegram.
- **Arquivos Envolvidos**:
  - [lyzer edge/backend/telegram.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/telegram.js)

---

## 🤖 Atribuição de Agentes

| Tarefa | Agente Responsável | Habilidades Exigidas |
|---|---|---|
| **Task 2.1 (SMC Pipeline)** | `@[lyzer-guardian]` + `backend-specialist` | Architecture, Clean Code, SMC Multi-timeframe |
| **Task 2.2 (Test Re-org)** | `@[lyzer-guardian]` + `testing-patterns` | Vitest, Test Structure, File Organization |
| **Task 2.3 (Telegram Retry)**| `@[lyzer-guardian]` + `backend-specialist` | Async Retry Patterns, Resilience, Observability |

---

## 🧪 Checklist de Verificação (Phase X)

- [ ] Todos os 148 testes existentes da suíte Vitest continuam passando 100%.
- [ ] O `StreamEngine` consome os motores SMC modulares sem regressão na acurácia do `TruthKernel`.
- [ ] A raiz de `lyzer edge/` está limpa de scripts `verify_*.js` soltos.
- [ ] Testes de desconexão simulam falhas de rede no Telegram sem perda de mensagens na fila.
- [ ] Sincronização dos documentos correspondentes na Base de Conhecimento `/knowledge`.
