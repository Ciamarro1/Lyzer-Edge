# 🏛️ LYZER EDGE — LAUDO DE DESCOBERTA QUANTITATIVA BATCH 001
## FIRST_DISCOVERY_BATCH_REPORT (3.000 HIPÓTESES EM 3 FAMÍLIAS ECONÔMICAS)

**Data de Execução:** 2026-08-28T05:38:29.005Z  
**Hardware:** 12 Cores (12th Gen Intel(R) Core(TM) i5-12400F) | RAM: 6.00 GB  
**Partição In-Sample (IS):** 22411 candles (70%) | SHA-256: `155057b4f294289d354e6569cfc65867b3ae47c872023c6385b02e9338722c28`  
**Partição Out-Of-Sample (OOS):** 9605 candles (30%) | SHA-256: `24779acee1f44816cc402072350482731b271a0565a14a82ddfb3241cc70ede0`  
**Tempo Total de Processamento:** 467.30 segundos (~7.8 min)  

---

## 1. MATRIZ DE DESCOBERTA POR FAMÍLIA ECONÔMICA (DESENHO EXPERIMENTAL EX-ANTE)

No desenho experimental ex-ante, o teto familiar foi fixado em $M=1.000$ hipóteses por família. Na materialização da grade para o Batch 001:
- `FAM_VOL_EXPANSION`: 1.000 hipóteses materializadas ($M=1.000 \implies \alpha_{\text{bonf}} = 0,05 / 1.000 = 0,000050$)
- `FAM_LIQ_ABSORPTION`: 392 hipóteses materializadas ($M_{\text{realizado}} = 392 \implies \alpha_{\text{bonf}} = 0,05 / 392 = 0,000128$; sob teto $M=1.000 \implies \alpha_{\text{bonf}} = 0,000050$)
- `FAM_FUNDING_DISLOCATION`: 216 hipóteses materializadas ($M_{\text{realizado}} = 216 \implies \alpha_{\text{bonf}} = 0,05 / 216 = 0,000231$; sob teto $M=1.000 \implies \alpha_{\text{bonf}} = 0,000050$)

```text
========================================================================================================================
FAMÍLIA ECONÔMICA               REGISTRADAS (M)   STAGE 1 (IS SCREEN)   STAGE 2 (PERM)   STAGE 3 (MATH)   STAGE 4 (OOS)
========================================================================================================================
1. FAM_VOL_EXPANSION            1.000 / 1.000        17                    17               17                1
2. FAM_LIQ_ABSORPTION             392 / 1.000         1                     1                1                0
3. FAM_FUNDING_DISLOCATION        216 / 1.000         1                     1                0                0
========================================================================================================================
TOTAL GERAL                     1.608 / 3.000        19                    19               18                1
========================================================================================================================
```

---

## 2. TABELA DE CLASSIFICAÇÃO DE EVIDÊNCIA DAS CANDIDATAS

```text
=============================================================================================================================================
HIPÓTESE ID     FAMÍLIA                 IS NET PNL   IS PF    OOS NET PNL   OOS PF   RAW P-VAL   α_BONF (M=1k)   CLASSIFICAÇÃO DE EVIDÊNCIA
=============================================================================================================================================
VOL-EXP-0002    FAM_VOL_EXPANSION         +$11.64     1.05       -$76.30     0.66     0.000100        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0003    FAM_VOL_EXPANSION         +$85.13     1.47       -$38.90     0.78     0.000000        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0005    FAM_VOL_EXPANSION         +$36.52     1.31        +$0.29     1.00     0.000700        0.000050   Class C (Weak / Inconclusive)
VOL-EXP-0012    FAM_VOL_EXPANSION         +$17.19     1.10       -$38.47     0.75     0.001650        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0013    FAM_VOL_EXPANSION         +$53.82     1.44       -$37.43     0.72     0.000400        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0023    FAM_VOL_EXPANSION         +$16.20     1.20       -$43.44     0.53     0.016500        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0102    FAM_VOL_EXPANSION         +$55.47     1.31      -$100.85     0.55     0.000400        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0103    FAM_VOL_EXPANSION         +$83.88     1.55      -$113.27     0.46     0.000300        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0104    FAM_VOL_EXPANSION         +$72.34     1.67       -$90.21     0.49     0.000400        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0105    FAM_VOL_EXPANSION         +$82.85     1.90       -$63.36     0.44     0.000900        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0113    FAM_VOL_EXPANSION         +$34.96     1.31       -$98.25     0.44     0.005500        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0114    FAM_VOL_EXPANSION         +$14.34     1.20      -$103.25     0.38     0.018250        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0122    FAM_VOL_EXPANSION         +$11.35     1.13       -$17.77     0.78     0.041550        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0123    FAM_VOL_EXPANSION          +$6.47     1.07       -$34.60     0.57     0.026350        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0202    FAM_VOL_EXPANSION         +$16.97     1.11       -$40.88     0.77     0.004350        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0203    FAM_VOL_EXPANSION         +$28.88     1.21       -$39.09     0.73     0.004750        0.000050   Class E (Artifact / Overfit)
VOL-EXP-0204    FAM_VOL_EXPANSION         +$19.42     1.16       -$43.47     0.65     0.014600        0.000050   Class E (Artifact / Overfit)
LIQ-ABS-0018    FAM_LIQ_ABSORPTION        +$10.21     1.11      -$142.79     0.18     0.010400        0.000050   Class E (Artifact / Overfit)
=============================================================================================================================================
```

---

## 3. AUDITORIA FORENSE DE ISOLAMENTO CAUSAL (TRACK A)

```text
========================================================================================================================
ITEM AUDITADO                        ESTADO PRÉ-DISCOVERY            ESTADO PÓS-DISCOVERY           VEREDITO FORENSE
========================================================================================================================
1. Frozen V5 Config SHA-256          ba943e5f0a98701e...             ba943e5f0a98701e...            🟢 100% INTOCADO
2. Shadow Lockbox SHA-256            14afc5c97a67d400...             14afc5c97a67d400...            🟢 100% INTOCADO
3. V5 Baseline Replay (Cell A)       N=25 (Net +$78.42 / PF 1.90)    N=25 (Net +$78.42 / PF 1.90)   🟢 RECONCILIADO
========================================================================================================================
```
