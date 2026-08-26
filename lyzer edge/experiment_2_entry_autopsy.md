# 🔬 EXPERIMENTO 2: Autópsia da Entrada (T0)

**Dataset:** 64 Railway Trades
## 1. Directional Excursion Probability

Dos 64 sinais, qual alvo foi atingido PRIMEIRO (Fator direcional vs Ruído):

- **+0.5R antes de -0.5R:** 40 trades (62.5%)
- **+0.8R antes de -0.8R:** 37 trades (57.8%)
- **+1.0R antes de -1.0R:** 34 trades (53.1%)

## 2. Decomposição por Ativo

| Ativo | Qtd | Avg MFE (60m) | Avg MAE (60m) | Retorno +5m | Retorno +15m | Retorno +30m |
|---|---|---|---|---|---|---|
| ETHUSDT | 14 | +4.32R | -2.42R | 0.10R | 0.72R | 1.01R |
| BTCUSDT | 9 | +4.19R | -2.90R | 0.69R | 0.80R | 1.12R |
| BNBUSDT | 20 | +3.83R | -3.47R | 0.28R | -0.13R | 0.39R |
| ADAUSDT | 19 | +2.51R | -3.74R | -0.01R | 0.14R | -0.13R |
| SOLUSDT | 1 | +0.80R | -3.21R | -1.71R | -0.63R | -1.61R |
| XRPUSDT | 1 | +3.25R | -2.50R | 0.96R | 2.50R | 1.53R |

## 3. Separação de Features (Winners vs Losers em T0)

*Winner = Atinge +1.0R antes de atingir -1.0R.*

| Feature (T0) | Winners (N=34) | Losers (N=30) | Δ | Separação? |
|---|---|---|---|---|
| Volume Ratio (vs SMA20) | 0.82x | 0.84x | -2.3% | NÃO |
| Distância da SMA20 (%) | 0.18% | 0.33% | -44.9% | SIM |
| Volatilidade Relativa (ATR%) | 0.12% | 0.17% | -29.7% | SIM |
