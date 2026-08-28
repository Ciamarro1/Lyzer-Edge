# 🏛️ LYZER EDGE — RELATÓRIO EXECUTIVO DE INTERAÇÃO & INCREMENTALIDADE
## EXP-V5-FUNDING-INCREMENTALITY-005: 2x2 FACTORIAL INTERACTION & INCREMENTALITY AUDIT

**Data:** 2026-08-28  
**Autor:** Lead Quantitative Systems Engineer + Forensic Auditor + Research Director (Antigravity)  
**Status Oficial:** **🟡 EVIDÊNCIA CONDICIONAL PROMISSORA — NÃO VALIDADA ESTATISTICAMENTE PARA PRODUÇÃO ($N=25$)**  
**Dataset:** `BTCUSDT_1h_multiyear_2023_2026.json` (32.016 velas horárias) + `BTCUSDT_funding_rates_2023_2026.json` (4.003 liquidações)  

---

## 1. DISTINÇÃO FUNDAMENTAL DE MÉTRICAS (RESOLUÇÃO CONCEITUAL)

Para assegurar total rigor matemático e evitar qualquer confusão entre preço puro e execução com atrito:

```text
========================================================================================================================
MÉTRICA                    VALOR (CELL A)    SIGNIFICADO ECONÔMICO EXATO
========================================================================================================================
Signal Forward Return 6h   +0.673%           Variação direcional bruta do preço do BTC de t+1(open) até t+6(close).
Strategy Gross Return      +0.514% (+$5.14)  Retorno realizado após aplicar Stop Loss 1.0 ATR, TP 2.5R e Time Exit 6h.
Strategy Net Return        +0.314% (+$3.14)  Retorno líquido final após pagar 0.20% de taxas de exchange e 0.04% slippage.
========================================================================================================================
```

---

## 2. A MATRIZ FATORIAL 2x2 COMPLETA (31.944 HORAS DE MERCADO AVALIADAS)

Dividimos todas as 31.944 horas válidas de mercado em 4 células mutuamente exclusivas:

```text
========================================================================================================================
CÉLULA DA MATRIZ                   N         6h FWD RET    MFE/MAE    GROSS PnL     NET PnL       NET EXP / TRADE    NET PF
========================================================================================================================
Cell A: Spring=1, Funding < 0      25        +0.673%       2.38x      +$128,52      +$108,99      +$4,360            2.20
Cell B: Spring=1, Funding >= 0     204       +0.059%       0.85x      -$96,54       -$504,54      -$2,473            0.54
Cell C: Spring=0, Funding < 0      4.375     +0.103%       1.10x      -$1.151,64    -$9.901,64    -$2,263            0.53
Cell D: Spring=0, Funding >= 0     27.340    +0.025%       0.97x      -$9.497,05    -$64.177,05   -$2,347            0.49
========================================================================================================================
```

---

## 3. O TERMO DE INTERAÇÃO PURA (DIFFERENCE-IN-DIFFERENCES)

Isolamos o valor específico que surge da **conjunção mecânica do Spring com o Funding Negativo**:

$$
\Delta_{\text{Interaction}}^{\text{Forward}} = E[R \mid A] - E[R \mid B] - E[R \mid C] + E[R \mid D] = +0.673\% - 0.059\% - 0.103\% + 0.025\% = \mathbf{+0.536\%} \text{ (+53.6 bps)}
$$

* **Alfa Incremental do Spring sobre o Regime ($A - C$):** $\mathbf{+0.570\%}$ (+57.0 bps acima do retorno de qualquer barra em funding negativo).
* **Alfa Incremental do Funding sobre o Spring ($A - B$):** $\mathbf{+0.614\%}$ (+61.4 bps acima do Spring sem funding negativo).
* **Efeito Líquido de Interação Realizada:** $\mathbf{+\$6.749}$ por trade.

---

## 4. INFERÊNCIA ESTATÍSTICA AVANÇADA (10.000 ITERAÇÕES)

* **Teste de Permutação (10.000 iterações):**
  * Embaralhamos aleatoriamente o label do Spring dentro das 4.400 horas de Funding Negativo.
  * **$p$-valor empírico:** **$p = 0.0191$** (**Estatisticamente significativo a $p < 0.05$ ✅**). A probabilidade de o ganho do Spring dentro de funding negativo ser mero acaso é inferior a 2%.
* **Bootstrap 10.000 do Net Expectancy da Cell A ($N=25$):**
  * Intervalo de Confiança 95%: **[-$0.791, +$9.747]** (**Inclui zero ❌**).
  * **Diagnóstico:** Como o tamanho amostral é de apenas 25 eventos em 3,65 anos, o limite inferior do IC 95% toca levemente no negativo, impedindo formalmente qualquer promoção para produção.

---

## 5. DISTRIBUIÇÃO CONTÍNUA DE FUNDING RATE (DEGRADAÇÃO MONOTÔNICA)

```text
===================================================================================================================
FAIXA DE FUNDING RATE            N      6h FWD RET    MFE/MAE    NET PnL       NET EXP / TRADE    NET PROFIT FACTOR
===================================================================================================================
Desconto (F < 0.0)               25     +0.673%       2.38x      +$108,99      +$4,360            2.20
Neutro Baixo (0.0 <= F <= 0.005%)62     +0.162%       1.16x      -$80,85       -$1,304            0.69
Prêmio Moderado (0.005% < F <= 0.01%)116-0.016%       0.80x      -$293,94      -$2,534            0.52
Prêmio Elevado (F > 0.01%)       26     +0.145%       0.64x      -$129,75      -$4,990            0.42
===================================================================================================================
```

> **Comportamento Monotônico Claro:** Conforme o mercado perp migra de desconto ($F < 0$) para prêmio inflado ($F > 0.01\%$), a expectativa líquida se deteriora de forma estritamente decrescente: **+$4.36 \to -\$1.30 \to -\$2.53 \to -\$4.99$ por trade**.

---

## 6. QUADRO DE GOVERNANÇA & DECISÃO OFICIAL

```text
┌────────────────────────────────────────────────────────────────────────┐
│ DECISÃO DE GOVERNANÇA: V5 SPRING + FUNDING DISCOUNT                   │
├────────────────────────────────────────────────────────────────────────┤
│ Termo de Interação DiD         🟢 +53.6 bps (p = 0.0191)               │
│ Alfa Incremental sobre Regime  🟢 +57.0 bps                            │
│ Degradação Monotônica por Bins 🟢 Confirmada                           │
│ Tamanho Amostral               ⚠️ N = 25 (IC 95% inclui zero)         │
│ Classificação Epistêmica       🟡 EVIDÊNCIA PROMISSORA NÃO CONFIRMADA  │
│ Execução com Capital Real      🚫 BLOQUEIO TOTAL EM PRODUÇÃO           │
│ Shadow Tracking Prospectivo    🟢 ATIVADO CONFORME ESPECIFICAÇÃO       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Artefatos:
* 📄 [`research/results/v5_funding_incrementality/V5_FUNDING_INCREMENTALITY_EXECUTIVE_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_funding_incrementality/V5_FUNDING_INCREMENTALITY_EXECUTIVE_REPORT.md)
* 📋 [`research/results/v5_funding_incrementality/V5_SHADOW_TRACKING_PROTOCOL.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_funding_incrementality/V5_SHADOW_TRACKING_PROTOCOL.md)
* 📋 [`research/results/v5_funding_incrementality/incrementality_manifest.json`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_funding_incrementality/incrementality_manifest.json)
* 🛡️ [`research/experiments/runV5FundingIncrementalitySuite.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/experiments/runV5FundingIncrementalitySuite.js)
