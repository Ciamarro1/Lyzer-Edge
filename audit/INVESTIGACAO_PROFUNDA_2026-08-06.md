# 🔬 LYZER EDGE — INVESTIGAÇÃO PROFUNDA (FULL PIPELINE)
**Data:** 2026-08-06 · **Repo:** github.com/Ciamarro1/Lyzer-Edge · **Método:** /rcoder full pipeline (7 ondas, 12 subagentes)

---

## 🏛️ VEREDITO GLOBAL DO AUDITOR

> **CONDITIONAL PASS — APENAS para DEMONSTRAÇÃO / TESTNET.**
> **REJECTED — para PRODUÇÃO / LIVE.**

Scorecard: Segurança **1.7/10** · Risco/Edge **2/10** · Validação estatística **2/10** · Arquitetura **8/10**

---

## 1. O QUE O SISTEMA É DE VERDADE

**Executor quant testnet com arquitetura de governança inovadora, mas sem edge validado e com seguranças desarmadas.**

- Pipeline 7 camadas real: Providers (V2/V4) → Residualization (consensusLimit 0.1) → TRG (0.4) → TruthKernel → C-CLIST → MOL → ECA Court → Execução Binance.
- **SMC = decorativo** (só overlays, `streamEngine.js:891`); **V2+V4 são os únicos providers ativos** (V1/V3 disabled por default, `streamEngine.js:53`).
- **M4 Entry/Risk/PositionManager: NUNCA implementados** (docs dizem M1.4/M4 PLANNED; SL/TP = % fixa 1.2%/2.4%, `streamEngine.js:802-816`).
- Rust/NATS "execution plane" existe mas **não está conectado ao Node em produção** (gRPC RiskGateway = skeleton approve-all, `main.rs:53-60`, nem buildado no Dockerfile).
- Rodando hoje: **TESTNET** (`ARL_MODE=TESTNET`, `LIVE_TRADING_ENABLED` varia). Nunca operou dinheiro real.

---

## 2. OS 13 ACHADOS-CRÍTICOS (auditoria final)

| ID | Achado | Status evidência | Impacto | Prio |
|---|---|---|---|---|
| R1 | `LIVE_TRADING_ENABLED=true` default no **Dockerfile:66** (bomba se flippar ARL_MODE=LIVE) | ✅ | Perda de capital | P0 |
| R2 | HMAC presente mas **COURT_SECRET_KEY pública** `lyzer_hf_space_default_key` (Dockerfile:68, .env.template:47) | ✅ | Token forjável | P0 |
| R3 | `/api/test-order` + `/reset-engine` SEM auth; `authenticateAdmin` fail-open (`server.js:64`) | ✅ | Ordem/wipe não-autorizado | P0 |
| R4 | Court quase always approva: MOL ignora VETO (`court.js:68`), gates drawdown/size mortos (undefined >= 0.05 = false) | ✅ | Governança inoperante | P0 |
| R5 | RiskGateway Rust = skeleton approve-all, SEQUER buildado no Dockerfile | ✅ | Zero proteção | P0 |
| R6 | `verifyToken` nunca chamado no runtime | ✅ | Assinatura decorativa | P0 |
| R7 | **Edge não comprovado**: backtest real 30 trades, WR 26.67%, Sharpe **-2.16**, PF 0.74, 22/22 ablações UNPROVEN/NOISE | ✅ | Qualquer live perde | P0 |
| R8 | Walk-forward `testTrades=0` (sem validação OOS) | ✅ | Falso confiança | P1 |
| R9 | Frontend `_realRuntime` fake (seno/cos/random, conf 94.2, eef=true) quando feed ausente | ✅ | Engano de operador | P1 |
| R10 | Telemetria fake: 132.820 ticks/s hardcoded vs ~930–1.860 reais | ✅ | Métricas falsas | P1 |
| R11 | Sizing quebrado (qty fixa 0.001), Kelly/RR mortos, `dailyCapitalUsed` monotónico | ✅ | Under/over risk | P1 |
| R12 | Ledger in-memory sem hash-chain (causal tem FNV-1a não-crypt) | ✅ | Auditoria vulnerável | P1 |
| R13 | Duplicações: 175+ arquivos mortos, `_archive` duplicado, 2 TruthKernel (wrapper ≠ canonical) | ✅ | Maturidade | P1 |

---

## 3. SEGURANÇA EM DETALHE (Security + SRE + API)

- **CRÍTICOS:** auth ausente (ADMIN_API_KEY não setada → tudo aberto), k chave pública no repo, ordens testnet sem auth, DDoS via flood de /api/test-order, XSS DOM no ChartHost (`innerHTML`, linha 245-254), CSRF (sem CORS/helmet).
- **Fail-open genérico:** RiskGateway offline/erro → `approved:true`; se binária Rust down, TODAS as ordens aprovam.
- **Observabilidade 100% OFF:** ain rows do runbook são fantasia (0 alert rules, 0 prometheus.yml, sem OTel, sem heartbeat WS); sem `/healthz`; keep_alive do workflow "surdo" (`curl -sI` descarta resposta).
- **Bomba de deploy:** Dockerfile `LIVE_TRADING_ENABLED=true` + ARL_MODE=TESTNET → trocar um env = ordens reais com auth desligada.

---

## 4. VALIDAÇÃO ESTATÍSTICA (real vs docs)

- **Único backtest real** (BTC 1m, 1000 candles ≈ 16.7h): baseline **perdedor** (Sharpe -2.16, p=0.458 not significant, 8W/22L). Zero comission/slippage.
- **22 ablações**: nenhuma `isSignificant=true`; melhor (V4 isolado) = 50% WR / Sharpe 4.92 mas p≈0.099 (marginal, overfit de 1 janela).
- `monte_carlo_results.json` (2000 iterações, "Stable PnL") e `stress_test_results.json` (Sharpe 4.01) = **sintéticos/não reproduzíveis** — contradizem o real.
- 132.820 ticks/s claim = **constante hard-coded** em execution_trace.json/ContinuousMeasurementEngine.

---

## 5. ARQUITETURA GENUINAMENTE INOVADORA (o que é bom)

- SDC 7-camadas: Residualization (destruição de consenso), C-CLIST (estress com histerese/lethal illusion), ECA Court + Ledger, MOL (embora bugado), immune ledger conceitual, Rust/ANATS real (intent-registry com Causal Version Lock + Outbox, OMS com snapshot SHA-256), SHM mmap funcional (demo), Simplificação v2 executada (−70% LoC, 100% tests).
- Testes reais robustos: e2e SMC (126), p0_fixes (31), verificação (15 scripts), ~156 suítes.
- Frontend: 23 widgets, SDK command-center com ~142 engines Disposable.

---

## 6. RECOMENDAÇÕES EXECUTIVAS

**≤ 1 dia:**
1. Rotacionar tokens GitHub/HF; `.env*` no `.gitignore`.
2. Remover secret default do Dockerfile + .env*; gerar por env (`.env` fail-fast já existe).
3. `LIVE_TRADING_ENABLED=false` default (hoje true no Dockerfile).
4. Blindar `/api/test-order`, `/reset-engine`, `/trades/wipe` com auth; fail-closed no authenticateAdmin.
5. Remover/substituir RiskGateway skeleton — ou buildar de verdade.
6. Fix `court.js:68` → bloquear também VETO.

**30 dias:**
7. 222+ trades OOS com purging CV, fees+slippage — ou **parar de operar testnet**.
8. Helmet/CORS/rate-limit/WS-auth; eliminando kernels duplos.
9. Ledger persistido com hash-chain.
10. Telemetria honesta (sem sintético sem flag; RA real > fake).
11. Incluir M4 (Entry/Risk/Position) se quiser seguir os docs.

---

*Gerado 2026-08-06 pelo full pipeline: 5 Explorers → 4 Especialistas (Sec/Perf/SRE/API) → Performance → Reviewer → Critic → Victory Auditor. Verificação direta de 3 pontos críticos no código.*