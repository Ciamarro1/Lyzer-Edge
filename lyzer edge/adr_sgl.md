# Architecture Decision Record (ADR): Semantic Governance Layer (SGL)

## Context
A arquitetura do Lyzer Labs avançou da Validação da Realidade (ECA - Release 1.7.5) para a Defesa do Significado (SIL - Release 1.7.6). Contudo, a análise do Chief Intelligence Architect (CIA) revelou uma lacuna epistêmica crítica: a SIL detecta a corrupção e a deriva do significado, mas não possui autoridade para deliberar sobre a **evolução legítima do significado**.

Para que a Release 1.8 (Autonomous Refactoring Engine) seja segura, o sistema não pode apenas barrar mutações; ele precisa de um framework que responda: *"A mudança semântica proposta é legítima? E quem a autorizou?"*

## Decision
Foi decidida a adoção da **Release 1.7.7 - Semantic Governance Layer (SGL)** como pré-requisito final antes da Refatoração Autônoma.

A SGL atuará como o comitê deliberativo e autoritativo sobre a Ontologia do Sistema, com os seguintes componentes conceituais:

1. **Semantic Change Proposal (SCP):** Todo módulo ou agente que tentar evoluir um conceito no `Semantic Evolution Registry` (ex: adicionar uma nova `Allowed Extension` para `Risk`) deverá submeter um SCP detalhado.
2. **Semantic Review Board:** O mecanismo de governança (podendo ser um agente orquestrador superior ou intervenção humana direta) que avalia o SCP.
3. **Meaning Impact Analysis:** Antes de aprovar um SCP, a SGL calculará o impacto em cascata dessa redefinição em todos os detectores operacionais (via *Semantic Anchor Interpreter - SAI*).
4. **Governance Escalation Hierarchy:** Níveis de autorização exigidos com base no escopo da mutação (Evolução Local vs. Evolução Global do Significado).

## Consequences

**Positivas:**
- Evita o **Dogmatismo (Semantic Registry Capture)**, criando uma via institucional para que a definição de sucesso evolua sem quebrar a intencionalidade original.
- Previne a **Ontology Fragmentation (Evolução Local)**, forçando toda redefinição a ser debatida e aprovada centralmente antes de ser adotada globalmente.
- Protege o sistema contra **Proxy Goal Capture**, garantindo que a intenção real por trás de métricas (como "Survival") não seja substituída silenciosamente.

**Negativas/Riscos Mitigados:**
- **Governance Paralysis:** Exigir aprovação para toda mínima mutação semântica pode engessar a Refatoração Autônoma.
  *Mitigação:* A SGL deve distinguir entre mutações críticas (alterações no *Core Meaning*) que exigem Lockdown/Intervenção Humana, e expansões triviais (novas *Allowed Extensions* inferidas corretamente) que podem ser aprovadas de forma assíncrona por um agente de governança superior.

## Status
**Proposed** - Este ADR formaliza a fundação teórica da Release 1.7.7, sob a diretiva expressa do CIA. A implementação estrutural da SGL só prosseguirá após o alinhamento definitivo deste documento.
