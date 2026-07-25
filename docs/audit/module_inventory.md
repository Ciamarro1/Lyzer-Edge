# Auditoria Técnica — Module Inventory
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/module_inventory.md`

---

## 1. Inventário Detalhado dos Módulos do Sistema

### 1. Módulo Backend Express & Engine Server
- **Arquivos**: [server.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/server.js), [streamEngine.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/streamEngine.js), [liveDataIngestor.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/liveDataIngestor.js), [exchangeExecution.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/exchangeExecution.js)
- **Finalidade**: Gerenciar o servidor de produção, orquestrar instâncias de mercado por ativo e ingerir dados via WebSocket.
- **Maturidade**: Produção / Alta.
- **Complexidade**: Alta (759 LoC em `streamEngine.js`).
- **Riscos**: Singleton global compartilhando estado de configuração entre ativos.

### 2. Módulo de Reconstrução de Sinal (Providers V1/V2/V3)
- **Arquivos**: `packages/lyzer-shared/src/providers/v1_smc_ict.js`, `v2_snd_snr.js`, `v3_momentum_rsi.js`
- **Finalidade**: Reconstruir a narrativa de mercado sob 3 abordagens distintas (SMC/ICT, SnD/SNR e Momentum/RSI).
- **Maturidade**: Legado / Em substituição.
- **Riscos**: Lógica duplicada em relação à nova suíte SMC modular.

### 3. Suíte SMC Modular (`packages/lyzer-shared/src/smc/`)
- **Arquivos**: `timeframeManager.js`, `trendEngine.js`, `structureEngine.js`, `liquidityEngine.js`
- **Finalidade**: Processar a estrutura de mercado multi-timeframe de forma estritamente sem lookahead bias.
- **Maturidade**: Em desenvolvimento / Transição (Milestones 2 e 3).
- **Riscos**: Atualmente utilitário secundário para renderização de overlays em vez de motor primário no `streamEngine`.

### 4. Subsistema CSRL (Cross-Scale Reality Layer)
- **Arquivos**: `packages/lyzer-shared/src/csrl/` (`ScaleNormalizer.js`, `CrossScaleTensorGraph.js`, `InvariantExtractor.js`, `DivergenceDetector.js`)
- **Finalidade**: Construir a topologia de tensores multi-escala e extrair invariantes de mercado.
- **Maturidade**: Alta.
- **Complexidade**: Muito alta (matemática tensorial em JS puro).
- **Riscos**: Desempenho em alta frequência.

### 5. Corte Constitucional & ECA (`packages/lyzer-constitution/src/eca/`)
- **Arquivos**: [court.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/packages/lyzer-constitution/src/eca/court.js), [c-clist.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/packages/lyzer-constitution/src/eca/c-clist.js), [mol.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/packages/lyzer-constitution/src/eca/mol.js), `ledger.js`, `constraintEngine.js`
- **Finalidade**: Julgar a elegibilidade de execução, calcular o estresse de iludibilidade e registrar logs de auditoria imutáveis.
- **Maturidade**: Institucional / Alta.
- **Riscos**: Baixo risco técnico; modelo determinístico excelente.

### 6. Crates Rust Edge & Core (`src-rust/`, `lyzer-workspace/`, `lyzer edge/src-rust/`)
- **Arquivos**: `lyzer-risk-gateway`, `lyzer-intent-registry`, `lyzer-oms`, `lyzer-core-hub`
- **Finalidade**: Fornecer suporte de baixa latência para autorização de risco, event sourcing com UUIDv7 e gateway NATS.
- **Maturidade**: Alta.
- **Riscos**: Dependência de ferramentas externas de compilação (MinGW no Windows, `protoc`).
