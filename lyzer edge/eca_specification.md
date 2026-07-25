# ECA Conceptual Specification

A **External Constraint Anchor (ECA)** é o componente arquitetural responsável por impedir que o Lyzer opere em um estado de autojustificação estrutural, onde o sistema acredita excessivamente nas próprias predições a despeito da inviabilidade operacional ou falsificação fática do ambiente externo.

## Objetivos e Responsabilidades

1. **Reality Anchoring:** Coletar continuamente métricas indubitáveis do mundo real e contrastá-las com a percepção de estado do sistema.
2. **Confidence Vetoing:** Atuar como um limitador sobre a confiança gerada pelo *Truth Kernel*, pelo *Causal Intelligence Layer* (CIL) e pelo *Metacognition*. Se a realidade externa divergir, o ECA tem autoridade máxima para forçar a degradação da confiança e sinalizar falha estrutural.
3. **Execution Feasibility Verification:** Garantir que hipóteses de mercado corretas não sejam perseguidas caso as condições de infraestrutura ou execução (latência, rate limits, indisponibilidade da exchange) as tornem impossíveis.

## Limites do ECA

- **O ECA Não Prevê:** O ECA é um retrovisor e um detector de *ground truth*. Ele não infere para onde o preço vai nem modela o mercado.
- **O ECA Não Refatora:** O ECA não reescreve lógica. Quando o ECA detecta divergência, ele aciona o Failure Mode Classifier (FMC) ou restringe operações, deixando a refatoração autônoma (Release 1.8) atuar com base nesse limite de restrição.
- **Isolamento de Origem:** As métricas consumidas pelo ECA não podem derivar de inferências probabilísticas do sistema. O ECA deve consultar APIs de execução cruas e infraestrutura.

## Integração com a Arquitetura

O ECA situa-se acima da Microestrutura e abaixo da Tomada de Decisão:
*   Recebe contrafactuais do CIL para confrontar expectativas versus realidade.
*   Fornece o **Reality Divergence Index (RDX Vector)** para os módulos decisórios.
*   Tem poder de "Kill Switch" epistêmico: se o RDX for crítico, a confiança da hipótese vigente cai a zero.
