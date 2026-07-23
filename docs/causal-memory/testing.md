# Suíte de Testes da Memória Causal (Fase 5.5) — Lyzer Edge

- **Status**: Aprovado (17 suítes, 177 testes verdes)
- **Data**: 2026-07-22
- **Autor**: Lyzer Architecture Guardian (`@[lyzer-guardian]`)

---

## 🧪 Estrutura de Testes Automatizados (`lyzer edge/tests/causal-memory/`)

1. **`eventFactory.test.js`**: Valida a geração de UUIDv7 com ordenação por timestamp e cálculo determinístico de hash SHA-256.
2. **`eventValidator.test.js`**: Testa a validação de schema, a quebra de cadeia de hash e a detecção de adulteração de payload.
3. **`eventStore.test.js`**: Testa a inserção sequencial em modo append-only no banco SQLite WAL e consultas por `correlation_id`.
4. **`rewindEngine.test.js`**: Valida o replay temporal determinístico de eventos e a reconstrução do estado enxergado no timestamp $T_0$.
5. **`causalPipeline.test.js`**: Valida o fluxo completo de 5 estágios (Observation $\rightarrow$ Execution) mantendo as referências de `causation_id`.
