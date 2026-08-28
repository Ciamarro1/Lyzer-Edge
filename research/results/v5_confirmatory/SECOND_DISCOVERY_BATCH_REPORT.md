# 🏛️ LYZER EDGE — LAUDO DE DESCOBERTA QUANTITATIVA BATCH 002
## SECOND_DISCOVERY_BATCH_REPORT (5.000 HIPÓTESES EM 5 FAMÍLIAS ECONÔMICAS)

**Data de Execução:** 2026-08-28T06:14:12.649Z  
**Hardware:** 12 Cores (12th Gen Intel(R) Core(TM) i5-12400F) | RAM: 6.00 GB  
**Partição In-Sample (IS):** 22411 candles (70%) | SHA-256: `155057b4f294289d354e6569cfc65867b3ae47c872023c6385b02e9338722c28`  
**Partição Out-Of-Sample (OOS):** 9605 candles (30%) | SHA-256: `24779acee1f44816cc402072350482731b271a0565a14a82ddfb3241cc70ede0`  
**Tempo Total de Processamento:** 1604.50 segundos (~26.7 min)  

---

## 1. MATRIZ DE DESCOBERTA POR FAMÍLIA ECONÔMICA ($M=1.000$ CADA)

```text
====================================================================================================================================
FAMÍLIA ECONÔMICA                      REGISTRADAS (M)   STAGE 1 (IS SCREEN)   STAGE 2 (PERM)   STAGE 3 (MATH)   STAGE 4 (OOS)
====================================================================================================================================
1. FAM_LIQ_SWEEP_REJECTION             1.000 / 1.000           13                    13               12                2
2. FAM_LIQ_ABSORPTION_REVERSAL         1.000 / 1.000            0                     0                0                0
3. FAM_FUNDING_PRICE_DISLOCATION       1.000 / 1.000            2                     2                2                0
4. FAM_ORDER_FLOW_EXHAUSTION           1.000 / 1.000            8                     8                8                0
5. FAM_BREAKOUT_FAILURE_MEAN_REV       1.000 / 1.000            8                     8                8                3
====================================================================================================================================
TOTAL GERAL                            5.000 / 5.000           31                    31               30                5
====================================================================================================================================
```

---

## 2. SEPARAÇÃO RIGOROSA: ESTATÍSTICA vs ECONOMIA vs GENERALIZAÇÃO

```text
========================================================================================================================================================
HIPÓTESE ID     FAMÍLIA                 │ ESTATÍSTICA: RAW P   α_BONF (1k)  COHEN d │ ECONOMIA (IS): NET PNL    PF   EXP/TRD │ OOS PNL    OOS PF  DEGRAD │ CLASSE
========================================================================================================================================================
SWEEP-REJ-0003  FAM_LIQ_SWEEP_REJECTION │              0.0001       0.00005  0.5801380559582864 │       +$38.36   1.17     $1.1 │  -$38.90     0.78  -33.3% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0005  FAM_LIQ_SWEEP_REJECTION │             0.00105       0.00005  0.6320979138760663 │       +$33.17   1.28    $1.75 │   +$0.29        1  -21.9% │ Class C (Weak / Inconclusive)
SWEEP-REJ-0013  FAM_LIQ_SWEEP_REJECTION │             0.00035       0.00005  0.5326098045820746 │       +$34.61   1.23    $1.38 │  -$48.50      0.7  -43.1% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0015  FAM_LIQ_SWEEP_REJECTION │             0.00435       0.00005  0.5873408841452802 │       +$17.87   1.19    $1.19 │  -$16.15     0.77  -35.3% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0021  FAM_LIQ_SWEEP_REJECTION │             0.00305       0.00005  0.449181990080968 │       +$16.75   1.12    $0.76 │   +$1.17     1.01   -9.8% │ Class C (Weak / Inconclusive)
SWEEP-REJ-0022  FAM_LIQ_SWEEP_REJECTION │             0.00325       0.00005  0.46477188476587883 │       +$38.78   1.29    $1.76 │   -$0.89     0.99  -23.3% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0023  FAM_LIQ_SWEEP_REJECTION │             0.00195       0.00005  0.5540140089582751 │       +$65.35   1.67    $3.63 │   -$7.43     0.92  -44.9% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0024  FAM_LIQ_SWEEP_REJECTION │              0.0156       0.00005  0.4991614177306536 │       +$17.88    1.2    $1.19 │  -$24.33     0.66    -45% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0102  FAM_LIQ_SWEEP_REJECTION │              0.0001       0.00005  0.4835428771628798 │       +$64.45   1.31    $1.95 │ -$114.03     0.56  -57.3% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0103  FAM_LIQ_SWEEP_REJECTION │             0.00005       0.00005  0.5180439420348207 │      +$106.32   1.63    $3.67 │ -$126.44     0.48  -70.6% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0104  FAM_LIQ_SWEEP_REJECTION │              0.0002       0.00005  0.5932778153497954 │       +$94.78   1.76    $4.31 │ -$103.38     0.51    -71% │ Class E (Statistical Artifact / Overfitting)
SWEEP-REJ-0105  FAM_LIQ_SWEEP_REJECTION │             0.00005       0.00005  0.666530784207692 │       +$121.5   2.32    $6.75 │  -$63.36     0.44    -81% │ Class E (Statistical Artifact / Overfitting)
FUND-DISL-0401  FAM_FUNDING_PRICE_DISLOCATION │             0.00145       0.00005  0.45789816764515984 │       +$14.91   1.09    $0.57 │ -$119.89     0.39  -64.2% │ Class E (Statistical Artifact / Overfitting)
FUND-DISL-0403  FAM_FUNDING_PRICE_DISLOCATION │              0.0345       0.00005  0.41114492819731363 │        +$6.47   1.07    $0.43 │  -$42.42     0.45  -57.9% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0002 FAM_ORDER_FLOW_EXHAUSTION │              0.0007       0.00005  0.517441153937368 │       +$29.51   1.26    $1.34 │  -$62.39      0.6  -52.4% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0003 FAM_ORDER_FLOW_EXHAUSTION │              0.0019       0.00005  0.5497681377524917 │       +$68.71   1.97    $4.29 │  -$19.77      0.8  -59.4% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0101 FAM_ORDER_FLOW_EXHAUSTION │             0.00025       0.00005  0.4881874024057902 │       +$40.73   1.22    $1.45 │ -$123.56     0.43  -64.8% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0104 FAM_ORDER_FLOW_EXHAUSTION │              0.0354       0.00005  0.41114492819731363 │        +$6.47   1.07    $0.43 │  -$42.42     0.45  -57.9% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0111 FAM_ORDER_FLOW_EXHAUSTION │             0.00015       0.00005  0.6779518293624917 │      +$112.58   2.14    $5.63 │  -$88.43     0.48  -77.6% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0112 FAM_ORDER_FLOW_EXHAUSTION │             0.00295       0.00005  0.5605067344047504 │       +$17.72   1.18    $0.98 │  -$88.49     0.41  -65.3% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0201 FAM_ORDER_FLOW_EXHAUSTION │             0.00265       0.00005  0.4266133257467334 │       +$27.75   1.17    $1.32 │  -$65.24     0.64  -45.3% │ Class E (Statistical Artifact / Overfitting)
OF-EXHAUST-0211 FAM_ORDER_FLOW_EXHAUSTION │             0.01575       0.00005  0.39055257487860917 │       +$21.24   1.19    $1.33 │  -$58.95      0.6  -49.6% │ Class E (Statistical Artifact / Overfitting)
BRK-FAIL-0052   FAM_BREAKOUT_FAILURE_MEAN_REV │              0.0035       0.00005  0.5271986554948838 │       +$40.76   1.47    $2.55 │   -$6.35     0.94  -36.1% │ Class E (Statistical Artifact / Overfitting)
BRK-FAIL-0062   FAM_BREAKOUT_FAILURE_MEAN_REV │              0.0031       0.00005  0.5284843205288903 │       +$40.76   1.47    $2.55 │  -$13.93     0.88  -40.1% │ Class E (Statistical Artifact / Overfitting)
BRK-FAIL-0072   FAM_BREAKOUT_FAILURE_MEAN_REV │             0.00455       0.00005  0.5121459208936653 │       +$40.76   1.47    $2.55 │  -$13.93     0.88  -40.1% │ Class E (Statistical Artifact / Overfitting)
BRK-FAIL-0082   FAM_BREAKOUT_FAILURE_MEAN_REV │              0.0037       0.00005  0.5121459208936653 │       +$40.76   1.47    $2.55 │  -$13.93     0.88  -40.1% │ Class E (Statistical Artifact / Overfitting)
BRK-FAIL-0092   FAM_BREAKOUT_FAILURE_MEAN_REV │             0.00725       0.00005  0.4628716710775494 │       +$28.11   1.28    $1.65 │  -$13.93     0.88  -31.3% │ Class E (Statistical Artifact / Overfitting)
BRK-FAIL-0162   FAM_BREAKOUT_FAILURE_MEAN_REV │              0.0166       0.00005  0.45682696432220404 │        +$5.24   1.05    $0.33 │  +$12.93     1.15    9.5% │ Class B (Promising)
BRK-FAIL-0172   FAM_BREAKOUT_FAILURE_MEAN_REV │              0.0219       0.00005  0.43666866818490807 │        +$5.24   1.05    $0.33 │  +$12.93     1.15    9.5% │ Class B (Promising)
BRK-FAIL-0182   FAM_BREAKOUT_FAILURE_MEAN_REV │              0.0257       0.00005  0.4293743757969027 │        +$5.24   1.05    $0.33 │  +$12.93     1.15    9.5% │ Class B (Promising)
========================================================================================================================================================
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
