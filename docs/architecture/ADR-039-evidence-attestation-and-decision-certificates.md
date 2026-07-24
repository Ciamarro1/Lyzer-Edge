# ADR-039: Evidence Attestation, Decision Certificates, and Precision Boundary Delimitation

- **Status**: ACCEPTED (INSTITUTIONAL EVIDENCE ATTESTATION & DETERMINISTIC CERTIFICATION)
- **Date**: 2026-07-24
- **Author**: Guardião da Arquitetura, Chief Scientist & Systems Auditor (`@[lyzer-guardian]`)

---

## 1. Contexto e Evolução

A auditoria institucional independente do **Lyzer Edge** elevou o índice de maturidade para **9.7/10** ao validar a transição para evidências automatizadas por CI/CD (ADR-038).

Para preencher a lacuna final em relação aos melhores sistemas quantitativos institucionais do mundo, este ADR formaliza 3 novos pilares:

$$\text{Evidence} \xrightarrow{\quad} \text{Attestation} \xrightarrow{\quad} \text{Reproducibility}$$

1. **Evidence Bundle & Attestation**: Empacotamento imutável e assinado do estado de cada release.
2. **Certificados de Decisão Determinística (Decision Certificates)**: Atestado explicável emitido a cada decisão (aprovada ou vetada) da Corte.
3. **Delimitação de Fronteira Epistêmica**: Definição rigorosa e honesta do alcance do determinismo "bit-a-bit".

---

## 2. Especificação do Evidence Bundle (Atestado por Release)

A cada compilação e release aprovada no pipeline CI/CD, o sistema gera o artefato imutável `evidence_bundle.json`:

```json
{
  "bundle_id": "0190ce24-789a-7111-9a2f-123456789abc",
  "timestamp_iso": "2026-07-24T19:05:00Z",
  "git_commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678",
  "ci_run_id": "1234567890",
  "constitution_version": "2.0.0",
  "adr_head_version": "ADR-039",
  "architecture_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "audit_results": {
    "npm_audit_vulnerabilities": 0,
    "cargo_audit_vulnerabilities": 0,
    "codeql_alerts": 0
  },
  "test_metrics": {
    "total_tests": 164,
    "passed_tests": 164,
    "line_coverage_pct": 98.4
  },
  "cryptographic_signature": "Ed25519_SIG_HASH_LYZER_LABS_..."
}
```

---

## 3. Especificação do Certificado de Decisão Determinística (Decision Certificate)

Toda autorização ou veto emitido pela `ConstitutionalCourt` grava obrigatoriamente um **Decision Certificate** no `ImmutableEventLedger`:

```json
{
  "decision_id": "0190ce25-1111-7222-8333-abcdef123456",
  "timestamp_utc": "2026-07-24T19:05:01.123Z",
  "symbol": "BTCUSDT",
  "court_version": "2.0.0",
  "raw_inputs": {
    "trg_value": 0.52,
    "lhds_value": 0.08,
    "cclist_lethal_illusion": 0.31,
    "mol_scl_ticks": 12
  },
  "evaluated_rules": [
    { "rule": "Residualization", "passed": true },
    { "rule": "ExecutionTrigger", "passed": true, "threshold": 0.4 },
    { "rule": "TruthKernelLHDS", "passed": true, "limit": 0.15 },
    { "rule": "CCLSTStressOracle", "passed": true, "limit": 0.9 },
    { "rule": "MOLRecoveryState", "passed": true }
  ],
  "verdict": "GRANTED",
  "veto_reasons": [],
  "execution_hash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
}
```

---

## 4. Delimitação de Fronteira Epistêmica (Precision Boundary)

Para manter o rigor e honestidade de engenharia, estabelece-se explicitamente o escopo dos conceitos de determinismo e replay:

### 🟢 Escopo Válido de Determinismo ("Bit-a-Bit")
- Aplica-se **exclusivamente à lógica computacional interna**: processamento de candles, cálculo de tensores CSRL, métricas do `TruthKernel`, acúmulo de estresse no `C-CLIST` e avaliação constitucional determinística.
- Garantido quando fornecidas exatamente as mesmas entradas de candles, parâmetros e estado inicial.

### 🔴 Fronteira Externa de Não-Determinismo (Ambiente Real)
- **Não se aplica** à latência física de rede (RTT da corretora), ao tempo de resposta de ordens (*matching engine* da Binance) ou a variações de derrapagem de preço (*slippage* e *spread*).
- O sistema reconhece o não-determinismo externo e o isola através de modelos de simulação de execução e gateways gRPC/NATS.

---

## 📜 Veredito Constitucional

> **"A reputação institucional não é construída apenas dizendo que o sistema funciona, mas emitindo certificados imutáveis e auditáveis para cada release e decisão tomada."**
