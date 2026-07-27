# Configuration Surface Audit

> **Data**: 2026-07-27 | **Scope**: All `process.env.X` reads in project code (excluding node_modules, target, dist)
> **Methodology**: Grep all `.js` + cross-reference `.env.template`, `.env`, `.env.exp-*`, and documentation

---

## 1. Configuration Matrix

| # | Variável | `.env.template` | `.env` | Código (arquivos) | Default | Obrigatória? | Doc `configuration.md`? | Ativa? |
|---|----------|:---------------:|:------:|:-------------------|:-------:|:------------:|:------------------------:|:------:|
| 1 | `ARL_MODE` | `TESTNET` | — | server.js:17,319,324,424,498,529; streamEngine.js:54,950; telegram.js:57; experimentManager.js:106; providers/*/server.js,streamEngine.js | `'TESTNET'` | Não | Sim | ✅ Ativa |
| 2 | `BINANCE_API_KEY` | `YOUR_API_KEY_HERE` | — | streamEngine.js:330; providers/*/streamEngine.js | *(none)* | Sim (LIVE/TESTNET) | Não | ✅ Ativa |
| 3 | `BINANCE_API_SECRET` | `YOUR_API_SECRET_HERE` | — | streamEngine.js:331; providers/*/streamEngine.js | *(none)* | Sim (LIVE/TESTNET) | Não | ✅ Ativa |
| 4 | `LIVE_TRADING_ENABLED` | `true` | — | server.js:18; streamEngine.js:99; run_live_testnet.js:6 | `'true'` | Não | Não | ✅ Ativa |
| 5 | `MAX_DAILY_CAPITAL` | `1000` | — | server.js:19,320,515; streamEngine.js:100; run_live_testnet.js:7 | `'1000'` / `'0'` | Não | Não | ✅ Ativa |
| 6 | `TRG_THRESHOLD` | `0.4` | — | streamEngine.js:35; experimentManager.js:109 | `'0.4'` | Não | Sim (doc) | ✅ Ativa |
| 7 | `RESIDUAL_CONSENSUS_LIMIT` | `0.1` | — | streamEngine.js:37; experimentManager.js:110 | `'0.1'` / `'0.0'` | Não | Sim (doc) | ✅ Ativa |
| 8 | `CCLIST_DVF_FLOOR` | `0.1` | — | streamEngine.js:42 | `'0.1'` | Não | Não | ✅ Ativa |
| 9 | `CCLIST_STRESS_ACCUMULATION` | `0.002` | — | streamEngine.js:43 | `'0.002'` | Não | Não | ✅ Ativa |
| 10 | `CCLIST_LETHAL_ILLUSION_LIMIT` | `0.9` | — | streamEngine.js:44; experimentManager.js:111 | `'0.9'` | Não | Sim (como `CCLIST_LETHAL_LIMIT`) | ✅ Ativa |
| 11 | `CCLIST_STRESS_RELEASE` | `0.1` | — | streamEngine.js:45 | `'0.1'` | Não | Não | ✅ Ativa |
| 12 | `MOL_SCL_THRESHOLD` | `3` | — | streamEngine.js:47; experimentManager.js:112 | `'3'` | Não | Sim (doc) | ✅ Ativa |
| 13 | `LHDS_VETO_LIMIT` | `0.8` | — | streamEngine.js:38; experimentManager.js:113 | `'0.8'` | Não | Sim (doc) | ✅ Ativa |
| 14 | `ONTOLOGICAL_COLLAPSE_TRG` | `0.7` | — | streamEngine.js:39; experimentManager.js:114 | `'0.7'` | Não | Sim (doc) | ✅ Ativa |
| 15 | `MOL_STABILIZATION_WINDOW_MS` | `45000` | — | streamEngine.js:107-108 | `45000` (0 se test) | Não | Não | ✅ Ativa |
| — | **Variáveis no código SEM entrada no `.env.template`** | | | | | | | |
| 16 | `TRG_EXPONENT` | — | — | streamEngine.js:36 | `'2'` | Não | Não | ✅ Ativa |
| 17 | `DISABLED_PROVIDERS` | — | — | streamEngine.js:48; experimentManager.js:115 | `'v1,v3'` / `''` | Não | Não | ✅ Ativa |
| 18 | `SHADOW_TRADING_ENABLED` | — | — | streamEngine.js:49 | `'false'` | Não | Não | ✅ Ativa |
| 19 | `MODE` (fallback) | — | — | streamEngine.js:54,950; providers/*/streamEngine.js | `'SIMULATION'` | Não | Não | ✅ Ativa (fallback) |
| 20 | `SCALP_SL_PCT` | — | — | streamEngine.js:755 | *(none)* | Não | Não | ⚠️ Ativa (só se definido) |
| 21 | `SCALP_TP_PCT` | — | — | streamEngine.js:756 | *(none)* | Não | Não | ⚠️ Ativa (só se definido) |
| 22 | `ADMIN_API_KEY` | — | — | server.js:41 | *(none)* | Não | Não | ✅ Ativa |
| 23 | `PORT` | — | — | server.js:522; providers/*/server.js | `7860` / `3002` / `3003` | Não | Não | ✅ Ativa |
| 24 | `TELEGRAM_BOT_TOKEN` | — | — | telegram.js:8 | *(none)* | Sim (alerta) | Não | ✅ Ativa |
| 25 | `TELEGRAM_CHAT_ID` | — | — | telegram.js:9 | *(none)* | Sim (alerta) | Não | ✅ Ativa |
| 26 | `TELEGRAM_API_URL` | — | — | telegram.js:10 | `'https://api.telegram.org'` | Não | Não | ✅ Ativa |
| 27 | `DATA_DIR` | — | — | db.js:7; statePersistence.js:4; migrateLegacy.js:22 | `'/tmp/data'` | Não | Não | ✅ Ativa |
| 28 | `DB_PATH` | — | — | db.js:9 | `<DATA_DIR>/historical_causal_memory.db` | Não | Não | ✅ Ativa |
| 29 | `TAKE_PROFIT` | — | — | experimentManager.js:98 | `'0.02'` | Não | Não | ✅ Ativa |
| 30 | `STOP_LOSS` | — | — | experimentManager.js:99 | `'0.01'` | Não | Não | ✅ Ativa |
| 31 | `LONG_ENABLED` | — | — | experimentManager.js:100 | `'true'` | Não | Não | ✅ Ativa |
| 32 | `SHORT_ENABLED` | — | — | experimentManager.js:101 | `'true'` | Não | Não | ✅ Ativa |
| 33 | `LEVERAGE` | — | — | experimentManager.js:102 | `'1'` | Não | Não | ✅ Ativa |
| 34 | `ACTIVE_SYMBOLS` | — | — | experimentManager.js:103 | `'BTCUSDT,ETHUSDT,SOLUSDT'` | Não | Não | ✅ Ativa |
| 35 | `ACTIVE_FILTERS` | — | — | experimentManager.js:104 | `'RESIDUAL,TRG,LHDS,CCLIST,MOL'` | Não | Não | ✅ Ativa |
| 36 | `ACTIVE_MODELS` | — | — | experimentManager.js:105 | `'V1_SMC,V2_SnD,V3_Momentum'` | Não | Não | ✅ Ativa |
| 37 | `TIMEFRAME` | — | — | experimentManager.js:108 | `'1h'` | Não | Não | ✅ Ativa |
| 38 | `FEATURE_FILTER_H4_ALIGNMENT` | — | — | smcFacade.js:57; replayEngine.js:46 | *(set programmatically)* | Não | Não | ✅ Ativa (runtime flag) |
| 39 | `FEATURE_FILTER_STRUCTURE_CONFLUENCE` | — | — | smcFacade.js:58; replayEngine.js:47 | *(set programmatically)* | Não | Não | ✅ Ativa (runtime flag) |
| 40 | `SIMULATION_MODE` | — | — | decisionLedger.js:12; runL11Simulation.js:9 | `'false'` | Não | Não | ✅ Ativa (pesquisa) |
| 41 | `AUDIT_ONLY` | — | — | capitalAllocationGovernor.js:14 | `'false'` | Não | Não | ✅ Ativa (pesquisa) |
| 42 | `ODDS_API_KEY` | — | — | sportsDataIngestor.js:4 | *(none)* | Sim (sports) | Não | ⚠️ Ativa (subsistema sports) |
| 43 | `NODE_ENV` | — | — | streamEngine.js:105; killSwitch.js (x2); verify_*.js | `undefined` | Não | Não | ✅ Ativa (ambiente) |
| 44 | `VITEST` | — | — | streamEngine.js:105 | `undefined` | Não | Não | ✅ Ativa (testes) |

---

## 2. Dead Config

**Nenhuma variável definida no `.env.template` deixou de ser lida no código.** Todas as 15 variáveis do template são referenciadas por pelo menos um arquivo.

**Variáveis mortas no `.env` ATUAL** (presentes no arquivo mas não lidas por nenhum código do projeto):

| Variável | Onde está | Uso real |
|----------|-----------|----------|
| `GITHUB_TOKEN` | `.env` (root + lyzer edge/.env) | Nunca lida pelo código JS. Usada apenas pelo script `deploy-experiments.ps1` (git push remoto). |
| `Github_neww` | `.env` (root + lyzer edge/.env) | Nunca lida. Possível duplicata typo de `GITHUB_TOKEN`. |
| `HF_TOKEN` | `.env` (root + lyzer edge/.env) | Nunca lida pelo código JS. Usada apenas pelo `deploy-experiments.ps1` para API Hugging Face. |
| `HF_LYZER` | `.env` (root + lyzer edge/.env) | Nunca lida. Duplicata de `HF_TOKEN`. |

**Conclusão**: O `.env` atual contém **apenas tokens de deploy** (GITHUB_TOKEN, HF_TOKEN) e não serve para configurar o runtime do sistema. É um risco de segurança grave (tokens hardcoded).

---

## 3. Undocumented Config

Variáveis **lidas no código** mas **ausentes do `.env.template`**:

| # | Variável | Onde é lida | Impacto |
|---|----------|-------------|---------|
| 1 | `TRG_EXPONENT` | streamEngine.js:36 | Controla expoente do TRG no TruthKernel |
| 2 | `DISABLED_PROVIDERS` | streamEngine.js:48, experimentManager.js:115 | Desliga providers V1-V4 por string |
| 3 | `SHADOW_TRADING_ENABLED` | streamEngine.js:49,324,464,677 | Ativa shadow trading (reality gap monitor) |
| 4 | `MODE` | streamEngine.js:54,950 | Fallback legacy para ARL_MODE |
| 5 | `SCALP_SL_PCT` | streamEngine.js:755 | Override de stop loss percentual para scalping |
| 6 | `SCALP_TP_PCT` | streamEngine.js:756 | Override de take profit percentual para scalping |
| 7 | `ADMIN_API_KEY` | server.js:41 | Protege rotas administrativas (/metrics, freeze, promote) |
| 8 | `PORT` | server.js:522, providers/*/server.js | Porta do servidor HTTP |
| 9 | `TELEGRAM_BOT_TOKEN` | telegram.js:8 | Token do bot Telegram para alertas |
| 10 | `TELEGRAM_CHAT_ID` | telegram.js:9 | Chat ID do Telegram |
| 11 | `TELEGRAM_API_URL` | telegram.js:10 | URL base da API Telegram (proxy support) |
| 12 | `DATA_DIR` | db.js:7, statePersistence.js:4, migrateLegacy.js:22 | Diretório de dados persistence |
| 13 | `DB_PATH` | db.js:9 | Caminho completo do banco SQLite |
| 14 | `TAKE_PROFIT` | experimentManager.js:98 | Config de TP para experimentos |
| 15 | `STOP_LOSS` | experimentManager.js:99 | Config de SL para experimentos |
| 16 | `LONG_ENABLED` | experimentManager.js:100 | Habilita/desabilita long |
| 17 | `SHORT_ENABLED` | experimentManager.js:101 | Habilita/desabilita short |
| 18 | `LEVERAGE` | experimentManager.js:102 | Alavancagem para experimentos |
| 19 | `ACTIVE_SYMBOLS` | experimentManager.js:103 | Símbolos ativos |
| 20 | `ACTIVE_FILTERS` | experimentManager.js:104 | Filtros ativos |
| 21 | `ACTIVE_MODELS` | experimentManager.js:105 | Modelos ativos |
| 22 | `TIMEFRAME` | experimentManager.js:108 | Timeframe base |
| 23 | `FEATURE_FILTER_H4_ALIGNMENT` | smcFacade.js:57 | Feature flag (set programmaticamente) |
| 24 | `FEATURE_FILTER_STRUCTURE_CONFLUENCE` | smcFacade.js:58 | Feature flag (set programmaticamente) |
| 25 | `SIMULATION_MODE` | decisionLedger.js:12 | Modo de simulação (pesquisa) |
| 26 | `AUDIT_ONLY` | capitalAllocationGovernor.js:14 | Audit-only mode (pesquisa) |
| 27 | `ODDS_API_KEY` | sportsDataIngestor.js:4 | API key para odds esportivas |

**29 variáveis** são lidas no código mas **não estão documentadas** no `.env.template`.

---

## 4. Config Drift

### 4.1 Defaults inconsistentes entre arquivos

| Variável | streamEngine.js | experimentManager.js | .env.template |
|----------|:---------------:|:--------------------:|:-------------:|
| `RESIDUAL_CONSENSUS_LIMIT` | `'0.1'` | `'0.0'` | `0.1` |
| `DISABLED_PROVIDERS` | `'v1,v3'` | `''` | *(missing)* |
| `CCLIST_LETHAL_ILLUSION_LIMIT` | `'0.9'` | `'0.9'` | `0.9` (ok) |
| `PORT` | — | — | `7860` (server.js), `3002` (v1_fast/server.js), `3003` (v2_deep/server.js) |

**Problema**: `RESIDUAL_CONSENSUS_LIMIT` default é `0.1` no streamEngine e `0.0` no experimentManager. Isso faz com que o experimentManager colete config diferente do runtime real.

### 4.2 `.env` atual vs `.env.template`

O `.env` atual contém **apenas tokens** (GITHUB_TOKEN, HF_TOKEN, etc.) e **nenhuma** das variáveis operacionais do `.env.template`. Na prática, o sistema roda **exclusivamente com defaults** — exceto quando executa via Docker/HF Spaces com secrets configurados.

### 4.3 `.env.exp-*` vs `.env.template`

Os arquivos `.env.exp-*` incluem **apenas as variáveis de relaxamento** (13 vars) — faltam `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `MOL_STABILIZATION_WINDOW_MS`. Para deploy real, seria necessário configurar secrets separadamente no HF Spaces.

### 4.4 `CCLIST_LETHAL_LIMIT` vs `CCLIST_LETHAL_ILLUSION_LIMIT`

A documentação em `knowledge/configuration.md` referencia `CCLIST_LETHAL_LIMIT`, mas o nome real da variável é `CCLIST_LETHAL_ILLUSION_LIMIT`. Isso pode causar confusão.

---

## 5. Security-Sensitive Config

| Variável | Risco | Descrição |
|----------|-------|-----------|
| `BINANCE_API_KEY` | 🔴 **Crítico** | Chave de API da Binance (testnet ou live) |
| `BINANCE_API_SECRET` | 🔴 **Crítico** | Secret da API Binance |
| `LIVE_TRADING_ENABLED` | 🔴 **Crítico** | Se `true` e `ARL_MODE=LIVE`, executa ordens reais |
| `MAX_DAILY_CAPITAL` | 🟡 **Alto** | Limite de capital diário live |
| `ADMIN_API_KEY` | 🟡 **Alto** | Protege rotas de administração (/metrics, freeze, promote) |
| `TELEGRAM_BOT_TOKEN` | 🟡 **Alto** | Token de bot Telegram |
| `TELEGRAM_CHAT_ID` | 🟡 **Médio** | ID do chat Telegram |
| `ARL_MODE` | 🟡 **Alto** | `LIVE` ativa execução real |
| `GITHUB_TOKEN` (`.env`) | 🔴 **Crítico** | Hardcoded no `.env` — commitado no repositório! |
| `HF_TOKEN` (`.env`) | 🔴 **Crítico** | Hardcoded no `.env` — commitado no repositório! |
| `LEVERAGE` | 🟡 **Médio** | Alavancagem (experimentos) |
| `TAKE_PROFIT` / `STOP_LOSS` | 🟢 **Baixo** | Parâmetros de risco |

### 🚨 ACHADO CRÍTICO DE SEGURANÇA

O arquivo `lyzer edge/.env` (e sua cópia raiz `.env`) contém **tokens reais hardcoded**:

- `GITHUB_TOKEN=ghp_***REDACTED***`
- `HF_TOKEN=hf_***REDACTED***`

Estes tokens estão **commitados no git**. Além do risco de exposição, nenhum destes tokens é usado pelo runtime da aplicação — servem apenas para o script de deploy `deploy-experiments.ps1`. Recomenda-se:
1. Rotacionar imediatamente ambos os tokens
2. Remover do histórico git (ou usar `.gitignore` + `git filter-branch`)
3. Usar secrets do Hugging Face Spaces para configurar tokens de deploy

---

## 6. Recomendações

1. **Adicionar ao `.env.template`** todas as 29 variáveis undocumented (Seção 3). Prioridade: `TELEGRAM_*`, `ADMIN_API_KEY`, `DATA_DIR`, `PORT`, `DISABLED_PROVIDERS`, `SHADOW_TRADING_ENABLED`.

2. **Corrigir inconsistência** de default do `RESIDUAL_CONSENSUS_LIMIT` entre streamEngine.js (`0.1`) e experimentManager.js (`0.0`).

3. **Corrigir documentação**: `knowledge/configuration.md` usa `CCLIST_LETHAL_LIMIT` mas o nome real é `CCLIST_LETHAL_ILLUSION_LIMIT`.

4. **Remover tokens do `.env`** e mover para secrets do HF Spaces ou variáveis de ambiente do sistema.

5. **Adicionar validação de startup** para variáveis obrigatórias: `BINANCE_API_KEY`/`BINANCE_API_SECRET` quando `ARL_MODE=LIVE`.

6. **Feature flags** (`FEATURE_FILTER_H4_ALIGNMENT`, `FEATURE_FILTER_STRUCTURE_CONFLUENCE`) deveriam ser documentadas como variáveis de ambiente de pesquisa/replay, não como flags runtime globais (pois `smcFacade.js` as lê globalmente, e `replayEngine.js` as seta forçadamente).

---

## Appendix A: Mapa de Arquivos vs Variáveis

| Arquivo | Variáveis lidas |
|---------|-----------------|
| `lyzer edge/backend/server.js` | `PORT`, `ARL_MODE`, `LIVE_TRADING_ENABLED`, `MAX_DAILY_CAPITAL`, `ADMIN_API_KEY` |
| `lyzer edge/backend/streamEngine.js` | `TRG_THRESHOLD`, `TRG_EXPONENT`, `RESIDUAL_CONSENSUS_LIMIT`, `LHDS_VETO_LIMIT`, `ONTOLOGICAL_COLLAPSE_TRG`, `CCLIST_DVF_FLOOR`, `CCLIST_STRESS_ACCUMULATION`, `CCLIST_LETHAL_ILLUSION_LIMIT`, `CCLIST_STRESS_RELEASE`, `MOL_SCL_THRESHOLD`, `DISABLED_PROVIDERS`, `SHADOW_TRADING_ENABLED`, `ARL_MODE`, `MODE`, `LIVE_TRADING_ENABLED`, `MAX_DAILY_CAPITAL`, `NODE_ENV`, `VITEST`, `MOL_STABILIZATION_WINDOW_MS`, `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `SCALP_SL_PCT`, `SCALP_TP_PCT` |
| `lyzer edge/backend/telegram.js` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_API_URL`, `ARL_MODE` |
| `lyzer edge/backend/db.js` | `DATA_DIR`, `DB_PATH` |
| `lyzer edge/backend/statePersistence.js` | `DATA_DIR` |
| `lyzer edge/backend/migrateLegacy.js` | `DATA_DIR` |
| `lyzer edge/backend/experimentManager.js` | `TAKE_PROFIT`, `STOP_LOSS`, `LONG_ENABLED`, `SHORT_ENABLED`, `LEVERAGE`, `ACTIVE_SYMBOLS`, `ACTIVE_FILTERS`, `ACTIVE_MODELS`, `ARL_MODE`, `TIMEFRAME`, `TRG_THRESHOLD`, `RESIDUAL_CONSENSUS_LIMIT`, `CCLIST_LETHAL_ILLUSION_LIMIT`, `MOL_SCL_THRESHOLD`, `LHDS_VETO_LIMIT`, `ONTOLOGICAL_COLLAPSE_TRG`, `DISABLED_PROVIDERS` |
| `lyzer edge/backend/sports/sportsDataIngestor.js` | `ODDS_API_KEY` |
| `lyzer edge/backend/providers/v1_fast/streamEngine.js` | `ARL_MODE`, `MODE`, `BINANCE_API_KEY`, `BINANCE_API_SECRET` |
| `lyzer edge/backend/providers/v2_deep/streamEngine.js` | `ARL_MODE`, `MODE`, `BINANCE_API_KEY`, `BINANCE_API_SECRET` |
| `lyzer edge/backend/providers/v1_fast/server.js` | `PORT` |
| `lyzer edge/backend/providers/v2_deep/server.js` | `PORT` |
| `packages/lyzer-shared/src/smc/smcFacade.js` | `FEATURE_FILTER_H4_ALIGNMENT`, `FEATURE_FILTER_STRUCTURE_CONFLUENCE` |
| `packages/lyzer-shared/src/smc/replayEngine.js` | *(set)* `FEATURE_FILTER_H4_ALIGNMENT`, `FEATURE_FILTER_STRUCTURE_CONFLUENCE` |
| `packages/lyzer-shared/src/research/governance/decisionLedger.js` | `SIMULATION_MODE` |
| `packages/lyzer-shared/src/research/governance/capitalAllocationGovernor.js` | `AUDIT_ONLY` |
| `packages/lyzer-shared/src/research/operations/runL11Simulation.js` | *(set)* `SIMULATION_MODE` |
| `packages/lyzer-constitution/src/eca/killSwitch.js` | `NODE_ENV` |
| `lyzer edge/src/eca/killSwitch.js` | `NODE_ENV` |
| `lyzer edge/run_live_testnet.js` | *(set)* `ARL_MODE`, `LIVE_TRADING_ENABLED`, `MAX_DAILY_CAPITAL` |
| `lyzer edge/tests/verification/verify_*` | *(set)* `NODE_ENV` |

---

## Appendix B: Variáveis por Categoria

### Pipeline (Trading)
`TRG_THRESHOLD`, `TRG_EXPONENT`, `RESIDUAL_CONSENSUS_LIMIT`, `CCLIST_DVF_FLOOR`, `CCLIST_STRESS_ACCUMULATION`, `CCLIST_LETHAL_ILLUSION_LIMIT`, `CCLIST_STRESS_RELEASE`, `MOL_SCL_THRESHOLD`, `LHDS_VETO_LIMIT`, `ONTOLOGICAL_COLLAPSE_TRG`, `MOL_STABILIZATION_WINDOW_MS`, `DISABLED_PROVIDERS`, `SHADOW_TRADING_ENABLED`

### Exchange / Execução
`BINANCE_API_KEY`, `BINANCE_API_SECRET`, `ARL_MODE`, `LIVE_TRADING_ENABLED`, `MAX_DAILY_CAPITAL`, `SCALP_SL_PCT`, `SCALP_TP_PCT`, `MODE`

### Admin / Segurança
`ADMIN_API_KEY`, `PORT`

### Notificações
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_API_URL`

### Persistência
`DATA_DIR`, `DB_PATH`

### Quant Research Lab (Experiment Manager)
`TAKE_PROFIT`, `STOP_LOSS`, `LONG_ENABLED`, `SHORT_ENABLED`, `LEVERAGE`, `ACTIVE_SYMBOLS`, `ACTIVE_FILTERS`, `ACTIVE_MODELS`, `TIMEFRAME`

### Feature Flags (Replay)
`FEATURE_FILTER_H4_ALIGNMENT`, `FEATURE_FILTER_STRUCTURE_CONFLUENCE`

### Pesquisa / Simulação
`SIMULATION_MODE`, `AUDIT_ONLY`

### Subsystems
`ODDS_API_KEY` (sports data)

### Testes / Ambiente
`NODE_ENV`, `VITEST`

### Deploy (não lidos pelo runtime)
`GITHUB_TOKEN`, `Github_neww`, `HF_TOKEN`, `HF_LYZER`

---

*Audit gerado por Configuration Surface Analyst em 2026-07-27.*
