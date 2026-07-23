# ADR-030: Distributed Runtime & Cognitive Kernel Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Após a conclusão das Fases 5 a 12, o Lyzer Edge desenvolveu um pipeline sofisticado de 12 áreas funcionais:
- Memória Causal & Persistência (Fase 5)
- Aprendizado & Metacognição (Fase 6 & 6.6)
- Governança Evolutiva & Sandbox (Fase 7)
- Inteligência de Mercado & Hipóteses (Fase 8)
- Validação Empírica & Significância Estatística (Fase 9)
- Inteligência de Portfólio & CAS (Fase 10)
- Ecologia de Mercado & MAS (Fase 11)
- Operações Cognitivas, GCHI & Tracing (Fase 12)

Porém, faltava um **Maestro Global (Cognitive Kernel)** responsável por orquestrar a execução, além de um **Event Bus** desacoplado, um container de **Injeção de Dependências (DI)** e um **Worker Pool Distribuído** para isolamento de carga de trabalho.

### Problema

> "Sem um Maestro central e um Event Bus desacoplado, motores especializados instanciam dependências diretamente, criando acoplamento rígido e impedindo a escalabilidade distribuída em clusters."

---

## Decision

Criar a camada **`src/distributed-runtime/`** contendo a **Fase 13 — Distributed Runtime & Cognitive Kernel Architecture**.

### Arquitetura do Kernel Cognitivo Distribuído

```
                               COGNITIVE KERNEL
                           (Global System Maestro)
                                      │
                                      ▼
                        DependencyContainer (DI / Plugin SDK)
                                      │
                                      ▼
                           CognitiveEventBus
                   (Decoupled Event Sourcing Backbone)
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
   MarketWorker                 ResearchWorker                ReflectionWorker
        │                             │                             │
        ▼                             ▼                             ▼
EvolutionWorker               ValidationWorker              ExecutionWorker
                                      │
                                      ▼
                              WorkerPoolEngine
                   (Cluster Parallelism & Health Manager)
```

### Módulos Principais

1. **`CognitiveKernel.js`**
   - O Maestro Global do Lyzer Edge. Controla a inicialização, o ciclo de vida dos workers, dispara os pipelines na sequência causal correta e gerencia a recuperação de falhas.

2. **`CognitiveEventBus.js`**
   - Backbone de mensageria assíncrono baseado em Event Sourcing (`publish`, `subscribe`, `replay`, `getEventHistory`).

3. **`DependencyContainer.js`**
   - Container de Injeção de Dependências (DI) leve para resolução dinâmica de módulos, suporte a Mocks, Plugins e Hot-Swap.

4. **`WorkerPoolEngine.js`**
   - Gerenciador de workers especializados em paralelo (`MarketWorker`, `ResearchWorker`, `ReflectionWorker`, `EvolutionWorker`, `ValidationWorker`, `ExecutionWorker`).

5. **`DistributedRuntimeFacade` (`index.js`)**
   - Interface unificada de execução do runtime distribuído.

---

## Consequences

### Positivas
- Desacoplamento total entre componentes usando Event Bus e Injeção de Dependências.
- Execução paralela de simulações e validações sem bloquear o loop principal de mercado.
- Rastreabilidade imutável de eventos no nível de infraestrutura.

### Negativas
- Leve sobrecarga de serialização de eventos entre workers (mitigado por workers em memória e comunicação por eventos assíncronos).
