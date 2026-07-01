# Architecture Decision Record (ADR): Institutional Memory Layer (IML)

## Context
O ecossistema cognitivo do Lyzer Labs evoluiu substancialmente. Temos a proteção da realidade (ECA - 1.7.5), a integridade do significado (SIL - 1.7.6) e a governança das mudanças semânticas (SGL - 1.7.7). Contudo, o Chief Intelligence Architect (CIA) observou que governança sem história gera a repetição de erros e abre margem para o **Semantic Revisionism** (reescrever o passado para justificar o presente).

Para que uma organização de inteligência sobreviva a múltiplas gerações de auto-modificação (Release 1.8), o significado precisa não apenas ser governado no momento presente, mas possuir uma continuidade histórica rastreável e auditável.

## Decision
Fica estabelecida a introdução da **Release 1.7.8 - Institutional Memory Layer (IML)** como a última barreira de proteção cognitiva antes da liberação da Refatoração Autônoma.

A IML introduzirá a preservação imutável da proveniência das decisões. Seus eixos conceituais são:

1. **Cognitive Versioning:**
   O significado não é sobrescrito, ele é versionado. (Ex: `Meaning v1`, `Meaning v2`). A versão atual do `Semantic Evolution Registry` passa a ser apenas o estado _HEAD_ de uma árvore histórica contínua.

2. **Decision Provenance:**
   Para toda Semantic Change Proposal (SCP) aprovada pela SGL, a IML deve armazenar obrigatoriamente:
   - *Quem autorizou a mudança?*
   - *Quando a mudança ocorreu?*
   - *Por que foi feita? (Justificativa estratégica/epistêmica)*
   - *Qual hipótese empírica amparou a decisão?*

3. **Semantic Lineage:**
   A capacidade estrutural de gerar uma árvore genealógica de um conceito. O sistema deve conseguir traçar, por exemplo, como `Risk` evoluiu desde a sua concepção básica até a sua definição atual mais avançada, preservando todas as ramificações e discussões passadas.

## Consequences

**Positivas:**
- Evita a **Governance Without Memory**, impedindo que a organização de inteligência debata e cometa os mesmos erros conceituais ciclicamente.
- Mitiga o risco de **Review Board Capture**, onde um grupo governante tenta alterar o propósito do sistema silenciosamente; todas as mutações terão uma impressão digital rastreável.
- Cria uma fundação de **Inteligência Histórica**, onde os próprios agentes (como o CIL e a Release 1.8) podem consultar falhas epistêmicas do passado antes de propor refatorações.

**Negativas/Riscos Mitigados:**
- A manutenção de uma "Blockchain Semântica" ou base de conhecimento imutável pode adicionar complexidade ao fluxo de desenvolvimento e aumentar a carga de armazenamento de metadados.
  *Mitigação:* A IML não precisará gravar transações milissegundo a milissegundo. O registro histórico foca apenas em *Mutações Semânticas*, que são raras, assíncronas e governadas. Armazenamento em arquivos de log versionados e imutáveis (ex: estrutura de `git commit` puramente para ontologia) será suficiente.

## Status
**Proposed** - Este ADR formaliza a fundação teórica da Release 1.7.8, fechando o ciclo de maturidade ontológica proposto pelo CIA. A Refatoração Autônoma (Release 1.8) continua bloqueada até que a implementação técnica completa do eixo 1.7.X seja concluída e auditada.
