# Architecture Decision Record (ADR): Institutional Knowledge Layer (IKL)

## Context
A arquitetura do Lyzer Labs amadureceu substancialmente e concluiu o seu **Defensive Intelligence Stack** (ECA para realidade, SIL para significado, SGL para governança e IML para memória). Contudo, a governança da memória histórica provê apenas *rastreabilidade*, sem necessariamente garantir *aprendizado*. 

O Chief Intelligence Architect (CIA) observou que "IML lembra, IKL aprende. Sem IKL, a história apenas se acumula; com IKL, a história compõe (compounds)."

Para que a organização seja capaz de evoluir de forma inteligente e não apenas adaptativa, a transição para a Release 1.8 exige uma camada capaz de extrair padrões das decisões passadas e transformá-los em conhecimento reutilizável: a Institutional Knowledge Layer (IKL).

## Decision
Fica formalizada a **Release 1.7.9 - Institutional Knowledge Layer (IKL)** como o estágio definitivo da fundação cognitiva antes da Refatoração Autônoma.

O objetivo da IKL é garantir que futuros agentes possam responder ao "*por que essa evolução foi bem-sucedida?*" sem gerar burocracia excessiva ou acúmulo histórico passivo.

### Ontology Definition & Core Components

1. **Knowledge Extraction Engine:**
   Mecanismo analítico que varre o registro histórico da IML (as propostas de mudança semântica - SCPs) e extrai conclusões ativas. Ele transforma metadados passivos em inteligência estruturada.

2. **Decision Pattern Library:**
   Um catálogo de padrões heurísticos e operacionais que se provaram corretos ao longo das revisões semânticas. Ele responde: "Quais tipos de expansão do conceito de 'Risk' consistentemente protegem o capital na prática?"

3. **Governance Case Repository:**
   Jurisprudência institucional. Armazena precedentes de discussões da SGL, documentando por que certos *Corruptive Drifts* foram bloqueados e por que certas *Allowed Extensions* foram aprovadas.

4. **Failure Pattern Repository:**
   Registro explícito das classes de erros ontológicos e hipóteses falhas (ex: quando o sistema otimizou para 'Trade Volume' em vez de 'Alpha Real'). Evita que novos agentes repitam as ramificações de becos sem saída do passado.

5. **Assumption Registry:**
   Dicionário rastreável das premissas fundamentais da organização em um dado momento. As premissas têm prazo de validade epistêmico e devem ser sistematicamente revisitadas pela Refatoração Autônoma.

6. **Institutional Learning Graph:**
   Grafo de conhecimento relacional conectando Conceitos (SIL), Governança (SGL), Histórico (IML) e Resultados (ECA). Ele tangibiliza a inteligência organizacional na forma de uma estrutura navegável que sistemas autônomos podem consultar como oráculo.

## Consequences

**Positivas:**
- Transição de "Software Adaptativo" para "Inteligência Organizacional Composta".
- Evita o **Lineage Without Insight**, convertendo dados de proveniência de decisões (IML) em aprendizado preditivo (IKL).
- Facilita radicalmente a Release 1.8, pois o Autonomous Refactoring Engine terá acesso a um oráculo heurístico de sucesso e falha, reduzindo a necessidade de exploração estocástica cega.

**Negativas/Riscos Mitigados:**
- Risco de **Provenance Inflation** e **Cognitive Bureaucracy**, onde o processo de registro supera a geração de valor operacional.
  *Mitigação:* A Extração de Conhecimento deve operar primariamente em lote e assincronamente. A SGL atua no runtime crítico como firewall; a IKL atua fora da *hot path*, como um consolidador contínuo de aprendizado, sem impactar o *latency envelope* das operações de trading.

## Status
**Proposed** - Este ADR formaliza a fundação da Release 1.7.9 e a estruturação final do ecossistema de Inteligência Institucional. A implementação da Refatoração Autônoma permanece condicionada à validação holística deste documento e da esteira conceitual.
