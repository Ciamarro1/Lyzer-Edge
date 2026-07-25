# Catálogo Oficial de Métricas — Lyzer Edge

- **Status**: Aprovado pelo Comitê de Observabilidade & SRE
- **Data**: 2026-07-22
- **Autor**: Observability Architect (`@[lyzer-guardian]`)

---

## 📋 Catálogo Completo de Métricas Institucionais

### 1. Métricas de Runtime do Processo (`lyzer_runtime_*`)

| Nome da Métrica | Tipo | Rótulos (Labels) | Descrição |
|---|---|---|---|
| `lyzer_runtime_event_loop_lag_seconds` | Gauge | `service` | Atraso no Event Loop do Node.js (V8 lag) |
| `lyzer_runtime_heap_usage_bytes` | Gauge | `type` (`used`, `total`) | Uso de memória Heap em bytes |
| `lyzer_runtime_gc_duration_seconds` | Histogram | `gc_type` | Duração das pausas de Garbage Collection |
| `lyzer_runtime_process_cpu_usage_ratio` | Gauge | `mode` (`user`, `system`) | Taxa de utilização de CPU do processo |

### 2. Métricas do Pipeline de Mercado (`lyzer_pipeline_*`)

| Nome da Métrica | Tipo | Rótulos (Labels) | Descrição |
|---|---|---|---|
| `lyzer_pipeline_ticks_received_total` | Counter | `symbol`, `source` | Total de candle ticks ingeridos |
| `lyzer_pipeline_tick_processing_duration_seconds` | Histogram | `symbol`, `status` | Duração total de processamento por tick ($P_{50}, P_{95}, P_{99}$) |
| `lyzer_pipeline_csrl_processing_duration_seconds` | Histogram | `symbol` | Duração do alinhamento tensorial CSRL |
| `lyzer_pipeline_cclist_evaluation_duration_seconds` | Histogram | `symbol` | Duração do cálculo do oráculo de estresse C-CLIST |

### 3. Métricas da Camada Constitucional (`lyzer_constitution_*`)

| Nome da Métrica | Tipo | Rótulos (Labels) | Descrição |
|---|---|---|---|
| `lyzer_constitution_evaluations_total` | Counter | `symbol`, `decision` (`ALLOW`, `REJECT`) | Total de avaliações da ECA Court |
| `lyzer_constitution_veto_total` | Counter | `symbol`, `reason_code` | Contagem total de vetos constitucionais por motivo |
| `lyzer_constitution_risk_gateway_latency_seconds` | Histogram | `service`, `status` | Latência da chamada gRPC para o Risk Gateway em Rust |

### 4. Métricas da Camada de Persistência (`lyzer_persistence_*`)

| Nome da Métrica | Tipo | Rótulos (Labels) | Descrição |
|---|---|---|---|
| `lyzer_persistence_sqlite_write_duration_seconds` | Histogram | `operation` (`insert`, `update`) | Duração das operações de escrita no SQLite |
| `lyzer_persistence_sqlite_lock_wait_seconds` | Histogram | `db_name` | Tempo de espera por lock de banco relacional |
| `lyzer_persistence_queue_depth` | Gauge | `queue_name` | Profundidade da fila de gravação assíncrona |

### 5. Métricas de Saúde e Operação (`lyzer_system_*`)

| Nome da Métrica | Tipo | Rótulos (Labels) | Descrição |
|---|---|---|---|
| `lyzer_system_uptime_seconds` | Counter | `node_id` | Tempo decorrido de execução contínua (Uptime) |
| `lyzer_system_errors_total` | Counter | `component`, `error_type` | Total de exceções ou falhas capturadas |
| `lyzer_system_active_connections` | Gauge | `protocol` (`ws`, `grpc`, `http`) | Conexões ativas no sistema |

---

## 🎯 Definição de Buckets dos Histogramas

Para garantir captura precisa das caudas de latência ($P_{50} \dots P_{99.9}$), os histogramas utilizarão os seguintes buckets predefinidos (em segundos):

```javascript
// Buckets de latência de tick em segundos:
// 0.1ms, 0.5ms, 1ms, 2.5ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s
const PIPELINE_LATENCY_BUCKETS = [
  0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1.0
];
```
