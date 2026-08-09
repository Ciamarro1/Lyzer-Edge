---
name: book-data-intensive
description: Toolkit extraído de Designing Data-Intensive Applications, focado em Causal Memory, Consistência e Tolerância a Falhas no Lyzer Edge.
domain: Data-Intensive Systems
priority: P0
---

# Designing Data-Intensive Applications (Kleppmann)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Designing Data-Intensive Applications* (Martin Kleppmann, 2017/2026).
2. **Domínio Principal**: Engenharia de Dados, Consistência Distribuída, Replicação, Transações, Modelagem de Cauda Moderna e Ledger Efêmero.
3. **Prioridade**: **P0** (Essencial para resolver gaps críticos do Lyzer Edge, especificamente "ledger efêmero" e "complexidade cognitiva de concorrência").
4. **Depth**: `study` (Aplicabilidade direta e profunda para resolver invariantes arquiteturais no pipeline de 7 camadas).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

Este toolkit foi compilado NÃO como um resumo, mas como um arsenal de regras e limites para serem aplicados no desenvolvimento do monólito sofisticado Lyzer Edge, em particular seu *TruthKernel* e a *Constitutional Court*.

### 1. Frameworks Nomeados & Mental Models
- **Sistemas Reativos e Orientados a Eventos (Causal Memory)**: O fluxo de dados deve ser tratado como um log imutável de eventos ordenados. A memória causal permite reprodução determinística (Residualization).
- **Consistência vs. Disponibilidade (Teorema CAP pragmático)**: No Lyzer Edge, a Constitutional Court exige Consistência Linearizável para validação de invariants, enquanto as views de leitura podem aceitar Consistência Eventual.
- **Isolamento de Transações (SSI - Serializable Snapshot Isolation)**: Fundamental para prevenir *write skew* (distorção de escrita) em operações financeiras (ex: processCandle).

### 2. Regras de Decisão & Thresholds
- **Se a operação for destrutiva/mutação de estado financeiro**, ENTÃO use um log append-only (Ledger) antes de projetar nas tabelas de leitura.
- **Se o throughput de leitura dominar**, ENTÃO crie materializações derivadas assincronamente através de Event Sourcing.
- **Threshold de Latência (Tail Latency)**: Sempre monitore e otimize para o percentil 99.9 (p999), e não para médias, ao lidar com feeds de mercado rápidos.

### 3. Anti-Padrões (O que NUNCA fazer)
- **NUNCA** atualizar um registro financeiro "in-place" se isso destruir o histórico de como esse estado foi alcançado (violação da persistência causal).
- **NUNCA** assumir que a rede é confiável. Sempre implementar timeouts, retries com *exponential backoff* e *jitter* (vital para o TRG).
- **NUNCA** assumir que o relógio do sistema (NTP) está perfeitamente sincronizado para ordenação de eventos. Use relógios lógicos (Lamport, Vector Clocks) para causalidade.

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante Causal**: Se o Evento A causou o Evento B, A deve ser processado antes de B em todas as réplicas ou views (Court).
- **Invariante de Imutabilidade**: Um evento no Ledger, uma vez comitado, nunca pode ser alterado ou apagado.

### 5. Checklists Operacionais (Hardening do Monólito)
- [ ] O fluxo de `processCandle` garante idempotência caso a mesma mensagem chegue duas vezes?
- [ ] A arquitetura do banco suporta degradação graciosa caso a persistência principal falhe?
- [ ] Os índices de leitura estão desacoplados da escrita principal (CQRS)?

## FASE 2 — Execution Directive
A aplicação destas regras ao Lyzer Edge exige refatorar o `processCandle` isolando o efeito colateral num Event Log puro. Consulte os arquivos locais (`patterns.md`, `cheatsheet.md`) durante a implementação.
