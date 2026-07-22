# Auditoria Técnica — API Inventory
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/api_inventory.md`

---

## 1. Inventário de Endpoints REST (Express HTTP)

O backend do Lyzer Edge expõe os seguintes endpoints HTTP em `lyzer edge/backend/server.js`:

| Método | Endpoint | Descrição / Payload | Parâmetros | Segurança / Autenticação |
|---|---|---|---|---|
| `GET` | `/api/status` | Retorna o status do servidor backend e o modo ARL atual. | Nenhum | Aberto |
| `GET` | `/api/test-telegram` | Dispara mensagem de teste de integração no Telegram. | Nenhum | Aberto |
| `GET` | `/api/candles/:symbol` | Retorna candles históricos, trades ativos e estado da conexão para um símbolo. | `:symbol` (ex: BTCUSDT) | Aberto |
| `POST` | `/api/trades/close` | Encerra manualmente uma posição ativa de um determinado símbolo. | `{ symbol, id, exitPrice, exitDate, fees }` | Aberto |
| `POST` | `/api/trades/delete` | Remove uma ordem do histórico mantido em memória. | `{ symbol, id }` | Aberto |
| `POST` | `/api/trades/wipe` | Limpa todo o histórico de posições e trades ativas de todas as instâncias de mercado. | `{}` | Aberto |

---

## 2. Inventário de Canais WebSocket (Server & Ingestor)

### Server WebSocket Broadcaster (`ws://localhost:7860`)
- **Tipo de evento**: Broadcast a cada candle recebido ou alteração no motor de simulação/live.
- **Event Name**: `arl`
- **Payload Structure**:
```json
{
  "type": "arl",
  "symbol": "BTCUSDT",
  "index": 120,
  "mode": "TESTNET",
  "connectionState": "CONNECTED",
  "market": { "open": 60000, "high": 60100, "low": 59900, "close": 60050 },
  "signal": { "signal": "go", "confidence": 85 },
  "overlays": { "zones": [], "markers": [], "srLevels": [] }
}
```

---

## 3. Inventário de Serviços gRPC (`src-proto/lyzer.proto`)

### Service `RiskGateway`
- `rpc Authorize(AuthorizeOrder) returns (RiskDecision)`: Valida uma intenção de execução contra hard caps e regras de capital diário antes do envio à corretora.

### Service `IntentRegistry`
- `rpc RegisterIntent(RegisterIntentRequest) returns (RegisterIntentResponse)`: Registra uma intenção de execução no banco SQLite event-sourced.
- `rpc AppendIntentEvent(AppendIntentEventRequest) returns (AppendIntentEventResponse)`: Anexa um evento ao histórico imutável da ordem.
- `rpc AuditQuery(AuditQueryRequest) returns (AuditQueryResponse)`: Consulta todo o histórico de eventos de uma intenção específica.
- `rpc AuditQuerySinceVersion(AuditQuerySinceVersionRequest) returns (AuditQuerySinceVersionResponse)`: Consulta incremental para auditores.
- `rpc GetMaxVersion(GetMaxVersionRequest) returns (GetMaxVersionResponse)`: Retorna a versão global da cadeia de eventos.
