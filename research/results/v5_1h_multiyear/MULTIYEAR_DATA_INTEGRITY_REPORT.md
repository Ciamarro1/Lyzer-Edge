# 🏛️ LYZER EDGE — RELATÓRIO DE INTEGRIDADE DE DADOS MULTI-ANO
## MULTIYEAR_DATA_INTEGRITY_REPORT

**Data:** 2026-08-27 / 2026-08-28  
**Autor:** Lead Quantitative Systems Engineer & Forensic Auditor (Antigravity)  
**Dataset:** `BTCUSDT_1h_multiyear_2023_2026.json`  
**SHA-256 Hash:** `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`  

---

## 1. ESPECIFICAÇÃO DO DATASET

* **Símbolo:** `BTCUSDT` (Spot / Binance Public Data Engine)
* **Timeframe:** `1h` (60 minutos)
* **Timestamp Inicial:** `1672531200000` (`2023-01-01T00:00:00.000Z`)
* **Timestamp Final:** `1787788800000` (`2026-08-27T00:00:00.000Z`)
* **Total de Velas Baixadas:** `32.016` velas horárias contínuas
* **Período Total:** 1.335 dias (3,65 anos)

---

## 2. AUDITORIA FORENSE DE CONTINUIDADE E GAPS

* **Candles Duplicados:** `0` (Zero duplicatas após ordenação estrita por `openTime`).
* **Timestamps Inválidos:** `0` (Zero timestamps fora de ordem ou corrompidos).
* **Consistência OHLCV:**
  * Para 100% das 32.016 velas: $High \ge Low$, $High \ge Open$, $High \ge Close$, $Low \le Open$, $Low \le Close$, $Volume \ge 0$.
* **Auditoria de Gaps:**
  * Apenas **1 único gap de manutenção da exchange** detectado em todo o histórico de 3,65 anos:
    * De: `2023-03-24T11:00:00.000Z` até `2023-03-24T14:00:00.000Z` (2 horas de parada de manutenção pública da Binance).
    * Não houve interpolação artificial ou preenchimento silencioso; o gap foi registrado e mantido transparente.

---

## 3. PARTIÇÕES ANUAIS CRONOLÓGICAS

```text
===================================================================================================
PARTIÇÃO TEMPORAL    PERÍODO (UTC)                  TOTAL VELAS 1H    PERCENTUAL DO DATASET
===================================================================================================
2023 (IS / Descoberta)2023-01-01 -> 2023-12-31       8.759             27.36%
2024 (Validation)    2024-01-01 -> 2024-12-31       8.784             27.44%
2025 (OOS-1)         2025-01-01 -> 2025-12-31       8.760             27.36%
2026 (OOS-2)         2026-01-01 -> 2026-08-27       5.713             17.84%
===================================================================================================
TOTAL MULTI-ANO                                     32.016            100.00%
===================================================================================================
```

---

## 4. STATUS DO GATE A (INTEGRIDADE)

**GATE A — PASS (100% AUDITADO E APROVADO ✅)**
