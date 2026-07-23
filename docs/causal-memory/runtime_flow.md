# Fluxo de Execução do Runtime Causal (Fase 5.5) — Lyzer Edge

- **Status**: Documentação Técnica de Fluxo
- **Data**: 2026-07-22
- **Autor**: Event Sourcing Engineer (`@[lyzer-guardian]`)

---

## 🔄 Fluxo de Captura dos 5 Estágios Cautelares

```
[1. recordObservation] ──► [2. recordReality] ──► [3. recordJudgment]
                                                           │
                                                           ▼
[5. recordExecution] ◄─────────────────────────── [4. recordRisk]
```

### Detalhamento da Trilha de Causalidade:
1. **`recordObservation`**: Capturado na chegada de Klines via `StreamEngine`.
2. **`recordReality`**: Capturado no alinhamento tensorial do `CSRL`, contendo o `causation_id` da observação precedente.
3. **`recordJudgment`**: Capturado ao término da avaliação constitucional da `ECA Court`, vinculando a evidência do veto/permissão.
4. **`recordRisk`**: Capturado na validação de limites pelo `RiskGateway`.
5. **`recordExecution`**: Capturado na confirmação da ordem enviada à corretora ou simulador.
