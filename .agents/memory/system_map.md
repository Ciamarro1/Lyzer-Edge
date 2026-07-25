---
type: knowledge
created: 2026-06-18
updated: 2026-06-18
---

# Lyzer Labs: Absolute System Map

Este documento serve para prevenir loops de re-desenvolvimento (reinventar a roda). O projeto é massivo e já contém a maior parte da infraestrutura necessária para operar.

## 1. O Kernel Cognitivo (Rust)
Localização: `lyzer-workspace/`

O motor de Governança, Memória e Arbitragem já foi construído em Rust. **Não crie novos servidores gRPC/ECA do zero.**
- `lyzer-core-models`: Contém as estruturas de dados fundamentais (InterpretationRecord, SurpriseRecord, etc).
- `lyzer-core-arbitration`: Contém o `Arbitrator`. Decide qual interpretação da realidade ganha.
- `lyzer-core-memory`: Contém o CML (Constitutional Memory Ledger). Grava o que foi rejeitado e o que falhou.
- `lyzer-core-governance`: Contém a `TruthAssessmentEngine`. Mede a divergência entre a Expectativa e a Realidade Empírica e gera Adaptações.
- `lyzer-core-hub`: O cérebro central (`main.rs`). Um servidor TCP/HTTP na porta `8080` que recebe os payloads do TS e orquestra o CML e a Governança.

## 2. A Camada de Execução e Mercado (TypeScript / JS)
Localização: `lyzer edge/lyzer edge/` (Atenção ao duplo nested).

A conexão com a Binance, WebSockets e REST APIs já existe. **Não instale CCXT ou crie clientes Binance do zero.**
- `backend/liveDataIngestor.js`: Conector WebSocket para a Binance (Kline stream) e fetcher de histórico. Lida com reconexão automática e state management.
- `backend/exchangeExecution.js`: Conector REST assinado (HMAC) para a Binance (Testnet e Live) para disparo de ordens Reais (`placeOrder`).
- `src-ts/scripts/first_blood/1_ingest_binance.ts`: Script pesado de batch download de histórico (BTCUSDT).
- `src-ts/capital/execution_engine.ts`: Simulador de atrito e slippage (Friction Realism).

## 3. Ambientes Antigos (Legado)
Localizações: `lyzer_edge_v1_batch_mode/`, `lyzer_edge_v2_crs_arch/`
Contêm código antigo de processamento batch e scripts de validação (`verify_fund_core.js`, Pine scripts). São usados como referência metodológica, mas não são o motor principal.

## 4. O Desafio Atual (O Gap Real)
A conexão não foi feita.
A `liveDataIngestor.js` (Mercado) não está alimentando o `lyzer-core-hub` (Cérebro).
O `lyzer-core-hub` (Cérebro) não está acionando o `exchangeExecution.js` (Músculo).

**Diretriz Operacional Absoluta:**
Qualquer novo plano de implementação para o mercado deve focar EXCLUSIVAMENTE em criar o *Pipeline/Bridge* (em HTTP ou NATS) que liga os módulos que já existem no `lyzer-workspace/` e `lyzer edge/lyzer edge/`. Nenhuma infraestrutura teórica nova deve ser construída.
