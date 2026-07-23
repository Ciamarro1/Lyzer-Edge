# ADR-032: Autonomous Quant Research Lab & Economic Decision Layer Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Com a conclusão da Produção Institucional e do Grafo de Conhecimento Causal (Fase 14), o Lyzer Edge obteve resiliência, abstração de corretoras, CQRS, supervisão autônoma e rastreabilidade total de linhagem causal.

Porém, faltava uma camada econômica de decisão de pesquisa:
1. **"Vale a pena gastar CPU/tempo neste experimento?"**
2. **"Qual hipótese gera o maior Valor Esperado da Informação (Expected Value of Information - EVI)?"**
3. **"Onde estão as maiores lacunas de conhecimento no Grafo Causal?"**

### Problema

> "Pesquisar hipóteses sem considerar o custo computacional e o retorno esperado de informação gera desperdício de CPU/RAM e desacelera a descoberta dos melhores alphas."

---

## Decision

Criar a camada **`src/autonomous-research/`** contendo a **Fase 15 — Autonomous Quant Research Lab & Economic Decision Layer Architecture**.

### Arquitetura do Laboratório de Pesquisa Autônomo

```
                        AUTONOMOUS RESEARCH DIRECTOR
                      (Scientific & Resource Director)
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
KnowledgeGapDetector        ExpectedValueInfoEngine     ScientificBacklogManager
(Queries Causal Graph)       (EVI & Resource Budget)      (EVI-ranked Backlog)
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
                                      ▼
                          ResearchPublicationEngine
                   (Internal Papers & Peer Review Log)
```

### Módulos Principais

1. **`KnowledgeGapDetector.js`**
   - Interroga o Grafo de Conhecimento Causal (Fase 14) para identificar nós com pouca evidência, regimes mal compreendidos e parâmetros com alta incerteza.

2. **`ExpectedValueInfoEngine.js`** (EVI Engine)
   - Calcula o **Valor Esperado da Informação (EVI)** e o retorno computacional (Alpha Gain / CPU Cost Unit) para priorizar experimentos de alto valor.

3. **`ScientificBacklogManager.js`**
   - Gerencia o backlog científico ranqueado por EVI e aloca o orçamento de computação (tempo de CPU, limite de threads, cota de memória).

4. **`ResearchPublicationEngine.js`**
   - Gera publicações científicas internas imutáveis (papéis científicos com premissa, metodologia, p-valor, CI de 95% e veredito final).

5. **`AutonomousResearchDirector.js`**
   - O Diretor de Pesquisa Autônomo. Orquestra ciclos de descoberta, triagem de lacunas, agendamento de experimentos por EVI e publicação interna de descobertas.

6. **`AutonomousResearchFacade` (`index.js`)**
   - Interface unificada do laboratório de pesquisa autônomo.

---

## Consequences

### Positivas
- Alocação eficiente de recursos computacionais baseada no valor esperado de informação (EVI).
- O sistema deixa de ser reativo e passa a direcionar proativamente sua própria agenda de pesquisa científica.
- Documentação e publicações internas automáticas de todas as descobertas quantitativas.

### Negativas
- Requer amostragem e cálculo de incerteza estatística no Grafo de Conhecimento (compensado por consultas de grafo indexadas).
