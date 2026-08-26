# EXPERIMENT 1B: Protected Time Exit (64 Railway Trades)

**Friction Assumed:** Taker Exit (2 bps) + Taker Entry (2 bps)
**Protections Active:** Parametric Stop-Loss (Dynamic ATR), Break-Even at +0.8R

## 1. Aggregate Curve (With Protection)

| Exit | WR | PF | Expectancy | Net PnL ($) | SL Hits | BE Hits | Time Exits |
|---|---|---|---|---|---|---|---|
| 15m | 12.5% | 0.40 | $-0.56 | $-35.58 | 25 | 28 | 11 |
| 20m | 7.8% | 0.37 | $-0.58 | $-36.90 | 25 | 31 | 8 |
| 25m | 6.3% | 0.39 | $-0.58 | $-36.87 | 25 | 32 | 7 |
| 30m | 6.3% | 0.37 | $-0.60 | $-38.51 | 26 | 32 | 6 |

## 2. PnL Decomposition by Asset ($)

| Exit | Total | BNB | ADA | ETH | BTC | SOL | XRP |
|---|---|---|---|---|---|---|---|
| 15m | $-35.58 | $-10.95 | $-8.40 | $-11.17 | $-5.06 | $-0.00 | $-0.00 |
| 20m | $-36.90 | $-14.12 | $-6.19 | $-11.86 | $-4.74 | $-0.00 | $-0.00 |
| 25m | $-36.87 | $-14.12 | $-5.74 | $-11.80 | $-5.21 | $-0.00 | $-0.00 |
| 30m | $-38.51 | $-14.12 | $-7.51 | $-14.18 | $-2.70 | $-0.00 | $-0.00 |
