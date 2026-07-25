# Experimento de Caos CE002: Perda Temporária de Conexão WebSocket (Binance Desync)

- **ID do Experimento**: CE002
- **Componente Alvo**: `lyzer edge/backend/streamEngine.js` (`StreamEngine`)
- **Autor**: Production Reliability Auditor (`@[lyzer-guardian]`)

---

## 1. Hipótese
A desconexão forçada do soquete WebSocket por 30 segundos deve acionar o fallback loop com a trava `isFallbackActive = true`, emitir alertas resilientes via Telegram e restabelecer a conexão sem duplicação de ticks.

## 2. Comando de Execução
```bash
# Executar a suíte E2E de simulação de queda de conexão
cmd /c npx vitest run tests/e2e/cognitive_flow.test.js
```

## 3. Métricas Esperadas
- `lyzer_pipeline_ticks_received_total` com incremento contínuo durante o fallback
- `lyzer_system_active_connections` atualizado para `0` durante a desconexão

## 4. Critério de Aprovação / Reprovação
- **APROVADO**: Re-conexão bem-sucedida com restabelecimento limpo do estado do mercado.
- **REPROVADO**: Execução paralela dupla do loop sintético e do stream real.
