# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Migração `ADD COLUMN` idempotente para snapshot de experimento — agora persiste **métricas reais** em vez de placeholder (`experimentManager.js`, `db.js`). Segura para re-execução.

### Changed

- **`LIVE_TRADING_ENABLED` default agora é `'false'`** — live trading passou a ser **opt-in**. Banner informa o estado no boot (`server.js`).
- **Contrato snake_case canônico no MicrostructureDampener** — `epistemic_authority` e `reason_codes[0]` como campos canônicos entre `streamEngine.js` e `packages/lyzer-shared/src/engine/MicrostructureDampener.js`.
- **MOL normalizada e reativada** — `epistemic_authority`/`reason_codes` lidos de `requestPayload ?? rawState`; `scale_divergence` de `raw_metrics`. A Meta-Observation Layer voltou a operar e **agora pode bloquear trades** (modo RECOVERY, 20 ticks) — comportamento novo intencional (`packages/lyzer-constitution/src/eca/court.js`).

### Fixed

- **`releaseDailyCapital()`** — `dailyCapitalUsed` agora é **decrementado no fechamento de posição**, corrigindo contabilização de capital diário (`streamEngine.js`, `server.js`).
- **Providers desabilitados não executam mais `reconstruct()`** (`streamEngine.js`).
- **Hang do endpoint `alpha-discovery` eliminado** — callback async convertido para `.then/.catch` (`alphaDiscoveryEngine.js`).

### Security

- **`COURT_SECRET_KEY` obrigatória** — fallback hardcoded removido; `server.js` falha no boot (`fail-fast`) sem a variável de ambiente (`packages/lyzer-constitution/src/eca/permission.js`, `server.js`).
- **Admin key somente via headers** — `x-admin-key` ou `Authorization: Bearer`. `?adminKey=` em query string **não funciona mais** (`server.js`).
- **Auth obrigatória em endpoints sensíveis** — `/api/trades/export` e `/api/test-telegram` agora exigem autenticação (`server.js`).
