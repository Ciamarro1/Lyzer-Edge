# 🏛️ LYZER EDGE — BATCH 035: GATE G3 DUAL REPORT

**Status do Gate G3:** 🔴 **REJECT — SEM VIABILIDADE ESTATÍSTICA/ECONÔMICA**  
**Data da Avaliação:** 2026-08-31T23:10:30.515Z  
**Dataset:** BTCUSDT Futures M5 In-Sample (2023–2024) | $N = 210.234$ candles  

---

## 1. Dimensão G3a: Tabela de Regressão Preditiva de Fluxo

| Horizonte | $N$ Eventos | $\beta$ (Coeficiente) | Erro-Padrão (HAC) | $t$-statistic (HAC) | $p$-value | Spearman $IC$ | Pearson $r$ |
|---|---|---|---|---|---|---|---|
| **5m (k=1)** | 2.781 | `-0.000045` | `0.000060` | `-0.753` | `0.4513` | `+0.0092` | `-0.0235` |
| **15m (k=3)** | 2.781 | `+0.000036` | `0.000084` | `+0.422` | `0.6733` | `+0.0097` | `+0.0110` |
| **30m (k=6)** | 2.781 | `-0.000060` | `0.000112` | `-0.534` | `0.5934` | `-0.0197` | `-0.0143` |
| **60m (k=12)** | 2.781 | `-0.000051` | `0.000133` | `-0.383` | `0.7020` | `-0.0202` | `-0.0086` |
| **120m (k=24)** | 2.781 | `-0.000081` | `0.000145` | `-0.557` | `0.5774` | `-0.0236` | `-0.0097` |
| **240m (k=48)** | 2.781 | `-0.000187` | `0.000204` | `-0.920` | `0.3577` | `-0.0245` | `-0.0158` |

---

## 2. Dimensão G3b: Desempenho Econômico por Regime (Líquido de Taxas 0.08%)

| Horizonte | Regime Transmission (Bruto) | Regime Transmission (Líquido) | Regime Absorption (Bruto) | Regime Absorption (Líquido) | $N$ Amostra |
|---|---|---|---|---|---|
| **15m** | `-0.007%` | `-0.087%` | `-0.008%` | `-0.088%` | Trans: 1032 / Abs: 28 |
| **30m** | `-0.008%` | `-0.088%` | `-0.093%` | `-0.173%` | Trans: 1032 / Abs: 28 |
| **60m** | `-0.030%` | `-0.110%` | `-0.144%` | `-0.224%` | Trans: 1032 / Abs: 28 |
| **120m** | `-0.016%` | `-0.096%` | `-0.041%` | `-0.121%` | Trans: 1032 / Abs: 28 |

---

## 3. Veredito do Comitê de Governança

- **Avaliação Estatística ($G_{3a}$):** Reprovada.
- **Avaliação Econômica ($G_{3b}$):** Reprovada (Retorno líquido insuficiente para cobrir o atrito de spread e taxas).
- **Decisão Final:** 🔴 **ARQUIVAMENTO REGISTRADO COMO [REJECT] SEM ALTERAÇÃO POST-HOC**.
