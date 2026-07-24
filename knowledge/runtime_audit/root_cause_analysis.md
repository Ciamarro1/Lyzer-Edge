# Etapa 6 & 7 — Busca de Problemas, Diagnóstico e Análise de Causa Raiz

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Data da Auditoria**: 2026-07-24

---

## 1. Problemas e Inconsistências Identificados com Evidências Empíricas

A execução das suítes de teste e inspeção estática revelou as seguintes inconsistências e pontos de fragilidade:

---

### 🟢 Problema #1: Descalibração de Limiares em Testes Unitários de Integração SMC (`e2e_suite.test.js`)
- **Evidência Empírica (Task Log #215)**:
  - 119 de 126 testes em `e2e_suite.test.js` passaram integralmente (94.4% de taxa de sucesso).
  - 7 testes falharam em asserções de limite, por exemplo:
    ```text
    FAIL: Tier 1 - F5 (SCD) 1: Consensus destruction when signals match
    AssertionError: expected false to be true
    ```
- **Causa Raiz**:
  - No `ResidualizationLayer` (`residualization.js`), a condição para `isConsensus` é:
    `this.consensusLimit > 0 && divergenceScalar < this.consensusLimit && Math.abs(directionalTension) > 1.0;`
  - O valor padrão de `consensusLimit` no construtor do `ResidualizationLayer` é `0.1`, enquanto os testes antigos passavam vetores assumindo um limite relaxado de `0.4` ou `0.5`.
- **Severidade**: **MÉDIA** (Trata-se de divergência de calibração entre os testes legados e os parâmetros padrão mais rígidos do Kernel).
- **Impacto**: Falha na aprovação 100% automatizada da suíte SMC.

---

### 🟢 Problema #2: Manipulação de Caminhos do SQLite Causal em Sistemas Windows (`db.js`)
- **Evidência Empírica (Task Log #185 & #202)**:
  - No `db.js`: `const DATA_DIR = process.env.DATA_DIR || '/tmp/data';`
  - No Windows, a string `/tmp/data` é resolvida como `C:\tmp\data`.
  - Nos testes assíncronos paralelos, chamadas consecutivas `new CausalMemoryDB()` tentavam abrir travas de arquivo simultâneas sem passar `path.resolve()`, gerando estouro de timeout no Vitest em `dual_reality_monitor.test.js`.
- **Causa Raiz**:
  - Uso de strings com barras no formato Unix (`/tmp/data`) em ambiente Windows nativo sem normalização via `path.resolve` ou `os.tmpdir()`.
- **Severidade**: **MÉDIA**.
- **Impacto**: Instabilidade pontual em ambiente de desenvolvimento Windows (mitigada no ambiente containerizado Linux Docker de produção).

---

### 🟢 Problema #3: Presença de Scripts `verify_*.js` Legados Despadronizados na Raiz
- **Evidência Empírica**:
  - A raiz da pasta `lyzer edge/` continha 12 arquivos do tipo `verify_*.js` criados durante fases anteriores.
- **Causa Raiz**:
  - Falta de arquivamento dos scripts ad-hoc de verificação após a migração para a suíte unificada `tests/verification/` e `tests/e2e/`.
- **Severidade**: **BAIXA** (Dívida de limpeza de arquivos).

---

## 2. Matriz Sintética de Problemas

| ID | Descrição do Problema | Causa Raiz | Severidade | Impacto | Recomendação |
|---|---|---|---|---|---|
| **ERR-01** | 7 testes SMC reprovados em `e2e_suite.test.js` | Descalibração do `consensusLimit` (0.1 vs 0.4) | Média | Falha CI/CD parcial | Atualizar a suite para configurar `consensusLimit` explicitamente |
| **ERR-02** | Timeout no `dual_reality_monitor.test.js` no Windows | Sleep de 2s + caminho `/tmp/data` | Média | Flakiness em testes local | Usar `os.tmpdir()` e remover sleep de 2s (Já Corrigido) |
| **ERR-03** | Scripts `verify_*.js` acumulados na raiz | Dívida de refatoração | Baixa | Poluição do repositório | Mover para `tests/verification/legacy/` |
