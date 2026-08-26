# LYZER EDGE — SESSION STATE & HANDOFF

> **Branch:** `main` | **Target Space:** Railway (Exp 3.5)
> **Last Updated:** 2026-08-26 03:38 | **Last Verified Commit:** `e64e712`
> **System Status:** 🟢 OPERATIONAL (Exp 3.5 running on Railway, untouched)

---

## 1. Immediate Objective (Próxima Missão)
- **Current Mission:** Construir o Replay Engine Determinístico (FASE 1)
- **Target Component:** `research/replay/` + cirurgia de DI no `streamEngine.js`
- **Goal:** Replay Engine que usa o MESMO execution path do Live, com fees/slippage modelados

---

## 2. Last Session Handoff (Onde Paramos)
- **Completed:**
  - ✅ Limpeza profunda do repositório (85 pastas de subagentes mortos removidas)
  - ✅ Implementação do Protocolo Stateless (`STATE.md` + `boot.py`)
  - ✅ Auditoria completa do repositório (17 seções, 3 auditores Pro)
  - ✅ Meta-prompt de pesquisa quantitativa aprovado (32 regras)
  - ✅ **FASE 0 CONCLUÍDA:** Download de 90 dias de BTCUSDT M1 (129.600 candles, 0 gaps)
  - ✅ Componentes de FASE 1 criados: `ExecutionSimulator`, `IntrabarResolver`, `MetricsCalculator`
  - ✅ Estrutura `research/` criada (replay/, datasets/, experiments/, results/, etc.)
- **In-Flight (Próximo Passo Imediato):**
  - ⏳ Criar `ReplayDataIngestor` (substituto do LiveDataIngestor)
  - ⏳ Modificar `StreamEngine` para aceitar ingestor injetável (Dependency Injection)
  - ⏳ Criar `ReplayRunner` orquestrador
  - ⏳ Validar determinismo do Baseline (ARM A) com 2 execuções idênticas

---

## 3. Active Configuration & Flags
| Config / Env Var | Current Value | Context / Rationale |
|---|---|---|
| `ARL_MODE` | `SIMULATION` | Validação sem envio de ordens reais |
| `DISABLED_PROVIDERS` | `v1,v3` | Padrão de produção |
| `TRG_THRESHOLD` | `0.30` | Tail Risk Geometry trigger |
| `LHDS_VETO_LIMIT` | `0.95` | Limite de veto do TruthKernel |

---

## 4. Critical Findings from Audit
- **O ReplayEngine existente (`packages/lyzer-shared/src/smc/replayEngine.js`) é um STUB.** NÃO usa o mesmo path do Live. PnL hardcoded, sem fees, sem slippage, 1 provider.
- **O SMC (V1) está DESABILITADO na produção.** Produção usa V2+V4+V5+V6+V7.
- **O pipeline Live NÃO é 100% determinístico.** Fontes: latência, Golden Hours UTC, gRPC async.
- **Dataset disponível:** `research/datasets/BTCUSDT_1m_90d.json` (129.600 candles, hash: `bf794a7ac579022c`)

---

## 5. Research Experiment Design
```
EXP-FRACTAL-001: M1 vs M5 vs M15 structural timeframe
ARM A: Structure M1, Trigger M1 (BASELINE)
ARM B: Structure M5, Trigger M1
ARM C: Structure M15, Trigger M1
Split: 60% IS / 20% VAL / 20% OOS (cronológico)
```

---

## 6. System Architecture Index
- **Pipeline de Execução:** `lyzer edge/backend/streamEngine.js` (2.112 linhas)
- **Regras Operacionais:** `AGENTS.md`
- **Constituição:** `CONSTITUTION.md`
- **Arquivo Morto:** `docs/archive/`
- **Research Audit Completo:** Ver conversação anterior (17 seções)

---

## 7. Quick Verification Commands
```bash
npm test                 # Suíte de testes unitários/integração
npm run test:verify      # Smoke tests rápidos
npm run backend          # Inicia backend na porta 7860
python .agents/scripts/boot.py   # Cold-start primer
```
