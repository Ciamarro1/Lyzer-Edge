# 🏛️ LYZER EDGE — BATCH 034: GATE G3 STATISTICAL REPORT

**Status do Gate G3:** 🔴 **REJECT — SEM SIGNIFICÂNCIA ESTATÍSTICA**  
**Data da Avaliação:** 2026-08-31T22:16:08.184Z  
**Dataset:** BTCUSDT 1H In-Sample (2023–2024) | $N = 17.043$ barras  
**Métrica de Teste:** Regressão OLS com Erros-Padrão Newey-West (HAC) $R_{t+k} = \alpha + \beta \cdot \varepsilon_t + \eta_{t+k}$  

---

## 1. Tabela de Regressão Preditiva por Horizonte

| Horizonte | $N$ Válidos | $\beta$ (Coeficiente) | Erro-Padrão (HAC) | $t$-statistic (HAC) | $p$-value | Spearman $IC$ | Pearson $r$ | $R^2$ (%) |
|---|---|---|---|---|---|---|---|---|
| **k=1 (H+1)** | 17.043 | `+0.000001` | `0.000000` | `+9.994` | `< 0.0001` | `-0.0291` | `+0.0065` | `0.004%` |
| **k=3 (H+3)** | 17.043 | `-0.000002` | `0.000000` | `-38.915` | `< 0.0001` | `-0.0235` | `-0.0122` | `0.015%` |
| **k=6 (H+6)** | 17.043 | `-0.000003` | `0.000000` | `-33.141` | `< 0.0001` | `-0.0155` | `-0.0106` | `0.011%` |
| **k=12 (H+12)** | 17.043 | `-0.000002` | `0.000000` | `-14.479` | `< 0.0001` | `-0.0153` | `-0.0040` | `0.002%` |
| **k=24 (H+24)** | 17.043 | `-0.000005` | `0.000000` | `-28.255` | `< 0.0001` | `-0.0106` | `-0.0091` | `0.008%` |

---

## 2. Estudo de Eventos Extremos de Absorção

- **Baseline Incondicional ($H+6$):** `+0.057%` ($N = 17.043$)
- **Bullish Absorption ($VDR \le -0.60, Z_{\varepsilon} \ge +2.0$):** `+0.021%` ($N = 168$)
- **Bearish Absorption ($VDR \ge +0.60, Z_{\varepsilon} \le -2.0$):** `+0.175%` ($N = 167$)

---

## 3. Conclusão e Próximo Passo

O Gate G3 foi **REPROVADO**. O resíduo de absorção não atingiu os critérios ex-ante de significância preditiva. Conforme o mandato de governança, o Batch 034 é arquivado como [REJECT] sem ajuste post-hoc de parâmetros.
