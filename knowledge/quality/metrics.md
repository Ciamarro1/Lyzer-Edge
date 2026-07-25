---
proposito: "Métricas de Performance e Capping de Memória"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "lyzer edge/backend/streamEngine.js"
  - "packages/lyzer-shared/src/csrl/ScaleNormalizer.js"
  - "packages/lyzer-shared/src/smc/liquidityEngine.js"
nivel_confianca: "Alto"
---

# Métricas de Performance & Capping de Memória (Fase 4)

## Limites de Retenção de Memória (Candle Buffers)

| Timeframe | Limite Anterior | Limite Otimizado (Fase 4) | Redução de Uso de RAM |
|---|---|---|---|
| `1m` | 3,000 candles | **1,000 candles** | -66.7% |
| `5m` | 500 candles | **500 candles** | 0% |
| `15m` | 500 candles | **500 candles** | 0% |
| `1h` | 500 candles | **500 candles** | 0% |
| `4h` | 500 candles | **500 candles** | 0% |
| `1d` | 365 candles | **365 candles** | 0% |

## Otimizações Tensoriais (CSRL)
- **ScaleNormalizer**: Normalização direta utilizando `Float32Array` pré-alocado.
- **LiquidityEngine**: Capping de payload a 300 zonas máximas para envio via WebSocket.
