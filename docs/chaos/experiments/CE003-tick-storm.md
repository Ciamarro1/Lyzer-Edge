# Experimento de Caos CE003: Pico Extremo de Ticks (Tick Storm Burst)

- **ID do Experimento**: CE003
- **Componente Alvo**: `lyzer edge/backend/streamEngine.js` (`StreamEngine`)
- **Autor**: Production Reliability Auditor (`@[lyzer-guardian]`)

---

## 1. Hipótese
Injetar um burst de $5.000\text{ ticks/segundo}$ não deve ultrapassar $256\text{ MB}$ de consumo de V8 Heap devido ao capping de 1.000 candles max no buffer $1m$.

## 2. Comando de Execução
```bash
# Executar teste de carga de alta frequência
cmd /c npx vitest run tests/observability/benchmark_baseline.test.js
```

## 3. Métricas Esperadas
- `lyzer_pipeline_ticks_received_total` $+5000$
- `lyzer_runtime_heap_usage_bytes` $< 268435456\text{ bytes}$ ($256\text{ MB}$)

## 4. Critério de Aprovação / Reprovação
- **APROVADO**: Estabilidade do Heap do V8 e latência P99 $< 50\text{ ms}$ em rajada.
- **REPROVADO**: Exceção `JavaScript heap out of memory`.
