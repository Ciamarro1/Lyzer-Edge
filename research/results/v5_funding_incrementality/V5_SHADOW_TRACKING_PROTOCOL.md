# 🏛️ LYZER EDGE — PROTOCOLO DE SHADOW TRACKING PROSPECTIVO
## V5_SHADOW_TRACKING_PROTOCOL (FROZEN STATE & DERIVATIVE GATE)

**Data de Início:** 2026-08-28  
**Autor:** Senior Chief Technology Officer & Lead Quantitative Systems Engineer (Antigravity)  
**Status Operacional:** **PRODUÇÃO BLOQUEADA 🚫 / SHADOW TRACKING ATIVO 🟢**  
**Versão do Setup:** `V5-ABD-SPRING-FUNDING-DISCOUNT-v1.0`  

---

## 1. ESPECIFICAÇÃO IMUTÁVEL DO GATILHO & FILTRO

Para evitar contaminação por mineração de dados em tempo real, os parâmetros são congelados:

```json
{
  "setupId": "V5_SPRING_FUNDING_DISCOUNT_SHADOW",
  "timeframe": "1h",
  "triggerEngine": {
    "engine": "WyckoffVolumeProfileEngine",
    "lookback": 30,
    "volumeZScore": 1.50,
    "minPierceATR": 0.50,
    "requireVolume": true,
    "requirePierce": true,
    "requireReversal": true,
    "requirePOC": false
  },
  "exogenousGate": {
    "filter": "FUNDING_RATE_NEGATIVE",
    "condition": "FundingRate(t) < 0.0",
    "source": "BinanceFuturesPublicAPI_fapi"
  },
  "executionRules": {
    "entry": "Market Order at open(t+1)",
    "stopLoss": "1.0 * ATR(14)",
    "takeProfit": "2.5 * StopDistance",
    "timeExitBars": 6,
    "assumedFeeRate": "0.0010 (0.10% each leg)",
    "assumedSlippageRate": "0.0002 (0.02% each leg)"
  }
}
```

---

## 2. ESQUEMA DE LOGGING PROSPECTIVO (EVENT-BY-EVENT)

Cada sinal futuro detectado pelo motor de streaming deve gravar os seguintes campos de forma determinística:

1. `event_uuid`: UUIDv7 causal
2. `timestamp_signal`: ISO8601 UTC
3. `symbol`: `BTCUSDT`
4. `close_price_signal`: Preço de fechamento da vela 1h
5. `volume_zscore`: Z-Score calculado causalmente
6. `pierce_atr_multiple`: Profundidade do sweep
7. `funding_rate`: Último funding rate liquidado
8. `htf_1d_sma200_state`: Estado macro (`BULL` / `BEAR`)
9. `entry_price_executed`: Preço de abertura da vela $t+1$
10. `stop_price`: Preço de stop loss
11. `target_price`: Preço de take profit
12. `mfe_1h`, `mfe_2h`, `mfe_4h`, `mfe_6h`: Excursão Máxima Favorável
13. `mae_1h`, `mae_2h`, `mae_4h`, `mae_6h`: Excursão Máxima Adversa
14. `exit_price`: Preço final de saída
15. `exit_reason`: `STOP_LOSS` | `TAKE_PROFIT` | `TIME_EXIT` | `INTRABAR_COLLISION_SL`
16. `gross_pnl`: PnL Bruto
17. `fees_paid`: Taxas estimadas
18. `net_pnl`: PnL Líquido

---

## 3. CRITÉRIO DE PROMOÇÃO DE SHADOW PARA PRODUÇÃO

O setup **NÃO SERÁ PROMOVIDO** para execução de capital real até que os seguintes critérios prospectivos sejam atingidos:

* **Critério 1 (N Mínimo):** Pelo menos **15 novos trades prospectivos** registrados em Shadow Mode.
* **Critério 2 (Expectativa Líquida Positiva):** Net Expectancy nos 15 trades $\ge +\$2.00$ por trade (ou $+0.20\%$ do nocional).
* **Critério 3 (Win Rate Realizada):** Net Win Rate $\ge 50\%$.
* **Critério 4 (Controle de Beta):** Retorno realizado superior ao retorno do mercado no mesmo período de holding.
