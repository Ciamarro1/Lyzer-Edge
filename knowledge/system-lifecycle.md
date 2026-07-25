---
titulo: "Lyzer Edge — Ciclo de Vida do Sistema"
versao: "3.4.0-institutional"
---

# 🔄 Lyzer Edge — Ciclo de Vida do Sistema

1. **Bootstrap (`server.js`)**:
   - Inicializa banco SQLite WAL `/tmp/data/historical_causal_memory.db`.
   - Carrega `ConstitutionalCourt` singleton e configura limiares C-CLIST e MOL.
   - Instancia 6 engines de `StreamEngine` (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`, `ADAUSDT`, `XRPUSDT`).
2. **Execution Loop**:
   - Recebe ticks a cada 500ms--2s. Executa travas instantâneas de SL/TP.
   - Ao fechar vela de 1m (`onCandleClose`), roda o pipeline completo de 7 camadas.
3. **Shutdown Gracioso**:
   - Salva estado atual em `/tmp/data/engine_state.json`.
   - Fecha conexões WebSocket e encerra o servidor HTTP na porta 7860.

---

## 🔗 Links Relacionados
- ⚡ [Fluxo de Execução](execution-flow.md)
- ⚙️ [Configuração](configuration.md)
