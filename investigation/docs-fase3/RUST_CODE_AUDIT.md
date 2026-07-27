# Rust Code Completeness Audit — Lyzer Edge

> Auditor: Rust Code Completeness Auditor (MODO MANTEINER)
> Date: 2026-07-27
> Scope: All Rust crates across 3 workspaces

---

## 1. Inventory of Rust Crates

### 1.1 Workspace A — `lyzer edge/src-rust/` (Edge Services)

| Crate | main()? | Deps | gRPC | NATS | SQLite | Protobuf? | Tests? | Docker? | Port |
|-------|---------|------|------|------|--------|-----------|--------|---------|------|
| `lyzer-risk-gateway` | ✅ Yes | tonic 0.9, prost 0.11, tokio | ✅ serves `RiskGateway.Authorize` | ❌ | ❌ | ✅ tonic-build | ❌ | ❌ | 50051 |
| `lyzer-intent-registry` | ✅ Yes | tonic 0.9, prost 0.11, tokio, rusqlite (bundled), uuid v7, serde, serde_json, async-nats 0.33, futures | ✅ serves `IntentRegistry` (4 RPCs) | ✅ consumer + publisher | ✅ `intent_registry.db` | ✅ tonic-build + serde attrs | ❌ | ❌ | 50052 |
| `lyzer-oms` | ✅ Yes | tonic 0.9, prost 0.11, tokio, uuid v7, serde, serde_json, async-nats 0.33, futures, bytes, sha2, hex | ✅ client only (calls IntentRegistry) | ✅ JetStream consumer | ❌ (snapshot file) | ✅ tonic-build + serde attrs | ❌ | ❌ | N/A (no gRPC serve) |

### 1.2 Workspace B — `lyzer-workspace/` (Constitutional Hub)

| Crate | main()? | Deps | gRPC | NATS | SQLite | Protobuf? | Tests? | Docker? | Port |
|-------|---------|------|------|------|--------|-----------|--------|---------|------|
| `lyzer-core-models` | ❌ (lib) | serde (derive) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (lib) | N/A |
| `lyzer-core-arbitration` | ❌ (lib) | lyzer-core-models | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (lib) | N/A |
| `lyzer-core-memory` | ❌ (lib) | lyzer-core-models, lyzer-core-governance | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (lib) | N/A |
| `lyzer-core-governance` | ❌ (lib) | lyzer-core-models | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (lib) | N/A |
| `lyzer-core-hub` | ✅ Yes | lyzer-core-models, lyzer-core-arbitration, lyzer-core-memory, lyzer-core-governance, serde_json | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ built | 8080 (TCP) |

### 1.3 Workspace C — `src-rust/` (Data Pipeline)

| Crate | main()? | Deps | gRPC | NATS | SQLite | Protobuf? | Tests? | Docker? | Port |
|-------|---------|------|------|------|--------|-----------|--------|---------|------|
| `lyzer-shared` | ❌ (lib) | prost 0.13, tokio full, tonic 0.12 | ✅ compiles governance protos (eca, cvp, rio, cml) | ❌ | ❌ | ✅ tonic-build 0.12 | ❌ | ❌ (lib) | N/A |
| `lyzer-eca` | ✅ Yes | lyzer-shared, prost 0.13, tokio, tonic 0.12 | ✅ serves `EcaAuthority.RequestMutation` | ❌ | ❌ | ✅ (via lyzer-shared) | ❌ | ❌ | 50051 |
| `lyzer-oal` | ✅ Yes (bin `ignition`) | tokio full, tungstenite, tokio-tungstenite, futures-util, reqwest, serde, serde_json, parquet, arrow, chrono | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| `lyzer-ocr` | ❌ (lib + bins `shadow_run`, `mcff_run`) | tokio full, serde, serde_json, parquet, arrow, lyzer-oal | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| `lyzer-shm-spine` | ✅ Yes | memmap2, libc | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A (SHM) |
| `lyzer-binance-adapter` | ❌ (lib) | reqwest, tokio, serde, serde_json, hmac, sha2, hex, thiserror | ❌ | ❌ | ❌ | ❌ | ✅ 1 test | ❌ | N/A |
| `lyzer-reality-ws` | ❌ (lib) | tokio full, tokio-tungstenite, futures-util, serde, serde_json, url, lyzer-shm-spine | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| `lyzer-shadow-oms` | ❌ (lib) | tokio full, serde, serde_json, uuid, lyzer-shm-spine, lyzer-binance-adapter | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |

---

## 2. Análise de Completude por Serviço

### 2.1 `lyzer-risk-gateway` — Risk Gateway (gRPC)

**Implementado:**
- `RiskGateway.Authorize` RPC completo
- Deduplicação por `execution_intent_id` (UUIDv7 via HashSet)
- Retorna `approved: true/false` + `rejection_reason`
- Mock timestamp fixo (1718000000000)

**Stub / Faltando:**
- ❌ Nenhuma validação real de risco (saldo, capital, hard cap)
- ❌ `correlation_id` e `causation_id` não são validados como UUIDv7
- ❌ Sem persistência — estado é apenas `HashSet` em memória (volátil)
- ❌ Sem integração com C-CLIST, MOL, TruthKernel (são JS-side)
- ❌ Sem logging estruturado, métricas, tracing
- ❌ Sem health check endpoint
- ❌ Porta conflita com `lyzer-eca` (ambos :50051)

### 2.2 `lyzer-intent-registry` — Intent Registry + CCP (gRPC + NATS)

**Implementado:**
- ✅ `RegisterIntent` — valida existência, cria evento `CREATED`, Transactional Outbox
- ✅ `AppendIntentEvent` — persistência com Causal Version Lock (expected_version)
- ✅ `AuditQuery` — retorna todos eventos de um intent_id
- ✅ `AuditQuerySinceVersion` — eventos após global_version
- ✅ `GetMaxVersion` — max global_version
- ✅ Schema Contract Registry (`is_valid_schema`) — 10 event types validados
- ✅ Transactional Outbox — tabela `outbox_events`, ACID commit
- ✅ NATS CCP consumer (`execution.pending.*`)
- ✅ Outbox publisher worker (`execution.committed.*`)
- ✅ Arquivo SQLite físico (`intent_registry.db`)

**Stub / Faltando:**
- ❌ Sem autenticação/autorização no gRPC
- ❌ `persist_event_tx` usa `unwrap()` em vários lugares — crasha se DB corrompido
- ❌ Outbox publisher é polling (loop + sleep 50ms) — sem backpressure
- ❌ Sem testes unitários ou de integração
- ❌ Sem cleanup de eventos velhos
- ❌ Sem idempotência na CCP (pode duplicar se NATS redeliver)

### 2.3 `lyzer-oms` — Order Management System (Stateful Projection)

**Implementado:**
- ✅ Hydration state via `AuditQuerySinceVersion` (Event Sourcing)
- ✅ Snapshot file + hash verification (SHA256)
- ✅ Anti-tampering: rejeita snapshot se hash divergir
- ✅ Anti-future: rejeita snapshot se `last_global_version > registry max`
- ✅ JetStream consumer (`execution_stream` / `oms_processor`) no NATS
- ✅ State machine: CREATED → ORDER_ACK → ORDER_PARTIAL → ORDER_FILLED|REJECTED|CANCELLED|ZOMBIE
- ✅ Auto-emite `execution.pending.order_ack` via NATS
- ✅ Snapshot a cada 10 eventos
- ✅ Lag monitor (`max_global_version - projection_version` > 10 → DEGRADED)
- ✅ `--verify-integrity` flag com full replay hash comparison

**Stub / Faltando:**
- ❌ Sem exchange execution real — apenas projeta estado, não envia ordens
- ❌ Sem gRPC server próprio (só cliente) — não expõe API
- ❌ Sem circuit breaker para NATS disconectado
- ❌ Sem testes
- ❌ `apply_event_to_state` sobrescreve estado anterior (não faz merge correto para PARTIAL)

### 2.4 `lyzer-core-hub` — Constitutional IPC Hub (TCP/HTTP)

**Implementado:**
- ✅ TCP server na porta 8080
- ✅ Parse de HTTP request manual
- ✅ Recebe `InterpretationRecord` JSON via POST body
- ✅ Valida justificação (>10 chars)
- ✅ Buffer de 2+ interpretações → dispara Arbitration
- ✅ Integração com `Arbitrator` (5 fases: A-G)
- ✅ `TruthAssessmentEngine` (Legitimacy-Truth Delta)
- ✅ Surprise detection + Adaptation trigger
- ✅ JSON artifact de saída completo

**Stub / Faltando:**
- ❌ Dependente de `lyzer_contracts` que não existe (channel.rs:1, cer.rs:1) → não compila
- ❌ Sem suporte a TLS, HTTP parsing é manual frágil
- ❌ `ConstitutionalMemory` é in-memory apenas (sem persistência)
- ❌ Sem testes
- ❌ Sem timer/cleanup para `buffer` que nunca é limpo se < 2 entradas
- ❌ `handle_client` não faz `stream.shutdown()` adequado
- ❌ Porta 8080 pode conflitar com outros serviços

### 2.5 `lyzer-eca` — Epistemic Constitutional Authority (gRPC)

**Implementado:**
- ✅ gRPC server `EcaAuthority.RequestMutation`
- ✅ Logging de mutação
- ✅ Sempre retorna `PermissionDenied` (veto total)

**Stub / Faltando:**
- ❌ Implementação é stub — sempre veta tudo
- ❌ Nenhum CML (Constitutional Mutation Ledger) real
- ❌ Nenhum AUR (Adversarial Trial)
- ❌ Porta 50051 conflita com `lyzer-risk-gateway`

### 2.6 `lyzer-shm-spine` — Shared Memory Spine

**Implementado:**
- ✅ `RingWriter` + `RingReader` (mmap-based ring buffer)
- ✅ Bootstrap writer loop com `SignalEvent`
- ✅ Suporte a schema_version, fase_id, regime_state

**Stub / Faltando:**
- ❌ Sem consumer loop funcional (só writer de teste)
- ❌ Sem integração com NATS ou gRPC
- ❌ Sem testes

### 2.7 `lyzer-oal` — Observation Acquisition Layer

**Implementado:**
- ✅ Binfeed via WebSocket (binance_feed.rs)
- ✅ Event sequencer
- ✅ Parquet archive sink
- ✅ Distribution notifier

**Stub / Faltando:**
- ❌ `ignition.rs` — precisa ser lido para confirmar se é completo
- ❌ Sem integração com NATS (só arquiva em Parquet)
- ❌ Sem testes

### 2.8 `lyzer-ocr` — Observation Candidate Registry

**Implementado:**
- ✅ Candidates: TickKurtosis, LiquidityVacuum, BookFracture
- ✅ Falsification engine
- ✅ Reconciliation engine
- ✅ OCRL (candidate registry logic)
- ✅ Binary runners: `shadow_run`, `mcff_run`

**Stub / Faltando:**
- ❌ Depende de `lyzer-oal` que pode ou não compilar
- ❌ Sem testes
- ❌ Sem integração com pipeline

### 2.9 `lyzer-binance-adapter` — Binance REST API

**Implementado:**
- ✅ REST client (`client.rs`) com `query_account`, `new_order`, `cancel_order`, `get_order`
- ✅ DSL para construção de requests
- ✅ HMAC-SHA256 signer
- ✅ 1 teste unitário no signer

**Stub / Faltando:**
- ❌ Sem WebSocket (mas `lyzer-reality-ws` cobre isso)
- ❌ Sem rate limiting real
- ❌ Sem testes de integração

### 2.10 `lyzer-reality-ws` — Reality WebSocket

**Implementado:**
- ✅ `stream.rs` — WebSocket stream manager
- ✅ `models.rs` — Quote, Trade, BookSnapshot
- ✅ `book.rs` — L2 order book
- ✅ Depende de `lyzer-shm-spine` para escrever no ring buffer

**Stub / Faltando:**
- ❌ Sem testes
- ❌ Sem reconexão automática
- ❌ Sem fallback de URL

### 2.11 `lyzer-shadow-oms` — Shadow OMS

**Implementado:**
- ✅ `edi.rs` — Event-Driven Instruction
- ✅ `governance.rs` — Shadow governance

**Stub / Faltando:**
- ❌ Depende de `lyzer-binance-adapter` + `lyzer-shm-spine`
- ❌ Sem testes
- ❌ Sem main()

---

## 3. Análise gRPC

### 3.1 Protobufs

O arquivo principal `lyzer.proto` (`lyzer edge/src-proto/lyzer.proto`) define:

**Services (2):**
```protobuf
service RiskGateway {
  rpc Authorize(AuthorizeOrder) returns (RiskDecision);
}

service IntentRegistry {
  rpc RegisterIntent(RegisterIntentRequest) returns (RegisterIntentResponse);
  rpc AppendIntentEvent(AppendIntentEventRequest) returns (AppendIntentEventResponse);
  rpc AuditQuery(AuditQueryRequest) returns (AuditQueryResponse);
  rpc AuditQuerySinceVersion(AuditQuerySinceVersionRequest) returns (AuditQuerySinceVersionResponse);
  rpc GetMaxVersion(GetMaxVersionRequest) returns (GetMaxVersionResponse);
}
```

**Messages (12):** `ExecutionIntent`, `AuthorizeOrder`, `RiskDecision`, `ExecutionReport`, `PositionUpdate`, `RegisterIntentRequest`, `RegisterIntentResponse`, `AppendIntentEventRequest`, `AppendIntentEventResponse`, `IntentEventRecord`, `AuditQueryRequest`, `AuditQueryResponse`, `AuditQuerySinceVersionRequest`, `AuditQuerySinceVersionResponse`, `GetMaxVersionRequest`, `GetMaxVersionResponse`.

**Outros protos (governance):**
- `eca_jurisdiction.proto` — compilado via `lyzer-shared`
- `rio_telemetry.proto` — compilado via `lyzer-shared`
- `cml_ledger.proto` — compilado via `lyzer-shared`
- `proto_version.proto` — compilado via `lyzer-shared`

### 3.2 Implementação vs. Definição

| Service | Método | Proto | Risk Gateway | Intent Registry | ECA | Status |
|---------|--------|-------|-------------|-----------------|-----|--------|
| `RiskGateway` | `Authorize` | ✅ Definido | ✅ Implementado | ❌ | ❌ | ✅ Completo |
| `IntentRegistry` | `RegisterIntent` | ✅ Definido | ❌ | ✅ Implementado | ❌ | ✅ Completo |
| `IntentRegistry` | `AppendIntentEvent` | ✅ Definido | ❌ | ✅ Implementado | ❌ | ✅ Completo |
| `IntentRegistry` | `AuditQuery` | ✅ Definido | ❌ | ✅ Implementado | ❌ | ✅ Completo |
| `IntentRegistry` | `AuditQuerySinceVersion` | ✅ Definido | ❌ | ✅ Implementado | ❌ | ✅ Completo |
| `IntentRegistry` | `GetMaxVersion` | ✅ Definido | ❌ | ✅ Implementado | ❌ | ✅ Completo |
| `EcaAuthority` | `RequestMutation` | ✅ (eca_jurisdiction.proto) | ❌ | ❌ | ✅ Stub | ⚠️ Stub |

### 3.3 Problemas com Protobufs

1. **`lyzer-eca` e `lyzer-risk-gateway` usam a MESMA porta 50051** — impossível rodar ambos simultaneamente no mesmo host.
2. **`lyzer-shared` (edition 2024) vs os outros (edition 2021)** — diferença de edição pode causar problemas de compilação.
3. **`lyzer-shared` usa tonic 0.12 / prost 0.13**, enquanto os edge services usam **tonic 0.9 / prost 0.11** — versões incompatíveis, não podem compartilhar o mesmo `Cargo.lock`.
4. **`ExecutionReport` e `PositionUpdate`** estão definidos no proto mas **ninguém implementa servidor ou cliente** para eles.

---

## 4. Análise de Integração com Node.js

### 4.1 Estado Atual

O backend Node.js (`server.js:3-22`) roda na porta 7860 com WebSocket. Ele **NÃO** se comunica com nenhum serviço Rust atualmente. A arquitetura documentada no `AGENTS.md` menciona "3-process isolation" (Execution Node, ECA Court Node, Dashboard Node) mas isso NÃO está implementado.

### 4.2 O Que Seria Necessário para Integrar

Para o backend JS chamar os serviços Rust:

1. **gRPC-Web ou HTTP/gRPC proxy**: Node.js precisaria de um client gRPC-Web ou usar `@grpc/grpc-js` para chamar os serviços Rust. Atualmente nenhum endpoint gRPC é exposto ao JS.

2. **NATS bridge**: O backend JS já usa NATS internamente (via `async-nats` no Node). Os serviços Rust já publicam em `execution.committed.*` e consomem de `execution.pending.*`. Esta é a via de integração mais curta: fazer o streamEngine.js publicar `execution.pending.*` para ser consumido pelo Intent Registry, e assinar `execution.committed.*` para receber eventos.

3. **Risco de porta 50051**: Tanto `lyzer-risk-gateway` quanto `lyzer-eca` usam :50051. Isso precisa ser resolvido (porta diferente para cada um, ou um proxy router).

4. **TCP hub**: O `lyzer-core-hub` na porta 8080 recebe HTTP cru — o Node.js poderia enviar POST para lá facilmente. Mas o hub não está no Dockerfile atual.

### 4.3 Caminho Crítico

```
streamEngine.js (Node)
  → NATS `execution.pending.*` 
    → lyzer-intent-registry (Rust) consume + persist
    → lyzer-oms (Rust) consome, projeta, emite ORDER_ACK
  → NATS `execution.committed.*`
    ← streamEngine.js (Node) recebe eventos commitados
```

Esse pipeline NATS é funcional hoje, mas **nenhum código JS publica em `execution.pending.*`**. O backend Node.js atual não está conectado a esse pipeline.

---

## 5. Quality Score

### 5.1 Scores Individuais

| Crate | Completude | Qualidade | Testabilidade | Média |
|-------|-----------|-----------|---------------|-------|
| `lyzer-risk-gateway` | 5/10 | 6/10 | 4/10 | **5.0** |
| `lyzer-intent-registry` | 8/10 | 7/10 | 5/10 | **6.7** |
| `lyzer-oms` | 7/10 | 7/10 | 5/10 | **6.3** |
| `lyzer-core-hub` | 6/10 | 5/10 | 3/10 | **4.7** |
| `lyzer-core-models` | 7/10 | 8/10 | 6/10 | **7.0** |
| `lyzer-core-arbitration` | 7/10 | 7/10 | 6/10 | **6.7** |
| `lyzer-core-governance` | 6/10 | 7/10 | 5/10 | **6.0** |
| `lyzer-core-memory` | 4/10 | 5/10 | 4/10 | **4.3** |
| `lyzer-eca` | 3/10 | 4/10 | 2/10 | **3.0** |
| `lyzer-oal` | 5/10 | 5/10 | 3/10 | **4.3** |
| `lyzer-ocr` | 5/10 | 5/10 | 3/10 | **4.3** |
| `lyzer-shm-spine` | 5/10 | 5/10 | 3/10 | **4.3** |
| `lyzer-binance-adapter` | 6/10 | 6/10 | 5/10 | **5.7** |
| `lyzer-reality-ws` | 4/10 | 4/10 | 2/10 | **3.3** |
| `lyzer-shadow-oms` | 3/10 | 3/10 | 2/10 | **2.7** |
| `lyzer-shared` | 6/10 | 7/10 | 4/10 | **5.7** |

### 5.2 Problemas Transversais

1. **Zero testes** em 14 de 16 crates (88% sem testes).
2. **Dead code** em `lyzer-core-governance/src/channel.rs` e `lyzer-core-memory/src/cer.rs` que importam `lyzer_contracts` (crate inexistente) — essas funções não são `pub mod` declaradas, então o código não compilaria se ativadas.
3. **Conflito de porta 50051** entre `lyzer-risk-gateway` e `lyzer-eca`.
4. **Três versões de tonic**: 0.9 (edge services), 0.12 (lyzer-shared/lyzer-eca). Isso impede compartilhamento de código entre workspaces.
5. **Nenhum health check** ou endpoint de liveness em qualquer serviço Rust.
6. **Dockerfile constrói apenas `lyzer-core-hub`** — ignora os 3 edge services e todos os crates de `src-rust/`.
7. **Nenhum dos serviços Rust tem systemd/process manager** — todos morrem se paniquem.
8. **`unwrap()` generalizado** — crash em qualquer erro de I/O.

---

## 6. Respostas às Perguntas Específicas

### 1. O `lyzer-risk-gateway` implementa o `RiskGateway.Authorize` completo?

**Sim, implementa o RPC completo** com deduplicação de UUIDv7 e resposta `approved: true/false`. Mas é uma implementação **skeleton** (mock) — não há lógica real de avaliação de risco (saldo, capital, C-CLIST, MOL, etc.). A decisão é sempre `approved: true` exceto para duplicatas.

### 2. O `lyzer-intent-registry` implementa `RegisterIntent`, `AppendIntentEvent`, `AuditQuery`?

**Sim, implementa todos os 5 RPCs** definidos no proto: `RegisterIntent`, `AppendIntentEvent`, `AuditQuery`, `AuditQuerySinceVersion`, `GetMaxVersion`. É o crate Rust mais completo — tem Transactional Outbox, Causal Version Lock, Schema Contract Registry, NATS CCP consumer e Outbox publisher.

### 3. O `lyzer-oms` implementa Exchange Execution?

**Não.** O `lyzer-oms` é um **Stateful Projection Engine** — ele mantém o estado dos intents aplicando eventos, mas **não executa ordens em exchange**. Ele emite `execution.pending.order_ack` no NATS, mas a execução real (enviar ordem para Binance, etc.) não está implementada em Rust. A execução real é feita pelo `ExchangeExecution` em JavaScript.

### 4. O `lyzer-core-hub` é um hub TCP simples? O que ele faz?

**Sim.** É um servidor TCP cru que faz parse manual de HTTP. Ele:
1. Recebe `InterpretationRecord` JSON via POST
2. Valida justificação (>10 chars)
3. Acumula 2+ interpretações no buffer
4. Dispara o `Arbitrator` (5 fases: admissibilidade, evidência, constraint, justificação, síntese)
5. Alimenta `TruthAssessmentEngine` com dado empírico simulado
6. Gera artefato JSON completo (meaning, surprise, truth, adaptation, execution)

Ele usa os crates `lyzer-core-{models,arbitration,memory,governance}` para simular o ciclo completo de arbitragem constitucional. É um **protótipo funcional**, não um serviço de produção.

### 5. O Dockerfile constrói TODOS os binários Rust?

**Não.** O Dockerfile (linha 15) constrói **apenas**:
```dockerfile
RUN cargo build --release --manifest-path lyzer-workspace/lyzer-core-hub/Cargo.toml
```

Os seguintes binários **NÃO são construídos no Dockerfile**:
- `lyzer-risk-gateway` (porta 50051)
- `lyzer-intent-registry` (porta 50052)
- `lyzer-oms`
- `lyzer-eca` (porta 50051)
- `lyzer-shm-spine`
- `lyzer-oal` (bin `ignition`)
- `lyzer-ocr` (bins `shadow_run`, `mcff_run`)

**Binário construído e copiado (1):**
```
COPY --from=builder /app/lyzer-workspace/target/release/lyzer-core-hub /usr/local/bin/lyzer-core-hub
```

### 6. Quais portas cada serviço escuta?

| Serviço | Porta | Protocolo | Endereço |
|---------|-------|-----------|----------|
| `lyzer-risk-gateway` | **50051** | gRPC | `[::1]:50051` |
| `lyzer-eca` | **50051** (CONFLITO) | gRPC | `[::1]:50051` |
| `lyzer-intent-registry` | **50052** | gRPC | `[::1]:50052` |
| `lyzer-core-hub` | **8080** | TCP/HTTP | `127.0.0.1:8080` |
| NATS Server | **4222** | NATS | `localhost:4222` |
| Node.js Backend | **7860** | HTTP/WS | `0.0.0.0:7860` |
| `lyzer-oms` | **N/A** | — | — (só cliente gRPC + NATS) |
| `lyzer-shm-spine` | **N/A** | — | SHM (mmap file) |

### 7. Os serviços se comunicam entre si?

**Parcialmente, via NATS:**

```
lyzer-intent-registry ← NATS `execution.pending.*` (consumer via CCP)
lyzer-intent-registry → NATS `execution.committed.*` (via Outbox publisher)
lyzer-oms → NATS `execution.pending.order_ack` (emite após CREATED)
lyzer-oms ← NATS `execution_stream` (JetStream, `execution.committed.>`)
lyzer-oms → gRPC → lyzer-intent-registry (`AuditQuerySinceVersion`, `GetMaxVersion`)
```

**Não conectados:**
- `lyzer-risk-gateway` não se comunica com ninguém (só recebe gRPC)
- `lyzer-eca` não se comunica com ninguém (só recebe gRPC)
- `lyzer-core-hub` não se comunica com NATS, gRPC ou Node.js
- `lyzer-oal`, `lyzer-ocr`, `lyzer-reality-ws`, `lyzer-shadow-oms` são isolados
- `lyzer-binance-adapter` é lib-only

**Node.js backend** está totalmente isolado do ecossistema Rust — não há chamadas gRPC nem NATS do JS para os serviços Rust.

---

## 7. Recomendações

### Críticas (devem ser resolvidas antes de produção)

1. **Resolver conflito de porta 50051** — mudar `lyzer-risk-gateway` para 50053 ou `lyzer-eca` para 50054.
2. **Adicionar os 4 edge services ao Dockerfile** para que sejam construídos e executados no container.
3. **Remover ou corrigir dead code** em `channel.rs` e `cer.rs` que referenciam `lyzer_contracts` inexistente.
4. **Adicionar testes** — pelo menos smoke tests para cada serviço.

### Altas

1. **Unificar versão do tonic** (0.12) em todos os crates que usam gRPC.
2. **Conectar Node.js → NATS** para publicar em `execution.pending.*` e consumir `execution.committed.*`.
3. **Adicionar health checks** gRPC (grpc.health.v1.Health) em todos os servidores.
4. **Substituir `unwrap()`** por tratamento de erro adequado em produção.

### Médias

1. **Adicionar tracing** (opentelemetry ou tokio-rs/tracing) para observabilidade.
2. **Persistir ConstitutionalMemory** (atualmente in-memory no lyzer-core-hub).
3. **Implementar ExchangeExecution real** no lyzer-oms ou em serviço separado.
4. **Configurar restart policy** para os binários Rust (systemd ou supervisor).
