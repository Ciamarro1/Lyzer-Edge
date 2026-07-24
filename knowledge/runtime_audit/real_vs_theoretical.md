# Auditoria de Realidade: Teórico vs Real Executado em Produção

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Fonte de Dados Auditada**: `lyzer edge/docs/lyzer_edge_backup_2026-07-24.json`
- **Tamanho da Amostra**: **1.395 Trades** (1.389 Fechados, 6 Abertos)
- **Janela Temporal Auditada**: 24/07/2026 09:15:04 UTC às 24/07/2026 21:51:07 UTC (12 horas e 36 minutos)

---

## 🚨 1. A Grande Contradição: Simulação Teórica vs Produção Real

| Métrica Quantitativa | Afirmação Teórica / Simulação | **REALIDADE EMPÍRICA (Backup HF)** | Status da Divergência |
|---|---|---|---|
| **Win Rate (Taxa de Acerto)** | 68,4% | **30,74%** (427 Vencedores / 956 Perdedores) | ❌ **Divergência Severa (-37,66%)** |
| **Profit Factor** | 2,35 | **0,89** ($2.562,00 Ganhos / $2.868,18 Perdas) | ❌ **Prejuízo (PF < 1.0)** |
| **Expectancy por Trade** | +0,82 R | **-$0,22** por operação | ❌ **Expectativa Negativa** |
| **Sharpe Ratio** | +2,68 | **-0,05** | ❌ **Retorno Negativo ajustado ao Risco** |
| **Frequência Operacional** | 2,4 trades/dia por par | **110 trades/hora** (1389 trades em ~12h) | ❌ **Overtrading Severo (High-Frequency Churn)** |
| **Net PnL Total** | Lucrativo | **-$306,18** | ❌ **Perda de Capital** |

---

## 🔍 2. Por que a Divergência Ocorreu?

1. **Overtrading Massivo (Churn de Alta Frequência em M1)**:
   - O `StreamEngine.js` estava disparando sinais e abrindo operações a cada **1 a 3 minutos** para cada um dos 6 pares monitorados.
   - Em 12,6 horas de execução, foram geradas **1.389 operações fechadas**.
2. **Falta de Filtro de Regime e Filtro de Tendência HTF**:
   - A maioria dos trades foi executada contra a tendência de curto prazo em velas de 1 minuto (`1m`), operando ruído de mercado sem confirmação de estruturas H4/H1.
3. **Assimetria Estática de R:R (SL Fixo de -3.00 vs TP de +6.00)**:
   - Com uma taxa de acerto de 30.7%, para obter lucro com SL = -3.00 e TP = +6.00, o Win Rate mínimo necessário é de $\frac{3.00}{3.00 + 6.00} = 33,33\%$. Como o Win Rate real foi de 30.74%, o resultado final convergiu matematicamente para perda.

---

## 📊 3. Desempenho Real por Ativo

| Símbolo | Operações | Vencedoras | Perdedoras | Win Rate | Net PnL ($) | Profit Factor |
|---|---|---|---|---|---|---|
| **EUR/USD** | 213 | 53 | 160 | 24.9% | -$158.77 | 0.67 |
| **ETH/USD** | 227 | 82 | 145 | 36.1% | +$59.71 | 1.14 |
| **BTC/USD** | 268 | 82 | 186 | 30.6% | -$61.98 | 0.89 |
| **BNB/USD** | 241 | 70 | 171 | 28.9% | -$72.28 | 0.86 |
| **SOL/USD** | 234 | 63 | 171 | 26.9% | -$132.74 | 0.74 |
| **GBP/USD** | 206 | 75 | 131 | 36.4% | +$59.88 | 1.15 |
| **TOTAL** | **1.389** | **427** | **956** | **30.74%** | **-$306.18** | **0.89** |

---

## 📜 Veredito do Auditor

> **"A simulação teórica não refletia o comportamento real do ambiente em produção no Hugging Face. O sistema operava em modo de Overtrading descontrolado em gráficos de 1m. É imperativo ajustar o limiar de entrada e aplicar o filtro de regime do TruthKernel para estancar o churn."**
