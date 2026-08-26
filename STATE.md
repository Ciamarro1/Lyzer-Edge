# LYZER EDGE — SESSION STATE & HANDOFF

> **Branch:** `main` | **Target Space:** Railway (Exp 3.5)
> **Last Updated:** 2026-08-26 05:17 | **Last Verified Commit:** `26138a0`
> **System Status:** 🔴 CRITICAL ALARM (Live strategy proven to be negatively skewed)

---

## 1. Immediate Objective (Próxima Missão)
- **Current Mission:** Investigar o colapso de performance no In-Sample. O robô tem Edge negativo.
- **Goal:** Isolar os provedores de sinal para descobrir qual está sangrando dinheiro e/ou reavaliar a gestão de risco (Stop/Take).

---

## 2. Last Session Handoff (Onde Paramos)
- **Completed:**
  - ✅ **FASE 3 (Experimento FRACTAL-001):** Concluída.
  - ❌ **Resultados:** A hipótese de que M5 ou M15 geraria melhor Alfa que M1 foi **REJEITADA**. Os 3 braços falharam catastroficamente no In-Sample (Win Rate de 6-7%, Expectância matemática negativa de $-0.22 por trade). O modelo sangra spread/taxas pesadamente.
  - ⛔ **FASE 4 e OOS:** Canceladas sob as leis da pesquisa quantitativa. Não avançamos modelos falhos.
  - ✅ **Relatório Executivo:** `VICTORY_AUDIT_REPORT_FRACTAL.md` foi gerado e entregue ao usuário.

---

## 3. Active Configuration & Flags
| Config / Env Var | Current Value | Context / Rationale |
|---|---|---|
| `ARL_MODE` | `SIMULATION` | Validação sem envio de ordens reais |
| `DISABLED_PROVIDERS` | `v1,v3` | Padrão de produção |
| `TRG_THRESHOLD` | `0.30` | Tail Risk Geometry trigger |

---

## 4. Architectural Notes (CTO)
O sistema tem isolamento em 3 camadas e determinismo garantido (FASE 2 provou 100% de integridade mecânica). Isso significa que **os resultados ruins não são bugs de software, são bugs de lógica de mercado**. A matemática comprova que as regras atuais da estratégia SMC implementadas no motor têm zero Alfa no BTCUSDT.
