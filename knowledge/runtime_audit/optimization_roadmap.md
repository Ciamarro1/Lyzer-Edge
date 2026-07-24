# Etapa 8 — Recomendações Priorizadas por ROI (Roadmap de Otimização)

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Data da Auditoria**: 2026-07-24

---

## 1. Matriz de Priorização por ROI (Retorno sobre Investimento de Engenharia)

```text
       IMPACTO ELEVADO
            │
            │   [ REC-01: Calibração CI/CD ]      [ REC-02: Native WAL & OS Tmpdir ]
            │   (Alto ROI / Curto Prazo)          (Alto ROI / Baixo Risco)
            │
            │   [ REC-03: OpenTelemetry ]         [ REC-04: Replay Event Sourcing ]
            │   (Médio Prazo)                     (Longo Prazo)
            │
────────────┼────────────────────────────────────────────────────────────► COMPLEXIDADE
            │
            │   [ REC-05: Limpeza de Scripts ]
            │   (Baixa Complexidade)
            │
       BAIXO IMPACTO
```

---

## 2. Detalhamento das Recomendações

### 🔴 Prioridade CRÍTICA (Imediata / ROI Máximo)

#### REC-01: Calibração Paramétrica da Suíte SMC E2E
- **Descrição**: Ajustar a passagem de parâmetros no `e2e_suite.test.js` para instanciar `TruthKernel` com o `consensusLimit` esperado por cada teste específico (ou atualizar as asserções para o limite padrão de `0.1`).
- **Benefício Esperado**: Cobertura E2E de 126/126 (100% Green).
- **Risco**: Zero risco em produção (afeta apenas arquivos de teste).
- **Complexidade**: Baixa (10 minutos de ajuste).

---

### 🟡 Prioridade ALTA (Fase 5 do Roadmap)

#### REC-02: Portabilidade de Caminho do SQLite Causal (`db.js`)
- **Descrição**: Substituir `/tmp/data` por `path.resolve(process.env.DATA_DIR || path.join(os.tmpdir(), 'lyzer-data'))`.
- **Benefício Esperado**: Eliminar flakiness e problemas de permissão em qualquer SO (Windows, Linux, macOS).
- **Complexidade**: Baixa.

#### REC-03: Exposição de Métricas Prometheus & OpenTelemetry
- **Descrição**: Integrar `prom-client` para expor `/metrics` com métricas de tempo de resposta, contagem de vetos por razão e contagem de ticks.
- **Benefício Esperado**: Observabilidade nativa em Grafana/Datadog.
- **Complexidade**: Média.

---

### 🔵 Prioridade MÉDIA / BAIXA (Evolução Futura)

#### REC-04: Engine de Replay Determinístico baseada em Causal Events Log
- **Descrição**: Criar CLI `npx tsx scripts/replay-session.ts --timestamp=<MS>` que recarrega os eventos da tabela `causal_events_log` e valida a exata reconstrução do estado.
- **Benefício**: Auditabilidade forense total.

#### REC-05: Arquivamento de Scripts Legados
- **Descrição**: Mover os 12 scripts `verify_*.js` soltos na raiz para a pasta `tests/verification/legacy/`.
- **Benefício**: Limpeza e organização do diretório raiz.
