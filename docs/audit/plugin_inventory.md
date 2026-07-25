# Auditoria Técnica — Plugin & Adapter Inventory
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/plugin_inventory.md`

---

## 1. Inventário de Adaptadores de Exchange e Integrações

### 1. `ExchangeExecution` ([exchangeExecution.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/exchangeExecution.js))
- **Função**: Adaptador para a API REST da Binance (Mainnet / Testnet).
- **Modos de Operação**:
  - `TESTNET / LIVE`: Se as chaves `BINANCE_API_KEY` e `BINANCE_API_SECRET` estiverem configuradas, executa ordens reais na API da Binance.
  - `SIMULATION / MOCK`: Se as chaves estiverem ausentes, simula imediatamente o preenchimento de ordens com o status `FILLED_MOCK`.
- **Maturidade**: Estável.

### 2. `LiveDataIngestor` ([liveDataIngestor.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/liveDataIngestor.js))
- **Função**: Adaptador de ingestão de klines em tempo real via WebSocket da Binance (`wss://stream.binance.com:9443/ws/<symbol>@kline_<interval>`).
- **Recuperação de Desconexão**: Implementa retentativas de reconexão automática e emissão de eventos de estado de conexão (`CONNECTED`, `DEGRADED`, `FAILED`).

### 3. `TelegramBotNotifier` ([telegram.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/telegram.js))
- **Função**: Envio de alertas de execução e falhas de sistema para o canal do Telegram via `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.
- **Maturidade**: Operacional com tratamento de erro básico.

### 4. Pine Script Proxies (`lyzer_proxy.pine`, `baseline_simple.pine`)
- **Função**: Scripts PineScript v5 para reprodução e comparação de validação de estratégias diretamente na plataforma TradingView.
- **Maturidade**: Utilitários de pesquisa e auditoria externa.
