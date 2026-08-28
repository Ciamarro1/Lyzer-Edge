# 🏛️ LYZER EDGE — LAUDO DE AUDITORIA FORENSE DE INTEGRIDADE DO LEDGER
## V5_LEDGER_INTEGRITY_AUDIT (V5-LEDGER-INTEGRITY-GATE-001)

**Data de Execução:** 2026-08-28T03:52:20.986Z  
**Autor:** Lead Quantitative Systems Engineer & Forensic Software Auditor (Antigravity)  
**Veredito Final do Gate:** **GREEN — FORENSICALLY RECONCILED ✅**  
**Dataset 1H:** `BTCUSDT_1h_multiyear_2023_2026.json` (SHA-256: `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`)  
**Dataset Funding:** `BTCUSDT_funding_rates_2023_2026.json` (SHA-256: `bc92ab0118d4f98466313b8fc6f0705b9f71337991e72553621cf75fde000666`)  
**Ledger Reconstruído:** `V5_CELL_A_REBUILT_LEDGER.csv` (SHA-256: `03202a6e9f8d1e33c74530fb8cac228c26cf918c6e3c56a266b337c474a321b8`)  

---

## 1. INVESTIGAÇÃO DA CAUSA-RAIZ DA DISCREPÂNCIA ANTERIOR

Auditamos a origem exata da divergência apontada na revisão anterior:

1. **A Causa-Raiz Primária:**
   * No relatório anterior, a tabela em markdown havia sido preenchida com valores desatualizados de um rascunho intermediário (onde alguns trades vencedores e perdedores continham valores simulados com regras preliminares que somavam +$167.21 bruto e +$106.84 líquido).
   * Simultaneamente, o script em execução imprimia no stdout os valores calculados de +$138.56 e +$78.42.
   * Isso gerou um conflito entre o texto do relatório e o arquivo CSV em disco.
2. **A Solução Estrutural Definitiva:**
   * Eliminamos qualquer digitação manual ou formatação desacoplada.
   * A tabela em markdown deste laudo e o arquivo CSV foram **gerados programmaticamente a partir do mesmo array de execução em memória**, garantindo **100% de paridade bit-a-bit**.

---

## 2. AUDITORIA DE CARDINALIDADE POPULACIONAL (32.016 VELAS)

```text
========================================================================================================================
PARTIÇÃO DO ESPAÇO POPULACIONAL       CANDLES 1H    PERCENTUAL    STATUS DE RASTREABILIDADE
========================================================================================================================
Total de Velas no Arquivo             32.016        100.00%       SHA-256: 5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf
Warmup Inicial (Lookback Buffer)      48            0.15%         Barras 0..47 (Sem cálculo de sinal prévio)
Buffer Terminal de Saída (Horizonte)  24            0.08%         Barras 31.992..32.015 (Garante 24h sem truncamento)
------------------------------------------------------------------------------------------------------------------------
ESPAÇO POPULACIONAL AUDITADO          31.944        99.77%        Base exata da Matriz Fatorial 2x2
========================================================================================================================
- Cell A: Spring=1, Funding < 0       25            0.08%         Tratamento Principal (Short Squeeze)
- Cell B: Spring=1, Funding >= 0      204           0.64%         Evento sem Desconto
- Cell C: Spring=0, Funding < 0       4.375         13.70%        Desconto sem Evento
- Cell D: Spring=0, Funding >= 0      27.340        85.58%        Controle Neutro
------------------------------------------------------------------------------------------------------------------------
SOMA DAS 4 CÉLULAS                    31.944        100.00%       RECONCILIAÇÃO EXATA (100.000% MATCH ✅)
========================================================================================================================
```

---

## 3. TABELA DE RECONCILIAÇÃO CRUZADA (CROSS-CHECK RECONCILIATION)

```text
========================================================================================================================
MÉTRICA AUDITADA             RELATÓRIO ANTERIOR    TABELA STALE (USER)    RECONSTRUÍDO DO RAW    STATUS CONTÁBIL
========================================================================================================================
Trades Totais (N)            25                    25                     25                     PASS (EXATO ✅)
True Gross PnL               +$138,56              +$167,21               +$138,56               PASS (RECONCILIADO ✅)
Taxas de Corretagem (0.20%)  -$50,11               -$50,30                -$50,11                PASS (RECONCILIADO ✅)
Slippage Incorrido (0.04%)   -$10,03               -$10,07                -$10,03                PASS (RECONCILIADO ✅)
Total Fricção (0.24%)        -$60,14               -$60,37                -$60,14                PASS (RECONCILIADO ✅)
True Net PnL                 +$78,42               +$106,84               +$78,42                PASS (RECONCILIADO ✅)
Net Expectancy / Trade       +$3,137 (+0.314%)     +$4,274                +$3,137 (+0.314%)      PASS (RECONCILIADO ✅)
Trades Vencedores (Wins)     14                    15                     14                     PASS (14 W / 11 L ✅)
Trades Perdedores (Losses)   11                    10                     11                     PASS (14 W / 11 L ✅)
Net Win Rate                 56.00%                60.00%                 56.00%                 PASS (56.00% ✅)
Net Profit Factor            1.90                  2.31                   1.90                   PASS (1.90 ✅)
Identidade Gross - Fric = NetPASS                  PASS                   PASS (Diff = $0.0000)  PASS (100% EXATO ✅)
========================================================================================================================
```

---

## 4. O LEDGER IMUTÁVEL RECONSTRUÍDO DIRETO DOS DADOS BRUTOS (25 TRADES)

| # | Data / Hora (UTC) | Funding Rate | Preço Entrada | Preço Saída | Motivo Saída | True Gross PnL | Fricção Total | True Net PnL | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | 2023-03-10 01:00 | -0.0089% | $20,111.87 | $19,978.60 | STOP_LOSS | $-6.63 | $2.39 | $-9.02 | LOSS ❌ |
| 02 | 2023-03-31 07:00 | -0.0027% | $27,738.48 | $28,359.48 | TAKE_PROFIT | +$22.39 | $2.42 | +$19.97 | WIN ✅ |
| 03 | 2023-07-10 00:00 | -0.0022% | $30,090.26 | $30,089.64 | TIME_EXIT | $-0.02 | $2.40 | $-2.42 | LOSS ❌ |
| 04 | 2023-09-10 04:00 | -0.0001% | $25,832.82 | $25,805.01 | TIME_EXIT | $-1.08 | $2.40 | $-3.48 | LOSS ❌ |
| 05 | 2023-09-20 19:00 | -0.0010% | $26,930.62 | $27,029.54 | TIME_EXIT | +$3.67 | $2.40 | +$1.27 | WIN ✅ |
| 06 | 2023-09-25 00:00 | -0.0013% | $26,248.16 | $26,131.83 | STOP_LOSS | $-4.43 | $2.40 | $-6.83 | LOSS ❌ |
| 07 | 2024-04-19 02:00 | -0.0031% | $61,359.57 | $63,045.83 | TAKE_PROFIT | +$27.48 | $2.44 | +$25.04 | WIN ✅ |
| 08 | 2024-05-06 15:00 | -0.0010% | $63,632.01 | $63,115.17 | STOP_LOSS | $-8.12 | $2.39 | $-10.51 | LOSS ❌ |
| 09 | 2024-08-19 10:00 | -0.0067% | $58,046.01 | $58,705.99 | TIME_EXIT | +$11.37 | $2.41 | +$8.96 | WIN ✅ |
| 10 | 2024-09-01 14:00 | -0.0034% | $57,879.99 | $58,431.10 | TIME_EXIT | +$9.52 | $2.41 | +$7.11 | WIN ✅ |
| 11 | 2025-02-24 04:00 | -0.0030% | $95,298.00 | $95,631.66 | TIME_EXIT | +$3.50 | $2.40 | +$1.10 | WIN ✅ |
| 12 | 2025-04-06 23:00 | -0.0006% | $78,430.00 | $77,855.30 | STOP_LOSS | $-7.33 | $2.39 | $-9.72 | LOSS ❌ |
| 13 | 2025-05-05 02:00 | -0.0024% | $94,236.66 | $94,559.19 | TIME_EXIT | +$3.42 | $2.40 | +$1.02 | WIN ✅ |
| 14 | 2025-06-13 01:00 | -0.0018% | $103,773.65 | $103,288.54 | STOP_LOSS | $-4.67 | $2.40 | $-7.07 | LOSS ❌ |
| 15 | 2025-10-16 09:00 | -0.0022% | $111,146.31 | $110,327.25 | STOP_LOSS | $-7.37 | $2.39 | $-9.76 | LOSS ❌ |
| 16 | 2025-10-16 16:00 | -0.0030% | $109,232.43 | $108,392.21 | STOP_LOSS | $-7.69 | $2.39 | $-10.08 | LOSS ❌ |
| 17 | 2025-10-17 10:00 | -0.0006% | $104,751.99 | $106,948.56 | TAKE_PROFIT | +$20.97 | $2.42 | +$18.55 | WIN ✅ |
| 18 | 2025-11-24 14:00 | -0.0001% | $86,171.22 | $88,369.85 | TAKE_PROFIT | +$25.51 | $2.44 | +$23.07 | WIN ✅ |
| 19 | 2026-02-06 00:00 | -0.0016% | $63,509.40 | $65,453.20 | TAKE_PROFIT | +$30.61 | $2.44 | +$28.17 | WIN ✅ |
| 20 | 2026-02-10 14:00 | -0.0048% | $68,460.40 | $68,753.70 | TIME_EXIT | +$4.28 | $2.40 | +$1.88 | WIN ✅ |
| 21 | 2026-02-11 15:00 | -0.0084% | $66,519.72 | $67,811.17 | TIME_EXIT | +$19.41 | $2.42 | +$16.99 | WIN ✅ |
| 22 | 2026-03-27 14:00 | -0.0063% | $66,205.07 | $65,676.93 | STOP_LOSS | $-7.98 | $2.39 | $-10.37 | LOSS ❌ |
| 23 | 2026-04-16 13:00 | -0.0028% | $73,788.03 | $74,830.05 | TAKE_PROFIT | +$14.12 | $2.41 | +$11.71 | WIN ✅ |
| 24 | 2026-04-28 13:00 | -0.0032% | $76,189.85 | $75,768.36 | STOP_LOSS | $-5.53 | $2.39 | $-7.92 | LOSS ❌ |
| 25 | 2026-05-16 10:00 | -0.0002% | $77,959.99 | $78,205.96 | TIME_EXIT | +$3.16 | $2.40 | +$0.76 | WIN ✅ |

---

## 5. PARTIÇÃO CONFIRMATÓRIA DERIVADA DO LEDGER RECONSTRUÍDO

```text
========================================================================================================================
PERÍODO                        N     FORWARD RET (6h)    TRUE GROSS PnL    TOTAL FRICÇÃO    TRUE NET PnL    NET EXP / TRADE    NET PF
========================================================================================================================
Desenvolvimento (2023 - 2025)  18    +0.544%             +$80,49           -$43,29          +$37,20         +$2,067            1.54 (PASS ✅)
Validação Cega OOS (2026)      7     +1.004%             +$58,07           -$16,85          +$41,22         +$5,889            3.25 (PASS ✅)
------------------------------------------------------------------------------------------------------------------------
CONSOLIDADO MULTI-ANO          25    +0.673%             +$138,56          -$60,14          +$78,42         +$3,137            1.90
========================================================================================================================
```

---

## 6. LAUDO FORENSE & STATUS FINAL DO GATE

```text
======================================================================
LYZER EDGE — V5-LEDGER-INTEGRITY-GATE-001
AUDIT VERDICT
======================================================================
RAW DATA INTEGRITY      : PASS ✅
SIGNAL CARDINALITY      : PASS (Exactly 25 trades) ✅
TRADE CARDINALITY       : PASS (Exactly 25 trades) ✅
PER-TRADE ACCOUNTING    : PASS (Identity verified on 100% of rows) ✅
AGGREGATION IDENTITY    : PASS (Gross $138.56 - Friction $60.14 = Net $78.42) ✅
FEES RECONCILIATION     : PASS ($50.11 / $2.004 per trade) ✅
SLIPPAGE RECONCILIATION : PASS ($10.03 / $0.401 per trade) ✅
NET PNL RECONCILIATION  : PASS (+$78.42 / +$3.137 per trade) ✅
WIN RATE RECONCILIATION : PASS (14 wins / 11 losses = 56.00%) ✅
PROFIT FACTOR           : PASS (1.90 -> Wins $165.60 / Losses $87.18) ✅
HASH LINEAGE            : PASS (All artifacts hashed and verified) ✅
STATISTICAL REBUILD     : PASS (Derived 100% from rebuilt ledger) ✅

FINAL VERDICT:
GREEN — FORENSICALLY RECONCILED
======================================================================
```
