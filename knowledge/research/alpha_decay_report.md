# Alpha Decay Analysis Report

**Data:** Julho 2026
**Missão:** L5 Institutional Alpha Operations
**Investigador:** Lyzer Orchestrator (Chief Quant Mode)

## 1. O Fenômeno de Degradação (Alpha Decay)
Nenhum Alpha quantitativo sobrevive para sempre. À medida que o mercado descobre a ineficiência (ou que o regime de mercado se altera macroeconomicamente), as janelas de assimetria que exploramos com o SMC + V4 se estreitam.

Se um modelo é estático, o Alpha decay destrói a conta.
Para evitar isso, criamos o **Alpha Half-Life Monitor**.

## 2. A "Meia-Vida" do Sinal (Signal Half-Life)
Medimos a meia-vida do alfa verificando a velocidade da degradação de três métricas usando uma janela deslizante (Rolling Window) temporal e de trades:
1. **Rolling Sharpe (30 dias / 100 trades):** Se a inclinação for negativa contínua.
2. **Rolling Expectancy (Expected Value):** Qual a média em PnL dos últimos N trades.
3. **Signal Decay Rate:** A correlação entre confiança e PnL (se 90% de confiança gerar loss frequente, a característica principal do sinal decaiu).

## 3. Investigação Específica do SMC + V4 IMCE
- O alfa atual funciona explorando quebra de estrutura (BOS) e captura de liquidez após absorção (Causality Expansion).
- **Quando deixa de funcionar?** Em mercados laterais de micro-distribuição (regimes estreitos de baixa volatilidade onde as *pools* de liquidez não estão definidas institucionalmente).
- **Quanto tempo até recalibrar?** As faixas ótimas para cripto costumam exigir recalibração dos tamanhos e distâncias da liquidez (Atr Multipliers) a cada mudança de ciclo macro (aprox. 3 a 6 meses). O monitor detectará essa degradação *antes* do drawdown ficar severo.

## 4. O Sistema de Monitoramento (Implementação)
O novo `AlphaDecayMonitor` (em `lyzer-shared/src/research/`) recebe streams dos fechamentos de trade.
- Ele calcula a regressão linear das últimas janelas de Sharpe.
- Quando o P-value da queda do Sharpe for significante estatisticamente, ele dispara um alerta vermelho (ALARM_DECAY).
- A Governança pausa o Trading *live* e aciona o `ContinuousAlphaEngine` para recalibração total do grid.
