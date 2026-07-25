# Architecture Decision Record (ADR): External Constraint Anchor (ECA)

## Context
A arquitetura do Lyzer, a partir da Release 1.7, atingiu um grau elevado de metacognição e capacidade de processamento causal. O sistema elabora hipóteses de mercado, refina inferências probabilísticas e gera um alto nível de autoconfiança (*Confidence*). Contudo, na ausência de uma restrição epistêmica externa forte, o sistema demonstrou risco substancial de entrar em ciclos de autojustificação estrutural (otimizando modelos para dados puramente simulados, isolados das falhas de infraestrutura, de preenchimento real ou da latência).

## Decision
Foi decidida a adoção do **External Constraint Anchor (ECA)**, introduzido na Release 1.7.5.

1. **Veto Epistêmico (Axiomas do ECA):** O ECA atuará como a autoridade epistemológica final sobre a confiança sistêmica. Fatos exógenos e constraints inegáveis da execução e da infraestrutura possuem autoridade para sobrepor (e vetar) inferências endógenas.
2. **Taxonomia Quadripartite de Âncoras:** O ECA avaliará a divergência sistêmica através de *Market Anchors*, *Execution Anchors*, *Infrastructure Anchors*, e *Meta Anchors*.
3. **Vetor RDX (Reality Divergence Index):** O índice de divergência não será um escalar simples. Para não destruir a precisão da atribuição de culpa no módulo causal (FMC/CIL), o RDX adotará um formato vetorial (`RDX_market`, `RDX_execution`, `RDX_infrastructure`, `RDX_causal`), permitindo ao sistema diagnosticar cirurgicamente o nível de atuação.

## Consequences

**Positivas:**
*   Bloqueia de antemão refatorações autônomas (Release 1.8) que poderiam ser danosas e isoladas da realidade da exchange e da rede.
*   Preserva o capital acionando *kill switches* precisos frente a degradações puramente técnicas (ex: downtime da corretora ou pico extremo de slippage).
*   Provê feedback contrafactual realístico (simulando a execução contra a profundidade verdadeira do book).

## Governance Rule
**"No subsystem may override an active ECA veto."**
Qualquer tentativa de ignorar, desabilitar, ou mascarar a intervenção do ECA por parte de módulos adaptativos (Release 1.8) ou do Kernel é estritamente proibida e classificada como uma quebra arquitetural crítica.

**Negativas/Riscos Mitigados:**
*   O cálculo rigoroso do RDX exigirá polling contínuo de dados operacionais que poderiam adicionar overhead ao event loop principal. *Mitigação: processamento assíncrono do ECA de modo desvinculado do processamento da microestrutura principal, reportando apenas na agregação.*
*   Métricas ruidosas da infraestrutura podem causar falsos *Critical Zones*. *Mitigação: suavização via agregação vetorial onde ruídos técnicos geram "Monitor" imediato, aguardando persistência para "Critical".*

## Status
**Proposed / Accepted** - Este ADR é a fundação da arquitetura base para o ciclo de desenvolvimento da Release 1.7.5.
