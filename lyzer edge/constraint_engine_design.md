# Constraint Engine Design

## Objetivo

A **Constraint Engine** é a camada arquitetural responsável por decodificar as "Hard Anchors" (Infrastructure e Execution) em um estado binário e irrefutável de viabilidade operacional. O seu propósito principal é assegurar que restrições absolutas (fatos incapacitantes) não sejam diluídas na forma de "divergência" ou probabilidades pelo RDX Engine.

## Diferenciação: Divergência vs Restrição

*   **Divergência (RDX):** "Minhas predições estão perdendo assertividade. O mercado mudou." (Medida em grau: `[0.0, 1.0]`)
*   **Restrição (Constraint):** "A corretora está fora do ar." (Medida binária: `VETO = TRUE`)

Não se trata de medir se o modelo interno está alinhado com o mercado externo, mas se o mercado externo e sua infraestrutura física sequer permitem que o sistema exista.

## Pipeline Lógico

```text
Anchor Registry (Infrastructure & Execution)
       ↓
Constraint Engine
       ↓
Output: { state: "CRITICAL", veto: true, reason: "API_DOWN" }
       ↓
Veto Engine (Force confidence = 0)
```

## Regras de Transição de Estado

A Constraint Engine processará um loop síncrono ou contínuo avaliando os dados do Registry e emitirá estados:

1.  **HEALTHY**: Todas as conexões ativas, *feed* contínuo, latência e *slippage* dentro dos limites hardcodeados. `veto: false`
2.  **CRITICAL**: Limites físicos estourados. Ex: *Exchange Offline*, limite de rejeições API estourado. `veto: true`

A Constraint Engine tem autoridade máxima. Se ela retornar `veto: true`, o output do RDX Engine deve ser sumariamente ignorado pelo Veto Engine.
