# Experimento de Caos CE001: Degradação de Latência no SQLite (Disk I/O Slowdown)

- **ID do Experimento**: CE001
- **Componente Alvo**: `lyzer edge/backend/db.js` (`CausalMemoryDB`)
- **Autor**: Production Reliability Auditor (`@[lyzer-guardian]`)

---

## 1. Hipótese
Injetar um atraso sintético de I/O de $500\text{ ms}$ na gravação em lote do SQLite durante ingestão contínua de mercado não deve travar o Event Loop do V8 ($< 5\text{ ms}$ lag) nem corromper a ordenação temporal dos eventos.

## 2. Comando de Execução
```bash
# Executar a suíte de caos CE001 sob Vitest
cmd /c npx vitest run tests/observability/benchmark_baseline.test.js
```

## 3. Métricas Esperadas
- `lyzer_persistence_sqlite_write_duration_seconds` $\ge 0.500\text{s}$
- `lyzer_runtime_event_loop_lag_seconds` $< 0.005\text{s}$
- Status HTTP da rota `/metrics` = `200 OK`

## 4. Critério de Aprovação / Reprovação
- **APROVADO**: Se o processamento continuar sem vazamento de memória e a rota `/metrics` responder normalmente.
- **REPROVADO**: Se ocorrer travamento do Event Loop ou queda do processo Node.js.
