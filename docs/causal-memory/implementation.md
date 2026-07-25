# Implementação do MVP da Memória Causal (Fase 5.5) — Lyzer Edge

- **Status**: Concluído & Testado (100% Green)
- **Data**: 2026-07-22
- **Autor**: Principal Backend Engineer & Lyzer Architecture Guardian (`@[lyzer-guardian]`)

---

## 🏛️ Visão Geral da Arquitetura Paralela (Adapter Pattern)

A implementação da **Fase 5.5** construiu a espinha dorsal da Memória Causal sob o diretório `lyzer edge/src/causal-memory/` sem alterar os contratos ou lógicas dos motores de mercado existentes (`StreamEngine`, `TruthKernel`, `ECA Court`, `RiskGateway`).

```
                    [ STAGE INGESTION ]
                            │
                            ▼
                [ CausalMemoryAdapter ]
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
[ EventFactory ]    [ EventValidator ]    [ EventStore ]
(UUIDv7 + SHA256)   (Hash Chain Check)   (SQLite WAL Log)
```

---

## 🛠️ Componentes Desenvolvidos

1. **`EventFactory.js`**: Gera o identificador UUIDv7, preenche os campos do contrato ADR-007 e calcula o digest SHA-256 encadeado (`hash`).
2. **`EventValidator.js`**: Valida a conformidade de schema e garante a inviolabilidade da Hash Chain SHA-256 (`hash_prev`).
3. **`EventStore.js`**: Persiste eventos em modo append-only na tabela `causal_events_log` do banco SQLite WAL.
4. **`ProjectionEngine.js`**: Mantém a visão em tempo de execução `current_causal_state` atualizada em memória.
5. **`RewindEngine.js`**: Executa o replay temporal determinístico de eventos até um timestamp $T_0$.
6. **`index.js` (CausalMemoryAdapter)**: Fachada unificada de captura para o pipeline sem efeitos colaterais na tomada de decisão.
