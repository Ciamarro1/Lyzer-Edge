# ADR-031: Institutional Production & Knowledge Graph Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Com a consolidação do Kernel Cognitivo Distribuído (Fase 13), o Lyzer Edge obteve um maestro global (`CognitiveKernel`), um Event Bus desacoplado (`CognitiveEventBus`), injeção de dependências (`DependencyContainer`) e um pool de 6 workers paralelos (`WorkerPoolEngine`).

Porém, para operar em produção institucional contínua de alta frequência e resiliência, o sistema precisa:
1. Desacoplar conectores de corretoras através de uma **Exchange Abstraction Layer**.
2. Separar **Intenção** (`CommandBus`) de **Histórico/Fato** (`EventBus`) via CQRS.
3. Proteger conexões externas com **Circuit Breakers** contra instabilidades e timeouts.
4. Supervisionar a saúde do sistema com autorecuperação (**SystemHealthSupervisor**).
5. Gerenciar cadências temporais com um agendador dedicado (**CognitiveScheduler**).
6. Conectar todas as entidades cognitivas em um Grafo de Conhecimento Causal unificado (**CausalKnowledgeGraph**).

---

## Decision

Criar a camada **`src/institutional-production/`** contendo a **Fase 14 — Institutional Production & Knowledge Graph Architecture**.

### Arquitetura de Produção Institucional

```
                                  COGNITIVE KERNEL
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
       CognitiveCommandBus      CognitiveEventBus      CognitiveScheduler
       (CQRS Intention Bus)     (Event Sourcing Log)   (Multi-cadence Timers)
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         │
                                         ▼
                            CausalKnowledgeGraph
            (Regime → Feature → Hypothesis → Evidence → Genome → PnL)
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                            ▼                            ▼
   ExchangeAdapter            CircuitBreakerEngine         SystemHealthSupervisor
(Binance/Bybit/Mock)          (Isolation & Failure)        (Self-Healing & Monitor)
```

### Módulos Principais

1. **`ExchangeAdapter.js`**
   - Interface padronizada (`connect`, `subscribeMarketData`, `placeOrder`, `cancelOrder`, `getBalances`) com suporte a múltiplos adaptadores (`BinanceAdapter`, `BybitAdapter`, `KrakenAdapter`, `MockExchangeAdapter`).

2. **`CognitiveCommandBus.js`**
   - Implementação CQRS de barramento de comandos separado do Event Bus (`dispatchCommand`, `registerHandler`).

3. **`CircuitBreakerEngine.js`**
   - Implementa o padrão Circuit Breaker (`CLOSED`, `OPEN`, `HALF_OPEN`) para isolamento e resiliência em conectores de terceiros.

4. **`SystemHealthSupervisor.js`**
   - Monitor autônomo com auto-recuperação de workers, conectores e supervisão de filas/recursos.

5. **`CognitiveScheduler.js`**
   - Agendador dedicado de tarefas por cadência (Telemetry 10s, Portfolio 5m, Reflection 30m, Evolution 12h, Research 24h).

6. **`CausalKnowledgeGraph.js`**
   - Grafo unificado conectando a linhagem causal completa: Regimes $\to$ Features $\to$ Hipóteses $\to$ Experimentos $\to$ Evidências $\to$ Genomas $\to$ Alocação de Portfólio $\to$ Execuções $\to$ PnL.

7. **`InstitutionalProductionFacade` (`index.js`)**
   - Interface unificada de produção institucional.

---

## Consequences

### Positivas
- Isolamento total contra falhas em APIs de corretoras (Circuit Breakers + Mock Failover).
- Rastreabilidade bidirecional instantânea de qualquer execução até a hipótese científica de origem via Grafo de Conhecimento.
- Separação limpa entre intenções (`Commands`) e observações (`Events`).

### Negativas
- Maior número de abstrações de suporte (compensado pela alta resiliência e testabilidade).
