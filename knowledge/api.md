---
titulo: "Lyzer Edge — Especificação de APIs"
versao: "3.4.0-institutional"
---

# 🔌 Lyzer Edge — Especificação de APIs REST & WebSocket

## Endpoints HTTP (`server.js`)

- `GET /api/candles/:symbol`: Retorna histórico de klines e trades gravados.
- `GET /api/state`: Retorna o estado atual dos 6 motores de ativos.
- `GET /health`: Endpoint de verificação de integridade do container Docker.

## Eventos WebSocket (`/ws`)

- `{ type: 'tick', symbol: 'BTCUSDT', market: { close, high, low, open } }`
- `{ type: 'arl', trade: { direction, entryPrice, stopLoss, takeProfit, status } }`

---

## 🔗 Links Relacionados
- 🔌 [Serviços](services.md)
- 📐 [Interfaces](interfaces.md)
