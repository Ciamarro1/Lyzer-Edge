# Plano de Engenharia do Caos e Resiliência (Chaos Engineering Plan) — Lyzer Edge

- **Status**: Aprovado pelo Comitê SRE & Reliability Engineering
- **Data**: 2026-07-22
- **Autor**: Production Reliability Lead (`@[lyzer-guardian]`)

---

## 🎯 Objetivo dos Experimentos de Caos

Validar a resiliência anti-frágil do ecossistema **Lyzer Edge** sob condições extremas de estresse operacional, falhas de infraestrutura, latência induzida e oscilações de rede.

A métrica principal de sucesso em todos os experimentos é a **preservação do axioma constitucional de não-colapso e a integridade causal dos eventos (UUIDv7)**.

---

## 🧪 Experimento 1: Degradação de Latência no SQLite (Disk I/O Slowdown)

### Hipótese:
O atraso sintético na gravação do SQLite não deve bloquear o Event Loop do Node.js nem causar vazamento de memória nos buffers de candles.

### Experimento:
Injetar um atraso de $500\text{ ms}$ em `CausalMemoryDB.insertBatch()` durante a ingestão ativa de ticks por 60 segundos.

### Métricas Observadas:
- `lyzer_persistence_sqlite_write_duration_seconds`
- `lyzer_runtime_event_loop_lag_seconds`

### Critério de Sucesso:
- Lag do Event Loop permanece $< 5\text{ ms}$.
- O WebSocket continua respondendo a requisições de leitura de clientes sem congelamento da UI.

### Procedimento de Rollback:
Remover o atraso sintético no wrapper do banco de dados.

---

## 🧪 Experimento 2: Perda Temporária de Conexão WebSocket (Binance Desync)

### Hipótese:
Ao perder a conexão live com a Binance, o `StreamEngine` deve ativar o `fallbackInterval` simutâneo com a flag `isFallbackActive = true` sem duplicar ticks e restaurar a conexão de forma limpa.

### Experimento:
Simular desconexão abrupta do soquete TCP (`WebSocket.close(1006)`) por 30 segundos e restaurar a conexão.

### Métricas Observadas:
- `lyzer_pipeline_ticks_received_total`
- `lyzer_system_active_connections`

### Critério de Sucesso:
- Zero race conditions entre o simulador e o stream real.
- Emissão do alerta Telegram via `sendTelegramAlertWithRetry` com retentativa com sucesso.

### Procedimento de Rollback:
Re-conectar o soquete TCP e resetar os contadores de fallback.

---

## 🧪 Experimento 3: Pico Extremo de Ticks (High-Frequency Tick Burst)

### Hipótese:
Injetar uma rajada de $5.000\text{ ticks/segundo}$ não deve estourar o Heap do V8 devido ao capping de 1.000 candles max no buffer $1m$.

### Experimento:
Publicar 5.000 Klines sintéticas sequenciais na porta do `StreamEngine` em menos de 1 segundo.

### Métricas Observadas:
- `lyzer_runtime_heap_usage_bytes`
- `lyzer_pipeline_tick_processing_duration_seconds`

### Critério de Sucesso:
- O Heap do V8 não ultrapassa $256\text{ MB}$.
- Todos os $5.000$ ticks são processados ou descartados de forma segura sem crash do processo.

---

## 🧪 Experimento 4: Atraso na Resposta do RiskGateway Rust (IPC Delay)

### Hipótese:
Um atraso de $2\text{ segundos}$ na chamada gRPC para o Risk Gateway em Rust deve resultar em rejeição constitucional imediata por estouro de timeout sem travar o processamento do mercado.

### Experimento:
Introduzir `tokio::time::sleep(Duration::from_secs(2))` no serviço `RiskGateway.Authorize` em Rust.

### Métricas Observadas:
- `lyzer_constitution_risk_gateway_latency_seconds`
- `lyzer_constitution_veto_total`

### Critério de Sucesso:
- A ECA Court rejeita a ordem por timeout de autorização de risco (`VETO_RISK_GATEWAY_TIMEOUT`).
- O sistema permanece operacional.

---

## 🧪 Experimento 5: Pressão e Fragmentação de Memória V8 (Garbage Collection Spikes)

### Hipótese:
Forçar ciclos de Garbage Collection intensivos não deve corromper os tensores Float32 do `ScaleNormalizer`.

### Experimento:
Alocar e desalocar arrays pesados em paralelo com o processamento de sinais SMC.

### Métricas Observadas:
- `lyzer_runtime_gc_duration_seconds`
- `lyzer_pipeline_csrl_processing_duration_seconds`

### Critério de Sucesso:
- A acurácia das invariantes do CSRL permanece idêntica.
- Tempo de pausa do GC permanece $< 20\text{ ms}$.

---

## 🧪 Experimento 6: Explosão de Eventos e Saturação do Event Loop (Event Storm)

### Hipótese:
Ao receber requisições simultâneas de clientes na API REST e WebSocket, a rota `/metrics` deve continuar respondendo em $< 5\text{ ms}$.

### Experimento:
Disparar 500 requisições simultâneas HTTP em `/api/trades/close` em paralelo com a raspagem da rota `/metrics`.

### Métricas Observadas:
- `lyzer_system_errors_total`
- Rota `/metrics` HTTP Status 200.

### Critério de Sucesso:
- Rota `/metrics` responde com código `200 OK` e `Content-Type: text/plain; version=0.0.4`.
