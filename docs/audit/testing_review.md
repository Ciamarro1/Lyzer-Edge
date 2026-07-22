# Auditoria Técnica — Testing Review
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/testing_review.md`

---

## 1. Avaliação do Ecossistema de Testes

### 1. Suíte de Testes Unitários e Integração (Vitest)
- **Configuração**: `vitest.config.js` rodando sob ambiente `jsdom` com `globals: true`.
- **Localização de Testes**: `lyzer edge/tests/` (inclui testes SMC em `tests/e2e_smc/`).
- **Cobertura**: Executável via `npm run coverage` (utilizando `@vitest/coverage-v8`).
- **Avaliação**: Cobertura sólida dos componentes principais do `TimeframeManager`, `LiquidityEngine` e `StructureEngine`.

### 2. Suíte de Certificação de Fronteira (Boundary Certification Suite)
- **Script**: `src-ts/scripts/boundary-certification-suite.ts`
- **Requisitos de Execução**:
  1. `nats-server -js` ativo.
  2. Binário `lyzer-risk-gateway` compilado e executando.
  3. Script `npx tsx src-ts/scripts/setup-nats.ts` para provisionar os streams do NATS JetStream.
- **Avaliação**: Teste institucional rigoroso de resiliência e integridade causal UUIDv7.

### 3. Scripts de Verificação Soltos (`verify_*.js`)
- **Arquivos**: 12 scripts na raiz do `lyzer edge/` (`verify_alpha.js`, `verify_compliance.js`, `verify_eca.js`, `verify_mne.js`, `verify_robustness.js`, etc.).
- **Diagnóstico**: Scripts de checagem ad-hoc criados durante sprints de desenvolvimento.
- **Recomendação**: Migrar esses scripts para a pasta oficial `tests/verification/` e registrá-los no Vitest para evitar poluição do repositório.
