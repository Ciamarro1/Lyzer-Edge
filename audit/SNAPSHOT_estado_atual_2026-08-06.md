# SNAPSHOT — Estado Atual do Lyzer Edge
**Data:** 2026-08-06 · **Repo:** github.com/Ciamarro1/Lyzer-Edge (último push 2026-08-06 02:00Z)

---

## 1. O que é

**Lyzer Edge** — plataforma quantitativa institucional e motor de execução determinística para trading cripto (Binance/Bybit/Kraken). Arquitetura em **3 processos isolados** e **pipeline de governança em 7 camadas** antes de qualquer ordem:

```
1. Providers de sinal (V1 SMC/ICT, V2 SnD, V3 Momentum, V4)
2. ResidualizationLayer (destruição de consenso)
3. ExecutionTriggerLayer (gate TRG ≥ 0.40)
4. Truth Kernel (veto LHDS/DVF — colapso ontológico)
5. C-CLIST (oráculo de estresse epistêmico — "Campo de Ilusão de Estabilidade")
6. MOL (Meta-Observation, estados de recuperação)
7. Constitutional Court/ECA (autorização soberana → PermissionToken → execução)
```

Princípios: **Sobrevivência > Governança > Otimização**; a Corte *nunca aprende* probabilidades/confidence (axioma anti-arrogância estocástica); ledger imutável.

**Stack:** Node.js 20 (Express 5 + WebSocket, porta 7860) · Vite 7 (frontend SPA) · Rust (RiskGateway gRPC :50051, Intent Registry :50052, OMS, NATS JetStream :4222, SHM mmap) · SQLite WAL · TypeScript (src-ts) · un monorepo com workspaces.

---

## 2. Estado de maturidade (veredito sintetizado)

| Dimensão | Status | Evidência |
|---|---|---|
| Arquitetura núcleo | ✅ **Freeze arquitetural v1.0** + simplificação v2 (~70% LoC removidos) | R5 hardening, changelog v28 |
| Pipeline quant (7 camadas) | ✅ Implementado e orquestrado no `streamEngine.js` | runtime-flow, architecture-map |
| Testes | ✅ ~160 arquivos / 156 suítes; e2e SMC: virt | tests/, certificações M1.1–M1.3 |
| Certificação documental | ✅ M1.1 (99/100), M1.2 (99/100), M1.3 (100/100) | docs/reports/MCR-cert |
| Chaos engineering | ✅ R4: 500k eventos, p99 6.1ms, 0% perda causal, "ANTIFRAGILE" | docs/audits/R4 |
| **Capacidade econômica real** | ❌ **NUNCA operou capital real** (Live desabilitado: `LIVE_TRADING_ENABLED=false`) | server.js, .env |
| **Testnet / paper trading** | ✅ **Funcional agora** (Binance Testnet + paper local) | commits 03-06/08 |
| Auto-avaliação | ⚠️ "Architecture Complete but Capability Incomplete" (C1) | docs/audits/C1 |

**Conclusão central:** o projeto está em **demonstração/testnet funcional**, com arquitetura madura e grandes selos de auditoria interna — mas **sem nenhuma prova econômica externa** (nenhuma ordem de dinheiro real já executada).

---

## 3. Estado real do código (verificado)

### Backend — `lyzer edge/backend/` (~31 arquivos, ~6.250 LoC)
- `server.js` (621 l) — Express 5 + WS, APIs, proteções.
- `streamEngine.js` (**1.022 l** — núcleo: orquestra SMC → Kernel → Court → Execução)
- `db.js` (668 l) — SQLite WAL (CausalMemory UUIDv7); `migrations.js` (451 l)
- `liveDataIngestor.js` (298 l) — Binance WS → fallback REST → fallback sintético
- `exchangeExecution.js` (105 l) — Mock / Testnet / Live (HMAC-SHA256; ~retorna `FILLED_MOCK` sem credenciais)
- + `experimentManager.js` (332), `dualRealityMonitor.js`, `realityGapMonitor.js`, `EVAlphaResearchEngine V3/V3_?`, `telegram.js`, `utils/ssrfGuard.js`, `utils/safeJson.js`

### 3.2 Módulos SMC — `packages/lyzer-shared/src/smc/` (**todos reais, não stubs**)
`timeframeManager.js` (309 l), `liquidityEngine.js` (298), `replayEngine.js` (181), `structureEngine.js` (131), `smcFacade.js` (99, orquestrador), `trendEngine.js` (83). Cobertos por `tests/smc/`.

### 3.3 Constitutional — `packages/lyzer-constitution/`
Corte (`court.js`), `ledger.js` (8.2KB), `permission.js`, `c-clist.js`, `mol.js`, `vault.js`, `killSwitch.js`, `axioms.js`; suíte CER/SIL (TS). + `SystemThermodynamicsLayer.ts`.

### 3.4 Frontend — `lyzer edge/src/` (~385 arquivos)
- View principal: `GamifiedCommandCenterView.js` (650 l)
- **23 widgets** do Command Center (chartHost, court, edgeDashboard, testnet, tradeLog, agentHub, patternRecognition, realityStatus, researchLab...)
- SDK: ~142 engines Disposable em 12 subsistemas
- `TestnetDashboardWidget.js` (198 l — real), `LiveTradingView` foi substituído pelo serviço live-trade sync

### 3.5 Rust — `src-rust/` (8 crates) + `lyzer-workspace/` (5 crates)
`la-binance-adapter` (com signer HMAC), `la-oal` (feed Binance + Parquet), `la-ocr` (falsificação), `la-shm-spine` (ring buffer real 64KB), etc. Em `lyzer-workspace`: `lyzer-core-models`/lib.rs, `lyzer-core-hub` (main 8KB + run_empirical_test.ps1), arbitration, memory, governance. Node→Rust gRPC já conectado (commit 02/08).

### 3.6 Testes — `lyzer edge/tests/`
26 subpastas, ~160 arquivos: unit (39), verification (17), e2e_smc (e2e_suite 1.282 l), smc (6), causal-memory (8), autonomous-research (7), empirical (7), institutional (7), adaptive-sandbox (6)...

---

## 4. Simulação vs Real (a tensão central)

- **Config atual:** `ARL_MODE=TESTNET` + `LIVE_TRADING_ENABLED=false`
- Sem chaves → ordens simuladas (`FILLED_MOCK`); com chaves testnet → **ordens reais Binance Testnet** (audit: funcional)
- Risco de integridade: candles sintéticas de warmup/fallback **não sinalizadas como sintéticas** — auditoria de runtime flagrou isso
- Frontend tem valores hardcoded (osciladores) no `_realRuntime` quando dados reais não chegam — **removidos nos últimos commits** ("remove mock trades" 03-04/08)

---

## 5. Commits do GitHub (últimas 3 semanas)

Repo: criado 27/06/2026, público, 0 stars, JS dominante, autor **Ciamarro1 (80%)** + **"Lyzer Agent" (20%)**. Pico em 03/08 (15 commits).

| Data | Destaques |
|---|---|
| 06/08 | fix timestamp widget testnet (bug "ano 58565"); feat broadcast liveExecution WS; /api/test-order |
| 05/08 | remove trades mock/fake, cache widgets, archive V2 |
| 04/08 | paper trading enforced em testnet sem keys; sync testnet com keys; vite proxy → 127.0.0.1 |
| 03/08 | candles reais 999→1000 API; reset trades; Testnet Status tab; payload do TestnetDashboard; COURT_SECRET_KEY runtime fix |
| 02–01/08 | R4 migration/Antigravity; gRPC Node→Rust; leaderboard/AgentHub UI |
| ~27/07 | telemetria DVF/LHDS/EEF; VSL; MicrostructureDampener |

**Tendência:** saída do modo "demo com dados fake" → **testnet funcional com dados reais**, UI de cockpit robusta, integração Rust. **Sem push para mainnet/live_real.**

---

## 6. Dívidas e riscos conhecidos

- Veredito interno (`investigation/meta-analysis/EXECUTIVE_SYNTHESIS.md`): Code & Auth audit encontrou **dois Truth Kernel com algoritmos divergentes**, PermissionToken forável (SHA-256 sem HMAC), C/CLIST/MOL avaliados fora da corte (backdoor no streamEngine), ~174 arquivos mortos (~36.700 l), dados sintéticos sem flag — classificação "não está pronto para produção".
- **Shadow Fund (L14):** fundo-sombra 365d: NAV R$ 1.000.000 → R$ 1.284.500 (+28,45%), 730 trades, WR 55,8% — porém **sem alpha core usado nesse teste** (blind setup).
- **Dívida técnica:** `streamEngine` God Object; chunk Vite ~1.2MB; duplicatas `_archive` (53 arquivos); testes concorrentes SQLite (V8/NAPI); deps não usadas (Video2, ChartJS zoom).
- **Validação científica frágil:** Robustness ~67,85/100; flash crash 50% só hipótese; biases (survivorship 6 ativos, seleção 12,6h).

---

## 7. Próximos passos formais (roadmap)

1. **C2 — Paper Trading Reality Test** (próximo oficial; API keys no .env; slippage/funding rates reais)
2. **C3 — Autonomous Capital Mgmt** (CAS/MAS)
3. **M1.4 Command Center/Provider Reality Boundary** (em andamento)
4. Fase 8+ — múltiplas corretoras (Bybit/Kraken)
5. Continuidade do fork Shadow War (fases 2-5 bloqueadas por regimento)

---

*Gerado por 5 subagentes (Wave 1: docs, knowledge, engineering-audit · Wave 2: código real, GitHub). Fontes: README, PROJECT.md, docs/audit|audits|roadmap, knowledge, engineering-audit, lyzer edge/docs, código-fonte, API GitHub.*