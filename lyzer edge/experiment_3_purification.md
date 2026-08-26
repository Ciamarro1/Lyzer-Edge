# 🧬 EXPERIMENTO 3: Matriz de Purificação e Validação LOO

**Dataset:** 64 Trades (15m Time Exit + SL + 0.8R BE)
**Base T0 Winners:** 34 | **Base T0 Losers:** 30

## 1. Comparativo de Modelos (In-Sample)

| Modelo | Trades | PnL | PF | WR | Winners Eliminados | Losers Eliminados | Eficiência de Remoção (L/W) |
|---|---|---|---|---|---|---|---|
| Model 0 (Baseline) | 64/64 | $-35.58 | 0.40 | 12.5% | 0 | 0 | **0x** |
| Model 1 (ADA OFF) | 45/64 | $-27.18 | 0.35 | 13.3% | 9 | 10 | **1.11x** |
| Model 2 (SOL/XRP OFF) | 62/64 | $-35.58 | 0.40 | 12.9% | 1 | 1 | **1.00x** |
| Model 5 (SMA < 0.1% + ATR < 0.12%) | 13/64 | $11.88 | 7.13 | 30.8% | 23 | 28 | **1.22x** |
| Model 3 (SMA < 0.1%) | 18/64 | $6.74 | 1.95 | 22.2% | 22 | 24 | **1.09x** |
| Model 4 (ATR < 0.12%) | 28/64 | $6.05 | 1.53 | 17.9% | 15 | 21 | **1.40x** |

## 2. Top 5 Matriz SMA x ATR (In-Sample)

| SMA Limit | ATR Limit | Trades | PnL | PF | Eficiência (L/W) |
|---|---|---|---|---|---|
| < 0.1% | < 0.12% | 13 | $11.88 | 7.13 | 1.22x |
| < 0.1% | < 0.14% | 14 | $11.88 | 7.13 | 1.27x |
| < 0.1% | < 0.16% | 15 | $11.88 | 7.13 | 1.23x |
| < 0.2% | < 0.12% | 23 | $11.73 | 3.05 | 1.56x |
| < 0.15% | < 0.12% | 16 | $9.98 | 3.60 | 1.29x |

## 3. 🛡️ VALIDAÇÃO OUT-OF-SAMPLE (Leave-One-Out)

*Para cada um dos 64 trades, o filtro SMA+ATR foi treinado cegamente nos outros 63 e aplicado ao trade isolado. Isso previne o sobreajuste (overfitting).* 

| Métrica | Resultado Out-of-Sample |
|---|---|
| Trades Aprovados | 14/64 |
| Net PnL (LOO) | **$2.74** |
| Profit Factor | **1.48** |
| Win Rate (LOO) | 21.4% |

> **Significância:** Se o PnL LOO desmoronar de volta para negativo (-$35), o filtro SMA+ATR era pura ilusão in-sample. Se permanecer positivo e com PF > 1.0, o sinal CAUSAL da distância SMA+ATR é robusto.
