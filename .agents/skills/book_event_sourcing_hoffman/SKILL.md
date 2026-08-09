---
name: book-event-sourcing-hoffman
description: Toolkit extraído de Real-World Event Sourcing, focado em Padrões de Event Sourcing em Produção no Lyzer Edge.
domain: Event Sourcing & Architecture
priority: P1
---

# Real-World Event Sourcing (Hoffman)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Real-World Event Sourcing* (Kevin Hoffman, 2025).
2. **Domínio Principal**: Event Sourcing em produção, Projeções Assíncronas, Ledger Efêmero, Modelagem de Comandos e Eventos.
3. **Prioridade**: **P1** (Essencial para resolver gaps críticos do Lyzer Edge sobre concorrência e o design do ledger efêmero).
4. **Depth**: `study` (Aplicabilidade direta no pipeline de 7 camadas, focando em robustez de throughput).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **Comandos vs. Eventos**: Comandos expressam uma intenção e podem ser rejeitados. Eventos representam fatos irreversíveis ocorridos no passado. O sistema deve ser desenhado em torno do Log de Eventos.
- **Snapshotting**: Usado apenas como otimização de leitura, nunca como a fonte primária da verdade.

### 2. Regras de Decisão & Thresholds
- **Se houver contenção em um agregado**, ENTÃO limite as transações ao escopo desse único agregado e use filas assíncronas para efeitos colaterais (Saga Pattern).
- **ProcessCandle Threshold**: As atualizações não devem ser in-place; todo candle-tick gera um evento derivado.

### 3. Anti-Padrões (O que NUNCA fazer)
- **O Anti-Padrão CRUD**: Misturar lógicas de validação de comandos com lógicas de atualização de estado em banco de dados destrutivo.
- **NUNCA** mude o schema de um evento já publicado. Aplique "Upcasting" na camada de leitura/hidratação.

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante Append-Only**: O Ledger é imutável. Um evento comitado não pode ser alterado sob NENHUMA hipótese.
- **Invariante de Retentativa**: EventHandlers devem ser idempotentes para lidar com deduplicação natural (at-least-once delivery).

### 5. Checklists Operacionais
- [ ] O `processCandle` publica um fato irreversível antes de atualizar a visualização?
- [ ] Os consumidores de eventos são tolerantes a falhas e podem fazer *replay* do stream do zero?

## FASE 2 — Execution Directive
Qualquer refatoração na Constitutional Court deve adotar o princípio Append-Only deste toolkit. Eventos são a base da Causal Memory do Lyzer Edge.
