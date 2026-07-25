# RED TEAM FAILURE CATALOG
**Date:** Julho 2026

Documento que lista todas as vulnerabilidades e formas de quebrar o modelo que o Red Team identificou ao longo das execuções na Fase L6.3 (Ablation e Epistemological Attacks).

## Vulnerabilidades Catalogadas
1. **Ataque Epistemológico (Remover V4, SMC Only):** Sharpe colapsa de 1.95 para 0.4. O modelo do SMC atua basicamente comprando ruído nos fundos, dependendo do V4 para filtrar mais de 70% das entradas.
2. **Ataque Epistemológico (Remover SMC, V4 Only):** Sharpe colapsa para 0.1. O V4 identifica a causalidade do fluxo, mas sem a geometria do SMC, a entrada falha nas métricas de risco/retorno (stop impreciso).
3. **Ataque Epistemológico (Remover ambos - Noise):** O ruído puro gerou retorno negativo, provando que não há viés long no backtest (drift cego).
4. **Regime Mutation (Shuffling Temporal):** Sistema parou de atuar imediatamente. O bloqueio "Markov Regime Transition" detectou mudança irregular e cortou as operações. (Vulnerabilidade Mitigada).
5. **Spread x5 (Custos Extremos):** O PnL é violentamente comprimido em quase 60%, embora o Sharpe se segure acima de 1.2. O modelo é muito suscetível a spreads em corretoras de baixa liquidez.
