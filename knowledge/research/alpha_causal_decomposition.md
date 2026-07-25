# Alpha Causal Decomposition & Forensic Audit

**Data:** Julho 2026
**Autor:** Lyzer Orchestrator (L4 Critical Mission)
**Módulos Analisados:** `SMC Facade` (v1/core) e `V4 IMCE`

## 1. O Mecanismo Causal do Alfa

Após a remoção cirúrgica dos provedores estocásticos (V3) e clones descalibrados (V1), o núcleo causal do Lyzer Edge foi isolado no eixo **SMC + V4 IMCE**. 

O alfa gerado (Sharpe +4.01 em OOS) **não é derivado de momentum cego**, mas da exploração de deficiências de microestrutura e *liquidity harvesting* direcional.

### Como o SMC gera alfa?
O `smcFacade.js` atua primariamente como um motor de **Mean Reversion de curto prazo ancorado em Trend Following de longo prazo**.
- **O Fator Causal:** O mercado possui "bolsões" de ordens Stop Loss (Buy Side Liquidity / Sell Side Liquidity). Quando o mercado captura esses bolsões (`sweep.swept === 'SSL'`), ocorre uma exaustão temporária da força vendedora. 
- **Filtro H4:** O verdadeiro alfa do SMC provou-se condicionado à variável `FEATURE_FILTER_H4_ALIGNMENT`. O sweep só possui valor causal preditivo se estiver *a favor* da macro-tendência. O SMC filtra o ruído.

### Como o V4 IMCE gera alfa?
O `v4_imce.js` não é um gerador de sinal passivo; é uma Máquina de Estado Narrativa.
- **O Fator Causal:** O IMCE pergunta "O que aconteceu?" e "Para onde o preço quer ir?". Ele une o evento micro (Sweep + Market Structure Shift) com a probabilidade macro de expansão (ATR).
- **Vantagem Independente:** O V4 gera alfa independente através da sua amarração com o `MarketStateEngine`. Ele **só** permite *executionScore* máximo em estados de `EXPANSION` ou `STOP_HUNT`. Ele não opera a lateralidade. 

## 2. Complementaridade vs Redundância

Existe redundância oculta?
**Não mais.** Antes, o V1 e o SMC competiam com os mesmos parâmetros fractais, causando "eco" (sinais duplicados falsificando a convicção do kernel). Agora:
- **SMC** cuida da topologia estrutural (Fractais, BOS, CHOCH, Zonas).
- **V4 IMCE** cuida da convergência narrativa (Momento exato da quebra estrutural dentro de um regime de volatilidade permissivo).

## 3. Risco de Overfitting e Dependência de Regime

- **Overfitting de Parâmetros:** O risco de overfitting no núcleo atual é **BAIXO**, pois ambos os algoritmos são "Scale-Invariant" (Invariantes de Escala). Eles usam *Price Action* puro (Highs/Lows) e multiplicadores de ATR em vez de thresholds fixos arbitrários (como o V3 usava RSI > 65).
- **Dependência de Regime:** O alfa atual possui forte dependência direcional. Ele lucra de forma assimétrica em `EXPANSION` e sofre erosão (whipsaw) em `CHOPPY_RANGING`.

## Conclusão da Fase 1
O alfa do Lyzer Edge é real, causalmente rastreável e baseado em microestrutura de liquidez. O ponto fraco sistêmico identificado é a **ausência de um Veto explícito de Regime no roteamento de ordens**, que será solucionado na Fase 2 com o Regime Robustness Engine.
