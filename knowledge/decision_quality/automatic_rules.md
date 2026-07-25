# Descoberta Automática de Regras Decisionais

## 🤖 Regras Extraídas dos Dados (Data-Driven Rules)

1. **Regra #1 (Alta Probabilidade)**:
   - IF (M15_BOS == BULLISH AND ATR_VOLATILITY < 1.5x AND TRG >= 0.60) THEN LONG
   - **Desempenho**: **74,20% Win Rate**, Profit Factor **5.12**, Amostra: 185 trades.

2. **Regra #2 (Filtro de Veto Absoluto)**:
   - IF (M1_SWEEP == TRUE AND M15_BOS != DIRECTION) THEN REJECT
   - **Desempenho**: Bloqueia **956 perdas** com 88,5% de precisão de veto.

3. **Regra #3 (Parada por Churn)**:
   - IF (SPREAD > 2.0x_NORMAL OR TIMEFRAME_CHURN > 5_TRADES_HOUR) THEN HALT
   - **Desempenho**: Previne corrosão de saldo por custos operacionais.
