# 🏛️ LYZER EDGE — RELATÓRIO EXECUTIVO DE EXECUÇÃO, ABLATION E OOS CEGO
## EXP-V5-ABD-EXECUTION-003

**Data:** 2026-08-27 / 2026-08-28  
**Autor:** Lead Quantitative Systems Engineer & CTO Executor (Antigravity)  
**Status do Experimento:** CONCLUÍDO (Auditoria Forense de Lookahead, Decomposição Long/Short, Matriz SL/TP/TimeExit, Ablation de Confluências, Sensibilidade Local, Robustez por Blocos, Bootstrap, Teste de Randomização e Validação OOS Cega)  
**Dataset:** `BTCUSDT_1m_90d.json` (SHA-256 Hash: `f70fd7083c00637d`) — 129.600 candles M1  
**Partição Temporal Estrita:**  
- **In-Sample (IS - 60%):** 77.760 candles (1779950220000 → 1784615760000)  
- **Validation (VAL - 20%):** 25.920 candles (1784615820000 → 1786170960000)  
- **Out-of-Sample (OOS - 20%):** 25.920 candles (1786171020000 → 1787726160000) — *Preservado virgem até o teste cego final único*  

---

## 1. EXECUTIVE VERDICT (O VEREDITO CIENTÍFICO)

Submetemos a hipótese congelada **V5 Wyckoff ABD** ($A$: Volume Anomaly $Z \ge 1.5$ $\land$ $B$: Swing Pierce $\ge 0.5$ ATR $\land$ $D$: Reversal Close) ao teste de execução pessimista com custos reais, colisão intrabar adversária e validação temporal cega.

### A Conclusão Inequívoca:
1. **O Sinal Não Sobrevive à Fricção de Execução em M1:**
   * Em velas de 1 minuto em BTC/USDT (\$65.000), a volatilidade típica de 1 vela (ATR) é de apenas \$15 a \$25 (**0.02% a 0.04%** do preço).
   * Os custos operacionais institucionais (Taxa Taker 0.1% entrada + 0.1% saída = **0.20%** + Slippage conservador 0.02% + 0.02% = **0.04%**, totalizando **0.24% de fricção**) são **6 a 12 vezes maiores do que o stop-loss médio de 1m**.
   * Quando o sinal é transformado em trades executáveis, **100% das configurações de SL/TP/TimeExit geram expectativa líquida negativa** devido à assimetria entre o ruído intrabar e a taxa de câmbio.
2. **Ausência de Significância Estatística no Trajetória Forward:**
   * No In-Sample, a taxa de retorno positivo em 30m foi de **51.7%** (LONG: 51.74%, SHORT: 51.65%), com MFE médio de 0.249% e MAE médio de 0.272% (MFE/MAE ratio de **0.92x**).
   * No teste de permutação aleatória contra 500 distribuições idênticas de ruído branco, o p-valor empírico foi de **$p = 0.14$** (**NÃO SIGNIFICATIVO** a $\alpha = 0.05$).
3. **Confirmação em Validação e Out-of-Sample:**
   * **Validation (20% VAL):** 162 trades | Win Rate: 0.00% | Net PnL: **-$398.42** | Expectancy: **-$2.459**.
   * **Out-of-Sample (20% OOS):** 166 trades | Win Rate: 0.00% | Net PnL: **-$395.31** | Expectancy: **-$2.381**.

---

## 2. HIPÓTESE CONGELADA (FROZEN HYPOTHESIS)

```text
Hipótese: V5 Wyckoff Volume Profile (Decoupled Mode ABD)
- Condição A: Volume Anomaly Z-Score >= 1.50
- Condição B: Swing Pierce >= 0.50 ATR
- Condição D: Reversal Close (Spring: close > prior swing low; Upthrust: close < prior swing high)
- Condição C: POC proximity filter REMOVIDO DEFINITIVAMENTE.
- Timeframe: M1 (1 minuto)
```

---

## 3. AUDITORIA FORENSE DE LOOKAHEAD E ALINHAMENTO TEMPORAL

* **Lookahead Bias:** AUDITADO E APROVADO. `signal(t)` utiliza estritamente `lookbackCandles[0...t]`. Nenhuma informação de $t+1$ (high, low, close, volume ou ATR futuro) é acessada.
* **Regra de Entrada:** Entrada simulada na barra do sinal com aplicação de slippage pessimista de compra no Ask / venda no Bid.
* **Colisão Intrabar Adversária:** Quando um candle $f$ atinge simultaneamente `low <= StopPrice` e `high >= TargetPrice`, **o Stop-Loss vence obrigatoriamente (regra pessimista institucional)**.

---

## 4. RESULTADOS NO NÍVEL DE SINAL (SIGNAL-LEVEL) & LONG VS SHORT

### Trajetória Futura do Preço sem SL/TP (IS - 77.760 candles):

```
=============================================================================================================
HORIZONTE    SINAIS    TAXA RETORNO POSITIVO    MFE MÉDIO    MAE MÉDIO    MFE/MAE RATIO    RETORNO MÉDIO
=============================================================================================================
10m (ALL)    412       51.46%                   0.134%       0.144%       0.93x            -0.009%
30m (ALL)    412       51.70%                   0.249%       0.272%       0.92x            -0.024%
60m (ALL)    412       51.21%                   0.362%       0.407%       0.89x            -0.045%
120m (ALL)   412       49.03%                   0.518%       0.601%       0.86x            -0.083%
-------------------------------------------------------------------------------------------------------------
30m (LONG)   230       51.74%                   0.261%       0.264%       0.99x            -0.003%
30m (SHORT)  182       51.65%                   0.234%       0.281%       0.83x            -0.050%
=============================================================================================================
```

*Diagnóstico:* A assimetria MFE/MAE é $< 1.0x$ em todos os horizontes, confirmando que o sinal não consegue vencer o spread e a deriva do mercado sem filtros exógenos de timeframes maiores.

---

## 5. MATRIZ DE EXECUÇÃO CONTROLADA (SL x TP x TIME EXIT)

Resultados no In-Sample (412 sinais):

| Configuração (SL / TP / TimeExit) | Cenário Base (PnL / Exp) | Cenário Stress (PnL / Exp) | Cenário Adversarial (PnL / Exp) | Win Rate |
| :--- | :--- | :--- | :--- | :--- |
| **SL: 0.50 ATR, TP: 2.0R, Exit: 60m** | **-$941.67** (-$2.286) | **-$1188.87** (-$2.886) | **-$1188.87** (-$2.886) | 0.00% |
| **SL: 0.50 ATR, TP: 2.0R, Exit: 30m** | **-$945.56** (-$2.295) | **-$1192.76** (-$2.895) | **-$1192.76** (-$2.895) | 0.00% |
| **SL: 0.50 ATR, TP: 1.5R, Exit: 30m** | **-$949.38** (-$2.304) | **-$1196.57** (-$2.904) | **-$1196.57** (-$2.904) | 0.00% |
| **SL: 0.75 ATR, TP: 2.0R, Exit: 60m** | **-$950.35** (-$2.307) | **-$1197.56** (-$2.907) | **-$1197.56** (-$2.907) | 0.49% |
| **SL: 1.00 ATR, TP: 2.0R, Exit: 60m** | **-$958.40** (-$2.326) | **-$1205.60** (-$2.926) | **-$1205.60** (-$2.926) | 1.21% |

---

## 6. ABLATION DE CONFLUÊNCIAS (V2, V6, V7)

| Confluência Testada | Trades | Retenção (%) | Profit Factor | Net PnL | Expectancy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **V5_ABD ONLY** | 412 | 100.0% | 0.00 | -$941.67 | -$2.286 |
| **V5_ABD + V2 (SNR)** | 249 | 60.4% | 0.00 | -$584.63 | -$2.348 |
| **V5_ABD + V6 (Mkt Profile)** | 0 | 0.0% | 0.00 | $0.00 | $0.000 |
| **V5_ABD + V7 (Tape Read)** | 0 | 0.0% | 0.00 | $0.00 | $0.000 |
| **V5_ABD + V2 + V6 + V7** | 0 | 0.0% | 0.00 | $0.00 | $0.000 |

*Diagnóstico:* A exigência de confluência simultânea de V6 e V7 na mesma barra de 1m provoca **sample starvation total (0 trades)**. A adição de V2 reduz trades em 40%, mas não melhora a expectativa líquida (-$2.348 vs -$2.286).

---

## 7. SENSIBILIDADE PARAMÉTRICA (ESTABILIDADE LOCAL)

| Volume Z-Score | Pierce ATR | Sinais IS | Trades | Win Rate | Expectancy Líquida |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Z = 1.25** | 0.25 ATR | 721 | 721 | 0.00% | -$2.336 |
| **Z = 1.25** | 0.50 ATR | 468 | 468 | 0.00% | -$2.300 |
| **Z = 1.25** | 1.00 ATR | 218 | 218 | 0.00% | -$2.263 |
| **Z = 1.50 (Base)** | 0.50 ATR | 412 | 412 | 0.00% | -$2.286 |
| **Z = 1.50** | 1.00 ATR | 199 | 199 | 0.00% | -$2.261 |
| **Z = 2.00** | 0.50 ATR | 345 | 345 | 0.00% | -$2.266 |
| **Z = 2.00** | 1.00 ATR | 176 | 176 | 0.00% | -$2.247 |

*Diagnóstico:* O comportamento é plano e invariante em toda a vizinhança paramétrica: todas as combinações convergem para perda constante de \$2.25 a \$2.36 por trade (o custo das taxas da exchange).

---

## 8. ROBUSTEZ TEMPORAL (4 SUB-BLOCOS IN-SAMPLE)

| Bloco IS | Período (Candles) | Trades | Win Rate | Profit Factor | Net PnL | Expectancy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Bloco 1** | 0 → 19.440 | 114 | 0.00% | 0.00 | -$256.50 | -$2.250 |
| **Bloco 2** | 19.440 → 38.880 | 103 | 0.00% | 0.00 | -$251.20 | -$2.439 |
| **Bloco 3** | 38.880 → 58.320 | 85 | 0.00% | 0.00 | -$196.46 | -$2.311 |
| **Bloco 4** | 58.320 → 77.760 | 110 | 0.00% | 0.00 | -$237.51 | -$2.159 |

---

## 9. VALIDAÇÃO ESTATÍSTICA: BOOTSTRAP E RANDOMIZAÇÃO

* **Bootstrap 95% Confidence Interval (1.000 iterações):**
  * Expectancy: **[-$2.415, -$2.139]** (100% negativo, intervalo estritamente abaixo de zero).
* **Random Permutation Test (500 iterações):**
  * Expectativa Observada do V5 ABD: **-$2.286**
  * Expectativa da Distribuição Aleatória: **-$2.373**
  * **p-valor empírico:** **$p = 0.1400$** (**NÃO SIGNIFICATIVO**).

---

## 10. VALIDAÇÃO TEMPORAL E TESTE CEGO OUT-OF-SAMPLE

* **Validation Split (20% VAL: 25.920 candles):**
  * Sinais: 162 | Trades: 162 | Win Rate: 0.00% | Net PnL: **-$398.42** | Expectancy: **-$2.459**.
* **One-Time Out-of-Sample Split (20% OOS: 25.920 candles):**
  * Sinais: 166 | Trades: 166 | Win Rate: 0.00% | Net PnL: **-$395.31** | Expectancy: **-$2.381**.
* **Integridade Bitwise:** PASS (100% Bitwise Identical em recálculo independente).

---

## 11. FORMATO DO VEREDITO FINAL

```text
============================================================
LYZER EDGE — EXP-V5-ABD-EXECUTION-003
FINAL VERDICT
============================================================

Hypothesis:
V5 Wyckoff ABD (Volume Z >= 1.5, Pierce >= 0.5 ATR, Reversal Close)

IS:
Trades: 412 | Net PnL: -$941.67 | Expectancy: -$2.286 | WR: 0.00%

VAL:
Trades: 162 | Net PnL: -$398.42 | Expectancy: -$2.459 | WR: 0.00%

OOS:
Trades: 166 | Net PnL: -$395.31 | Expectancy: -$2.381 | WR: 0.00%

Trades:
740 (Total IS + VAL + OOS)

Win Rate:
0.00% (Base SL/TP) / 1.21% (Wide SL 1.0 ATR)

Profit Factor:
0.00

Net PnL:
-$1,735.40 (Consolidado)

Expectancy:
-$2.345 / trade

Median R:
-1.000 R

Max Drawdown:
$1,735.40

Stress PnL:
-$2,185.00

Bootstrap CI:
[-$2.415, -$2.139] (100% Negative)

Randomization p-value:
p = 0.1400 (Statistically Indistinguishable from Noise)

Parameter Robustness:
Invariantly Negative across entire Z / Pierce grid

Temporal Robustness:
Consistently Negative across all 4 sub-blocks

Regime Dependence:
Fails in all regimes due to fee/ATR friction ratio

Classification:
E — REJECTED (Fails after execution costs and temporal validation)

Decision:
REJECT (V5 ABD does not possess standalone trade alpha on M1)

============================================================
```

---

## 12. LIÇÃO ARQUITETURAL PARA A PRÓXIMA MISSÃO

Este experimento prova o axioma central de Finanças Quantitativas:
> **"Um sinal em M1 cuja amplitude de expansão é de 0.25% a 0.35% é matematicamente incapaz de gerar alfa comercial quando as taxas de câmbio e slippage consomem 0.24% por operação."**

Para que qualquer motor (seja Wyckoff, SMC ou SnD) gere alfa executável em crypto:
1. **O Timeframe de Operação Precisa Ser Maior (ex: 5m, 15m ou 1h):** Onde o ATR típico é de **0.50% a 2.00%**, diluindo o peso das taxas de 0.24% para menos de 10% do alvo.
2. **O Modelo de Execução Deve Buscar Alvos de Swing Estruturais:** Não microscalping de 1 vela M1, mas captura de expansões macro de liquidez.

---

### Manifest e Arquivos Gerados:
* [`research/results/v5_abd_execution/manifest.json`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_abd_execution/manifest.json)
* [`research/results/v5_abd_execution/V5_ABD_EXECUTION_EXECUTIVE_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_abd_execution/V5_ABD_EXECUTION_EXECUTIVE_REPORT.md)
