# 🏛️ LYZER EDGE — BATCH 036: GATE G3 TRIAD REPORT

**Status do Gate G3:** 🔴 **REJECT — SEM VIABILIDADE ESTATÍSTICA/ECONÔMICA**  
**Data da Avaliação:** 2026-08-31T23:19:41.906Z  
**Amostra In-Sample (2023–2024):** $N = 15.384$ candles H1 sincronizados com 8h Funding Rate  

---

## 1. Teste G3a: Efeito Linear do Funding Rate ($Z_{F, t} \rightarrow R_{t+k}$)

| Horizonte | $N$ Amostra | $\beta$ | Erro-Padrão (HAC) | $t$-stat (HAC) | $p$-value | Spearman $IC$ | Pearson $r$ |
|---|---|---|---|---|---|---|---|
| **H+8 (8h)** | 15.384 | `-0.000279` | `0.000162` | `-1.729` | `0.0837` | `-0.0153` | `-0.0250` |
| **H+24 (1d)** | 15.384 | `-0.000131` | `0.000365` | `-0.358` | `0.7206` | `-0.0138` | `-0.0067` |
| **H+48 (2d)** | 15.384 | `+0.000184` | `0.000592` | `+0.311` | `0.7558` | `-0.0080` | `+0.0067` |
| **H+72 (3d)** | 15.384 | `+0.000515` | `0.000800` | `+0.644` | `0.5198` | `-0.0041` | `+0.0150` |
| **H+168 (7d)** | 15.384 | `+0.002825` | `0.001602` | `+1.764` | `0.0778` | `+0.0308` | `+0.0524` |

---

## 2. Teste G3b: Interação Funding $\times$ Regime de Volatilidade ($Z_F \times V_t \rightarrow R_{t+k}$)

| Horizonte | $\beta(F \times V)$ | Erro-Padrão (HAC) | $t$-stat (HAC) | $p$-value | Spearman $IC$ |
|---|---|---|---|---|---|
| **H+8 (8h)** | `-0.000099` | `0.000134` | `-0.742` | `0.4581` | `-0.0168` |
| **H+24 (1d)** | `+0.000214` | `0.000248` | `+0.864` | `0.3877` | `-0.0141` |
| **H+48 (2d)** | `+0.000646` | `0.000346` | `+1.864` | `0.0623` | `+0.0024` |
| **H+72 (3d)** | `+0.000903` | `0.000474` | `+1.907` | `0.0565` | `+0.0066` |
| **H+168 (7d)** | `+0.002950` | `0.000880` | `+3.352` | `0.0008` | `+0.0439` |

---

## 3. Teste G3c: Desempenho Econômico em Eventos Extremos ($|Z_F| \ge 2.0$) Líquido de Taxas ($0.08\%$)

| Horizonte | Funding Negativo ($Z \le -2.0$) [LONG] | Funding Positivo ($Z \ge +2.0$) [SHORT] | Retorno Médio Líquido | Baseline Incondicional | $N$ Amostra |
|---|---|---|---|---|---|
| **H+24 (1 dias)** | `+0.722%` | `-0.359%` | `-0.006%` | `+0.216%` | Neg: 512 / Pos: 768 |
| **H+48 (2 dias)** | `+0.949%` | `-0.862%` | `-0.218%` | `+0.436%` | Neg: 512 / Pos: 768 |
| **H+72 (3 dias)** | `+1.309%` | `-1.354%` | `-0.369%` | `+0.663%` | Neg: 512 / Pos: 768 |
| **H+168 (7 dias)** | `+2.695%` | `-3.065%` | `-0.841%` | `+1.583%` | Neg: 512 / Pos: 768 |

---

## 4. Veredito Forense & Governança

- **Avaliação Linear ($G_{3a}$):** Reprovada.
- **Avaliação de Interação ($G_{3b}$):** Aprovada ($t\text{-stat} > 3.0$).
- **Avaliação Econômica ($G_{3c}$):** Reprovada.
- **Decisão Final:** 🔴 **ARQUIVAMENTO REGISTRADO COMO [REJECT] SEM ALTERAÇÃO POST-HOC**.
