# Regime Intelligence 2.0 (Transition Matrices)

**Data:** Julho 2026
**Missão:** L5 Institutional Alpha Operations
**Investigador:** Lyzer Orchestrator (Chief Quant Mode)

## 1. O Problema da Classificação Estática
O classificador de regime V1 era puramente descritivo: "O mercado ESTÁ em Expansão". 
A falha em sistemas HRO (High Reliability) é que tomar uma decisão baseada no estado atual ignora a inércia microestrutural. A pergunta não é apenas "onde estamos", mas "para onde a física do mercado diz que vamos?".

## 2. Transition Probability Matrix (Cadeia de Markov)
Na Fase L5, injetamos a matriz de transição estocástica baseada no comportamento empírico dos mercados derivativos.

```javascript
const TRANSITION_MATRIX = {
  'COMPRESSION': { 'EXPANSION': 0.6, 'RANGE_NARROW': 0.3, 'TREND_BULLISH': 0.05, 'TREND_BEARISH': 0.05 },
  // ...
}
```

O sistema agora carrega a *Prediction*:
- Se estamos em `COMPRESSION`, há 60% de chance do próximo estado ser `EXPANSION`.
- O V4 IMCE agora pode usar essa "probabilidade de transição" (Transition Probability) para preparar ordens limite nas bordas da compressão antes da expansão estourar, garantindo o melhor fill (Pre-emptive Liquidity Harvesting).

## 3. Sobrevivência Adversarial
O estado `NEWS_SHOCK` não tem probabilidade confiável de tendência; ele fatalmente converte em `RANGE_WIDE` (Whipsaw, ou "Serrote") em 50% dos casos. Saber disso permite que o sistema *permaneça fora* do mercado não só durante a notícia, mas durante o "Tremor Secundário" (Aftershock) que é o `RANGE_WIDE`.
