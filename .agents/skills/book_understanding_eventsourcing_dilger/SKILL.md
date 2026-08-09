---
name: book-understanding-eventsourcing-dilger
description: Toolkit extraído de Understanding Eventsourcing, focado na mecânica pura e Causal Memory.
domain: Event Sourcing
priority: P2
---

# Understanding Eventsourcing (Dilger)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Understanding Eventsourcing* (Dilger, 2025).
2. **Domínio Principal**: Implementação técnica de Event Sourcing, Projeções, Sagas e CQRS.
3. **Prioridade**: **P2** (Complementa o material do Hoffman com foco pragmático e mecânico para refatorar o monolito Node.js).
4. **Depth**: `reference` (Checklists imediatos de implementação).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **Event Sourcing como Persistência Causal (Causal Memory)**: A única fonte de verdade é a linha do tempo de eventos passados. Qualquer estado (tabela, cache) é apenas uma *Projeção* (Derivative/Materialization).
- **CQRS (Command Query Responsibility Segregation)**: A separação obrigatória entre quem executa a mudança (Command) e quem lê o estado (Query).

### 2. Regras de Decisão & Thresholds
- **Se a projeção estiver lenta para ser atualizada**, ENTÃO não bloqueie o usuário; utilize a consistência eventual com compensação UI ou sinalização por Websocket no Lyzer Edge.
- **Agregados Limitados**: Mantenha o tamanho do stream de um agregado pequeno. Ao passar de 10.000 eventos, aplique Snapshot.

### 3. Anti-Padrões (O que NUNCA fazer)
- **Shared Databases entre Serviços**: Se o Lyzer Edge fragmentar o monólito, os dados de eventos não devem ser lidos diretamente por outro serviço (use message brokers ou gRPC).
- **Tratamento de Exceções via Remoção de Evento**: NUNCA "Delete" um evento do stream se algo der errado; crie um evento de "Reversão" (Compensating Transaction).

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante Determinística**: Reaplicar todos os eventos do stream para uma nova projeção deve resultar SEMPRE no mesmo estado (Pós-Condição: Estado = F(Eventos)).

### 5. Checklists Operacionais
- [ ] A chave de versionamento otimista (`ExpectedVersion`) é verificada ao tentar salvar novos eventos no banco?
- [ ] O repositório Ciamarro1/Lyzer-Edge tem as tabelas segregadas entre "EventLog" e "ReadModels"?

## FASE 2 — Execution Directive
Adoção do CQRS no Lyzer Edge para separar a lógica de ingestão (`processCandle` -> Command) das views que o dashboard consome. Utilize versionamento otimista na inserção.
