# Guia Operacional de Resposta a Incidentes (Runbook SRE) — Lyzer Edge

- **Status**: Aprovado pelo Comitê SRE
- **Data**: 2026-07-22
- **Autor**: Principal SRE Engineer (`@[lyzer-guardian]`)

---

## 🚨 Procedimentos de Emergência e Resposta a Incidentes

### Incidente 1: Pico de Latência no Pipeline ($P_{99} > 15\text{ ms}$)

#### Sintomas:
- Alerta Prometheus: `LyzerPipelineHighLatencyP99`.
- O Dashboard apresenta congelamentos na atualização do espectrograma.

#### Diagnóstico:
1. Verificar lag do Event Loop do Node.js:
   ```bash
   curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:7860/metrics | grep lyzer_runtime_event_loop_lag_seconds
   ```
2. Verificar tempo de escrita no SQLite:
   ```bash
   curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:7860/metrics | grep lyzer_persistence_sqlite_write_duration_seconds
   ```

#### Ação Corretiva:
- Se o gargalo for I/O de disco no SQLite: Confirmar se o modo WAL está ativado (`PRAGMA journal_mode;`).
- Se o gargalo for V8 Heap Lag: Forçar re-inicialização graciosa da instância via `/api/trades/wipe` ou reiniciar o pod Kubernetes.

---

### Incidente 2: Disparo Descontrolado de Vetos Constitucionais (`VETO_MOL_RECOVERY_PENDING`)

#### Sintomas:
- Alerta: `LyzerConstitutionalVetoSpike`.
- Nenhuma ordem é autorizada pela ECA Court por mais de 50 ticks consecutivos.

#### Diagnóstico:
1. Inspecionar estresse C-CLIST e estado MOL:
   ```bash
   node -e "console.log(require('./lyzer edge/backend/streamEngine.js'))"
   ```
2. Confirmar se o mercado apresentou regime de colapso ou ilusão de estabilidade.

#### Ação Corretiva:
- **NÃO** alterar parâmetros da Corte durante operação Live.
- Aguardar a contagem progressiva de estabilização do MOL (`sclThreshold` ticks consecutivos estáveis) para restabelecimento automático da autorização de execução.

---

### Incidente 3: Falha de Conectividade com o Proxy/Telegram (`TELEGRAM_RETRY_EXHAUSTED`)

#### Sintomas:
- Log de erro: `[TELEGRAM RETRY EXHAUSTED]`.
- Alertas de operação deixam de ser entregues no canal do Telegram.

#### Diagnóstico:
- Verificar conectividade com a API do Telegram (`api.telegram.org`) ou proxy HTTP configurado.

#### Ação Corretiva:
- O sistema continuará operando normalmente no modo isolado. A fila de retry protegerá o envio de mensagens sem interromper a execução de ordens ou causar exceção no Event Loop.
