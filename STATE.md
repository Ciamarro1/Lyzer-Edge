# LYZER EDGE — SESSION STATE & HANDOFF

> **Branch:** `main` | **Target Space:** Railway (Exp 3.5)
> **Last Updated:** 2026-08-26 05:54 | **Last Verified Commit:** `PENDING_PUSH`
> **System Status:** 🔴 CRITICAL ALARM (Live strategy proven to have NO EDGE - H1 Signal Failure)

---

## 1. Immediate Objective (Próxima Missão)
- **Current Mission:** Executar o script `EXP-PROVIDER-ISOLATION-001` para isolar qual dos provedores (V2, V4, V5, V6, V7) é o responsável por emitir as entradas perdedoras sem MFE. 
- **Goal:** Encontrar o Alfa bruto escondido nos provedores individuais ou constatar que todos carecem de direcionalidade de curto prazo.

---

## 2. Last Session Handoff (Onde Paramos)
- **Completed:**
  - ✅ **Bug Fix:** O `ExecutionSimulator` foi reescrito para respeitar o `pos.accumulatedPnl` (Scale Outs). O laboratório agora contabiliza corretamente as tranches parciais em vez de julgar tudo pelo preço do último lote estopado.
  - ✅ **EXP-AUTOPSY-001 (Veredito Final):** Com a telemetria consertada, provou-se que o Edge negativo vem da raiz: **H1 - SIGNAL FAILURE**. 88% dos trades "nunca funcionam", não respirando nem 0.20R a favor.
  - ✅ **Script de Isolamento:** O script `research/experiments/runProviderIsolation.js` foi criado para rodar o laboratório isolando um provedor de cada vez.
- **Interrupted:**
  - ⏸️ A execução do `runProviderIsolation.js` foi abortada antes da conclusão a pedido do usuário (sandbox sendo fechada). O laboratório não terminou de dissecar os provedores.

---

## 3. Active Configuration & Flags
| Config / Env Var | Current Value | Context / Rationale |
|---|---|---|
| `ARL_MODE` | `SIMULATION` | Validação sem envio de ordens reais |
| `DISABLED_PROVIDERS` | `dinâmico` | O script de isolamento injeta essa flag a cada iteração |

---

## 4. Architectural Notes (CTO)
A falha não está na gestão de risco, no ECA ou no Replay. O gatilho original das entradas (gerado pelos provedores) tem uma correlação microscópica ou nula com direcionalidade de curto prazo no BTCUSDT M1. A prioridade de engenharia é encontrar o falso-positivo na geração de sinais, removendo a sujeira até que sobre apenas o gatilho com real assimetria condicional (MFE > 1R frequente).
