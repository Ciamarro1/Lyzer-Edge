---
name: book-distributed-systems-burns
description: Toolkit extraído de Designing Distributed Systems, focado no hardening do monólito através de sidecars e circuitos fechados.
domain: Distributed Systems & Architecture
priority: P1
---

# Designing Distributed Systems, 2nd Ed (Burns)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Designing Distributed Systems, 2nd Edition* (Brendan Burns, 202X).
2. **Domínio Principal**: Hardening do Monólito, Padrões Distribuídos (Sidecar, Ambassador, Adapter), Tolerância a Falhas.
3. **Prioridade**: **P1** (Essencial para preparar o monólito Lyzer Edge para eventual fragmentação e proteger o Core).
4. **Depth**: `study` (Padrões de design arquitetural para infraestrutura e topologia).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **O Padrão Sidecar**: Para estender ou isolar um monólito, não adicione lógicas pesadas (ex: Modelagem de Risco Python) ao processo principal Node.js. Coloque-as num Sidecar que vive na mesma rede/host mas não derruba a thread principal.
- **Circuit Breaker Pattern**: Fundamental para preservar a sobrevivência (Sobrevivência > Governança) quando subsistemas, como um feed externo de Candles, caem ou começam a enviar *bad data*.

### 2. Regras de Decisão & Thresholds
- **Se um serviço dependente começar a falhar (timeout ou erro de conexão)**, ENTÃO o Circuit Breaker deve desarmar a integração após `X` falhas, prevenindo *cascading failures* no Lyzer Edge.
- **Rate Limiting Threshold**: O processCandle deve estrangular (Throttle) se o volume de eventos exceder a capacidade de processamento do TRG.

### 3. Anti-Padrões (O que NUNCA fazer)
- **Shared In-Memory State across Nodes**: Se o Lyzer Edge escalar para mais de uma instância Node.js, nunca use variáveis globais em memória. A única ponte de estado deve ser a persistência Causal (Event Store).
- **Hardcoding Endpoints**: Usar Service Discovery e padronizar conectividade (Ambassador pattern) para falar com APIs de Exchange.

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante de Isolamento de Falhas**: Um *panic* ou *OOM (Out of Memory)* no módulo quantitativo em Python não deve afetar a ingestão de mercado no monólito principal.

### 5. Checklists Operacionais
- [ ] O Circuit Breaker no ingestion loop desarma graciosamente?
- [ ] A camada de log causal está centralizada o suficiente para atuar como *single source of truth* para todos os nós (Sidecars)?

## FASE 2 — Execution Directive
A separação arquitetural das camadas no Lyzer Edge deve usar o padrão Sidecar para processamentos computacionalmente intensivos (ex: scripts do TRG em Python chamados pela Constitutional Court).
