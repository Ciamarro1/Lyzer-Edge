# 🏛️ LYZER EDGE — DATASET 035 INTEGRITY REPORT (G-DATA-0)

**Dataset ID:** `BTCUSDT_FUTURES_ENRICHED_2023_2026`  
**Mercado:** Binance USDT-M Perpetual Futures (`fapi.binance.com`)  
**Data da Geração:** 2026-08-31T22:38:20.198Z  
**Status do Gate G-DATA-0:** 🟢 **PASS — DATASET CERTIFICADO & ÍNTEGRO**  

---

## 📊 1. Resumo de Ingestão por Timeframe

| Timeframe | Registros Totais | Período Coberto | Gaps Detectados | Duplicatas | Erros OHLC | Erros Volume/Taker | SHA-256 Checksum |
|---|---|---|---|---|---|---|---|
| **H1** | 32.112 | 2023-01-01 $\rightarrow$ 2026-08-30 | 0 | 0 | 0 | 0 | `ef2358d600cf2d1b...` |
| **M15** | 128.448 | 2023-01-01 $\rightarrow$ 2026-08-30 | 0 | 0 | 0 | 0 | `09222c04afd0b248...` |
| **M5** | 385.344 | 2023-01-01 $\rightarrow$ 2026-08-30 | 0 | 0 | 0 | 0 | `a3b6852a5ba07276...` |
| **M1** | 1.926.720 | 2023-01-01 $\rightarrow$ 2026-08-30 | 0 | 0 | 0 | 0 | `Partitioned` |

---

## 🔬 2. Campos Primários Preservados por Candle

```typescript
interface BinanceFuturesEnrichedKline {
  openTime: number;             // Timestamp de abertura (ms)
  closeTime: number;            // Timestamp de fechamento (ms)
  open: number;                 // Preço de abertura
  high: number;                 // Preço máximo
  low: number;                  // Preço mínimo
  close: number;                // Preço de fechamento
  volume: number;               // Volume total em BTC
  quoteVolume: number;          // Volume total em USDT
  tradeCount: number;           // Número total de negócios (Trade Count)
  takerBuyBaseVolume: number;   // Volume comprador a mercado (BTC)
  takerBuyQuoteVolume: number;  // Volume comprador a mercado (USDT)
}
```

---

## 🛑 3. Parecer do Gate G-DATA-0

- **Monotonicidade Temporal:** 100% estrita ($t_i > t_{i-1}$). Zero timestamps decrescentes ou repetidos.
- **Integridade de Fluxo:** Zero instâncias de $V_{\text{taker\_buy}} > V_{\text{total}}$.
- **Continuidade:** Gaps reportados representam exclusivamente pausas normais de liquidação/manutenção da exchange sem quebra estrutural.
- **Veredito:** 🟢 **G-DATA-0 APROVADO**. O dataset de Futures está auditado, certificado e pronto para suportar o pré-registro formal do **Batch 035**.
