# Reality Divergence Model (RDX)

O RDX (Reality Divergence Index) é o principal output do ECA. Ele quantifica a discrepância entre o modelo interno de mercado (as convicções sistêmicas do Lyzer) e a realidade externa manifestada pelas âncoras (Market, Constraint, Meta).

Um único escalar destruiria informação e dificultaria a correta atribuição causal das falhas (por exemplo, diferenciar uma mudança estrutural de preço de uma latência inaceitável). Portanto, o RDX adota um modelo vetorial.

## O Vetor RDX

O sistema acompanha quatro componentes principais que compõem o **RDX Vector**, todos mapeados no intervalo `[0.0, 1.0]`, onde `0.0` significa aderência perfeita à realidade e `1.0` significa divergência absoluta.

1. **`RDX_market`**
   - Mede a divergência entre a expectativa de comportamento dos agentes (fluxo, volume, reversão) e os dados brutos da *Trade Tape* e *Order Book*.
2. **`RDX_execution`**
   - Mede a divergência de eficácia de entrada e saída (Slippage previsto vs real, fill rate, rejeições).
3. **`RDX_infrastructure`**
   - Mede a divergência estrutural (Latência da API, estabilidade do servidor da exchange, data freshness).
4. **`RDX_causal`**
   - Mede a divergência epistemológica (*Counterfactual Validity Score*, sobrevivência de predições, deterioração preditiva).

## O Global RDX

A agregação dos componentes vetoriais em um número direcional para triggers rápidos é o **Global RDX**.
Em vez de uma média simples, o Global RDX deve penalizar severamente (MAX) os componentes de infraestrutura e execução, garantindo a proteção primária do Axioma 1 (Realidade tem veto).

*Proposta de Cálculo Inicial:*
`Global RDX = max(RDX_infrastructure, RDX_execution, weight_avg(RDX_market, RDX_causal))`

## Zonamento de Risco e Intervenção

O RDX orienta diretamente a modulação da confiança e a atividade do sistema com limites fixos de intervenção:

### 1. `0.00 - 0.20` | HEALTHY
*   **Ação:** Nenhuma intervenção.
*   **Permissão:** Otimizações autônomas, escalada de sizing, refatoração sistêmica.
*   **Confiança:** Fluida pelo Kernel.

### 2. `0.20 - 0.40` | MONITOR
*   **Ação:** Acúmulo cautelar de evidências.
*   **Permissão:** Redução preventiva da janela de memória (horizonte mais curto).
*   **Confiança:** O teto de confiança é capado em 0.80.

### 3. `0.40 - 0.60` | WARNING
*   **Ação:** Congelamento imediato de refatorações (Release 1.8 bloqueada temporariamente).
*   **Permissão:** Apenas operações em paper-trading ou posições já abertas. Aumento forçado da exploração.
*   **Confiança:** Degradação forçada pelo ECA. Teto de 0.50.

### 4. `0.60 - 1.00` | CRITICAL
*   **Ação:** Kill Switch Epistêmico.
*   **Permissão:** Falso absoluto. Todas as instâncias de trading abortadas (liquidate only). O FMC (Failure Mode Classifier) é acionado via prioridade zero.
*   **Confiança:** Reduzida a 0. O sistema é considerado estruturalmente alucinado.
