# LYZER EDGE — MATRIZ DE MIGRAÇÕES NECESSÁRIAS
**Data:** 2026-08-06  
**Autor:** Migration Engineer  
**Base:** INVESTIGACAO_PROFUNDA_2026-08-06.md (13 achados P0/P1) + análise de código

---

## 📊 MATRIZ DE MIGRAÇÕES

| # | Migração | Risco | Esforço | Dependências | Rollback Plan |
|---|----------|-------|---------|--------------|---------------|
| **M1** | **Testnet → LIVE** (hardening completo baseado nos 13 achados) | **CRÍTICO** | 30-45 dias | M2, M3, M4, M5, M6 | Feature flag `LIVE_TRADING_ENABLED=false` + ARL_MODE=TESTNET instantâneo |
| **M2** | **Unificação Rust Workspaces** (3→1 workspace) | ALTO | 10-15 dias | M1 (parcial), M6 | `git revert` do Cargo.toml unificado; mantém 3 workspaces paralelos durante transição |
| **M3** | **Node.js → Rust: Hot Paths** (TruthKernel, CSRL, Sizing, SignalEngine) | ALTO | 20-30 dias | M2 (workspace unificado) | Dual-write: Rust sombra + Node ativo; comparação de outputs; kill switch |
| **M4** | **In-Memory → Persistent** (Ledger hash-chain, CausalMemoryDB, Engine State) | MÉDIO | 10-15 dias | M1 (R1, R2, R12) | SQLite WAL mode + backup automático; restore point via HF bucket |
| **M5** | **Single Process → Multi-Process** (6 StreamEngines isolados) | MÉDIO-ALTO | 15-20 dias | M2 (IPC Rust), M4 (state isolado) | Process manager (PM2/systemd); health checks; graceful degradation |
| **M6** | **Monorepo → Separate Repos** (lyzer-shared, lyzer-constitution, backend, frontend, rust-core) | BAIXO-MÉDIO | 5-10 dias | M2 (boundaries claros) | Monorepo mantido como backup; `git subtree split` reversível |

---

## 🔴 MIGRAÇÃO MAIS CRÍTICA: **M1 — Testnet → LIVE**

### Por que é a MAIS CRÍTICA:

| Fator | Evidência |
|-------|-----------|
| **Risco de ruína** | R1: `LIVE_TRADING_ENABLED=true` default no Dockerfile — um flip de `ARL_MODE=LIVE` dispara ordens reais com auth desligada |
| **Governança inoperante** | R4: Court aprova quase tudo (ignora VETO, gates drawdown/size mortos — `undefined >= 0.05 = false`) |
| **Zero proteção Rust** | R5: RiskGateway = skeleton `approve-all`, nem buildado no Dockerfile |
| **Auth inexistente** | R3: `/api/test-order`, `/reset-engine` sem auth; `authenticateAdmin` fail-open |
| **Edge não comprovado** | R7: Backtest real 30 trades, WR 26.67%, Sharpe **-2.16**, PF 0.74 — **qualquer live perde dinheiro** |
| **Métricas falsas** | R9, R10: Frontend `_realRuntime` fake (seno/cos/random), telemetria 132.820 ticks/s hardcoded |
| **Sizing quebrado** | R11: Qty fixa 0.001, Kelly/RR mortos, `dailyCapitalUsed` monotónico |

**Conclusão:** Operar LIVE hoje = **perda de capital garantida**. Não é migração técnica — é **pré-condição de sobrevivência**.

---

## 🎯 ORDEM RECOMENDADA DE MIGRAÇÃO (Minimiza Risco)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 0 — "STOP THE BLEEDING" (0-2 dias) — PRÉ-REQUISITO PARA TUDO          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Dockerfile: LIVE_TRADING_ENABLED=false (default)                        │
│ 2. Rotacionar COURT_SECRET_KEY; remover default do .env/Dockerfile         │
│ 3. ADMIN_API_KEY obrigatória; fail-closed no authenticateAdmin             │
│ 4. Blindar /api/test-order, /reset-engine, /trades/wipe com auth           │
│ 5. Fix court.js:68 → bloquear VETO também (não só RECOVERY)                │
│ 6. RiskGateway: ou implementar de verdade OU remover gRPC call (fail-closed)│
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 1 — FUNDAÇÕES PERSISTENTES (Semana 1-2)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ M4: In-Memory → Persistent                                                 │
│   • Ledger: hash-chain SHA-256 (append-only, tamper-evident)               │
│   • CausalMemoryDB: WAL mode, schema migrations, backup/restore HF         │
│   • Engine State: SQLite (não JSON em /tmp) + snapshots periódicas         │
│   • R12 resolvido: FNV-1a → SHA-256 chain                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 2 — UNIFICAÇÃO RUST (Semana 2-4)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ M2: 3 workspaces → 1 workspace unificado (lyzer-core)                      │
│   • Consolidar: lyzer-shared (Node) + lyzer-core-governance (Rust)         │
│   • Eliminar duplicação: 2x TruthKernel (Node kernel.js + Rust lib.rs)     │
│   • lyzer-eca, lyzer-oal, lyzer-ocr, lyzer-shm-spine, lyzer-binance-adapter│
│   • lyzer-reality-ws, lyzer-shadow-oms, lyzer-intent-registry, lyzer-oms   │
│   • lyzer-risk-gateway, lyzer-core-hub, lyzer-core-arbitration, memory     │
│   • Publicar crates internos via workspace dependencies                    │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 3 — MULTI-PROCESS ARCHITECTURE (Semana 4-6)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ M5: 6 StreamEngines → 6 processos isolados                                 │
│   • IPC via NATS/Redis Streams (já existe lyzer-reality-ws, lyzer-oal)     │
│   • Shared state → CausalMemoryDB (SQLite WAL) + SHM para hot path         │
│   • Process manager: PM2 ou systemd com health checks /healthz             │
│   • Graceful degradation: engine down ≠ fleet down                         │
│   • Observabilidade real: Prometheus + OTel + alert rules (hoje 0)         │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 4 — NODE.JS → RUST HOT PATHS (Semana 6-10)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ M3: Migrar caminhos críticos para Rust (performance + determinismo)        │
│   Prioridade 1: TruthKernel (kernel.js → Rust) — coração do edge           │
│   Prioridade 2: CSRL (ScaleNormalizer, CSTG, InvariantExtractor, Divergence)│
│   Prioridade 3: DynamicSizing (Kelly, ATR, Risk/Reward)                    │
│   Prioridade 4: SignalEngine (EvSignalEngine, EVAlphaResearchEngine)       │
│   Estratégia: Dual-write (Rust sombra + Node ativo) → comparação → swap    │
│   gRPC/NATS para comunicação Node↔Rust (já existe riskGatewayClient)       │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 5 — VALIDAÇÃO ESTATÍSTICA REAL (Semana 10-14) — BLOQUEIO PARA LIVE    │
├─────────────────────────────────────────────────────────────────────────────┤
│ R7/R8: 222+ trades OOS com purging CV, fees+slippage reais                 │
│   • Walk-forward validation obrigatório (testTrades > 0)                   │
│   • Monte Carlo / Stress Test reproduzíveis (não sintéticos)               │
│   • Edge comprovado: Sharpe > 1.0, PF > 1.2, WR > 45% em OOS              │
│   • Sem isso: **NÃO VAI PARA LIVE** (auditor verdict: REJECTED)            │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 6 — MONOREPO → SEPARATE REPOS (Semana 14-16) — OPCIONAL / DEPOIS      │
├─────────────────────────────────────────────────────────────────────────────┤
│ M6: Split apenas se time > 5 devs ou necessidade de deploy independente    │
│   • lyzer-shared (Node libs) → npm package privado                         │
│   • lyzer-constitution (Court/Ledger) → npm package privado                │
│   • lyzer-rust-core → cargo workspace publicado (crates.io ou registry)    │
│   • backend (server.js + StreamEngines) → Docker image                     │
│   • frontend (Vite/React) → static assets + Docker                         │
│   • CI/CD independente por repo                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST DETALHADO: TESTNET → LIVE (M1)
*Baseado nos 13 achados — cada item deve ter ✅ antes de flippar ARL_MODE=LIVE*

### Segurança (P0 — Bloqueadores)
- [ ] **R1** `LIVE_TRADING_ENABLED=false` default no Dockerfile + .env.template
- [ ] **R2** `COURT_SECRET_KEY` rotacionada (32+ bytes), fora do repo, injetada via secret manager
- [ ] **R3** `ADMIN_API_KEY` obrigatória; `authenticateAdmin` fail-closed; rate-limit nas rotas admin
- [ ] **R4** `court.js:68` fix: bloquear `epistemic_authority === 'VETO'` (hoje só bloqueia RECOVERY)
- [ ] **R5** RiskGateway: implementar lógica real (position limits, drawdown, correlation) + build no Dockerfile
- [ ] **R6** `verifyToken` chamado em runtime (HMAC validation no Court + Execution)

### Validação Estatística (P0 — Bloqueadores)
- [ ] **R7** Backtest OOS ≥ 222 trades (30 dias min), fees+slippage reais, Sharpe > 1.0, PF > 1.2
- [ ] **R8** Walk-forward validation: `testTrades > 0`, purging CV, múltiplas janelas/regimes

### Observabilidade & Honestidade (P1 — Necessários)
- [ ] **R9** Remover `_realRuntime` fake (seno/cos/random); fallback honesto "feed indisponível"
- [ ] **R10** Telemetria real: remover 132.820 hardcoded; medir ticks/s reais
- [ ] **R11** Sizing: Kelly dinâmico, RR ≥ 1:2, ATR-based SL/TP, `dailyCapitalUsed` reset diário
- [ ] **R12** Ledger: hash-chain SHA-256 (append-only), assinatura HMAC por entrada
- [ ] **R13** Limpeza: remover 175+ arquivos mortos, `_archive`, duplicar TruthKernel

### Infra & Operação
- [ ] Helmet/CORS/CSRF/rate-limit no Express
- [ ] `/healthz` endpoint + Prometheus metrics + alert rules (hoje 0)
- [ ] WebSocket auth (hoje só query param `key`)
- [ ] M4 Entry/Risk/PositionManager implementados (docs dizem PLANNED)
- [ ] Shadow trading válido por ≥ 30 dias sem divergência crítica (RealityGapMonitor)

---

## ⚠️ RISCOS DE ORDENAMENTO INCORRETO

| Ordem Errada | Consequência |
|--------------|--------------|
| M3 antes de M2 | Rust fragments duplicados, Cargo.toml hell, builds quebrados |
| M5 antes de M4 | State loss em crash de processo; race conditions no JSON file |
| M1 antes de M4 | Ledger in-memory = auditoria impossível em LIVE |
| M6 antes de M2 | Boundaries imprecisos → circular deps entre repos |
| M3 antes de M5 | Single-process Rust = mesmo blast radius; sem isolamento de falha |

---

## 🎯 CRITÉRIOS DE "GO/NO-GO" PARA LIVE

| Critério | Threshold | Status Atual |
|----------|-----------|--------------|
| Sharpe OOS (30d, fees+slippage) | > 1.0 | **-2.16** ❌ |
| Profit Factor OOS | > 1.2 | **0.74** ❌ |
| Win Rate OOS | > 45% | **26.67%** ❌ |
| Max Drawdown | < 10% | Desconhecido (sizing quebrado) |
| RiskGateway operational | 100% coverage | **0% (skeleton)** ❌ |
| Court VETO functional | 100% paths tested | **Broken (R4)** ❌ |
| Auth coverage | 100% admin routes | **~0% (fail-open)** ❌ |
| Ledger tamper-evident | SHA-256 chain | **FNV-1a only** ❌ |
| Telemetria honesta | 0 hardcoded | **132k fake** ❌ |

**VEREDITO: NO-GO ABSOLUTO PARA LIVE.** Mínimo 30 dias de engenharia (Fases 0-5) + validação estatística real.

---

## 📦 ENTREGÁVEIS DESTA ANÁLISE

1. **Esta matriz** — `MIGRATION_ANALYSIS_2026-08-06.md`
2. **Próximo passo sugerido:** Criar `MIGRATION_PLAN_EXECUTABLE.md` com tasks atômicas, owners, e datas para Fase 0 (hoje) e Fase 1 (esta semana)