# Validation Layer Architecture

## Core Mandate
A Validation Layer (operacionalizada pelo *Validation Crucible*) é a guilhotina epistemológica do Lyzer Labs. Seu único propósito é destruir hipóteses fracas produzidas pela Discovery Layer, evitando que crenças estatisticamente infladas contaminem a ontologia organizacional.

**Axioma Operacional:** Sobreviver à validação não significa que a hipótese seja verdadeira. Significa apenas que ela falhou em morrer sob o estresse atual. O resultado da Validação nunca é o `Conhecimento`, mas sim a `Sobrevivência` temporária.

## Conceptual Framework

O fluxo cognitivo que atravessa o Crucible foi atualizado para conter a inflação de hipóteses (*Hypothesis Hoarding*):

1. **Hypothesis (Input)**:
   A submissão formal de uma causalidade e sua prova de nulidade, enviada pelo `Hypothesis Forge`.

2. **Destruction Suite**:
   Bateria de testes hostis sem capacidade de otimização de parâmetros. O objetivo da suite é tentar forçar a falha da hipótese através de:
   - *Monte Carlo Deflation* (Testes de randomização de série)
   - *Walk-Forward Analysis* (Degradação temporal out-of-sample)
   - *Inverted Logic Tests* (Testar o inverso para provar assimetria)
   - *Permutation Tests*

3. **Validation Outputs**:
   - `DESTROYED`: A hipótese falhou nos testes. Ela é enviada permanentemente ao `Hypothesis Graveyard`.
   - `REQUIRES_REPLICATION`: A hipótese falhou em morrer. Ela foi promovida à camada seguinte (*Replication Layer*), onde o fator tempo/mercado decidirá seu destino antes de se tornar conhecimento institucional.

## Pipeline Architecture

```text
[Discovery Layer: Pending Hypothesis]
                   │
                   ▼
        (Validation Crucible)
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  [Monte Carlo] [Walk-Fwd] [Inverted Logic] (Destruction Suite)
       │           │           │
       └───────────┼───────────┘
                   ▼
           (Survival Audit)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    [DESTROYED]    [REQUIRES_REPLICATION]
         │                   │
         ▼                   ▼
[Hypothesis Graveyard] [Replication Protocol]
                             │
                             ▼
                 [Institutional Knowledge]
```

## Governance Constraints

1. **No Confirmation:** O Validation Crucible não "confirma" teorias. Ele não devolve o status de `VALIDATED_KNOWLEDGE`. O máximo que ele concede é sobrevivência.
2. **Survivorship Bias Protection:** O `Hypothesis Graveyard` deve ser auditado regularmente. Ignorar as hipóteses destruídas causa distorção de percepção de sucesso no longo prazo.
3. **No Optimization in Flight:** Hipóteses não podem ter hiperparâmetros ajustados durante a passagem pelo Crucible para forçar sobrevivência. Se falhar na configuração de entrada, a hipótese é destruída.
