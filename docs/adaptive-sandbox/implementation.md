# Documentação de Implementação — Adaptive Intelligence Sandbox (Fase 7.0)

- **Status**: Fase 7.0 Implementada & Validada (100% de Testes Aprovados)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura & Quant Infrastructure Architect (`@[lyzer-guardian]`)

---

## 🏛️ 1. Visão Geral da Fase 7.0

A **Fase 7.0 (Adaptive Intelligence Sandbox)** criou o laboratório interno e isolado no qual o **Lyzer Edge** simula, testa e avalia propostas de parâmetros adaptativos sem tocar no motor decisório real de produção.

---

## 🧩 2. Módulos Criados (`src/adaptive-sandbox/`)

1. **[`ParameterProposalEngine.js`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/adaptive-sandbox/ParameterProposalEngine.js)** (Fase 7.0.1):
   - Constrói o objeto formal `ParameterProposal` e impõe a restrição de **Boundary Clamping (máximo de $\pm 15\%$ de variação por versão)** segundo o ADR-014.
2. **[`AdaptiveShadowEngine.js`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/adaptive-sandbox/AdaptiveShadowEngine.js)** (Fase 7.0.2):
   - Executa a simulação adaptada em paralelo contra ticks reais de mercado sem alterar ordens ativas e emite o evento `SHADOW_COMPARISON_EVENT`.
3. **[`AdaptiveScoreEngine.js`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/adaptive-sandbox/AdaptiveScoreEngine.js)** (Fase 7.0.3):
   - Calcula a métrica de elegibilidade **Adaptive Confidence Score ($ACS \in [0, 100\%]$)** e aplica os cortes formais ($ACS > 95\%$ para submissão à Corte ECA e $ACS < 80\%$ para rejeição automática).
4. **[`ParameterVersionStore.js`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/adaptive-sandbox/ParameterVersionStore.js)** (Fase 7.0.4):
   - Gerencia a linhagem semântica imutável na tabela `parameter_versions` e disponibiliza a função de reversão proativa `rollback()`.
5. **[`AdaptiveSandboxFacade`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/adaptive-sandbox/index.js)**:
   - Expõe a fachada de integração unificada do laboratório Sandbox.

---

## 🧪 3. Validação dos Testes Automáticos

Executada a suíte de testes em `tests/adaptive-sandbox/`:

```bash
 RUN  v1.6.1 C:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer edge

 ✓ tests/adaptive-sandbox/parameterProposal.test.js  (1 test)
 ✓ tests/adaptive-sandbox/adaptiveScore.test.js  (2 tests)
 ✓ tests/adaptive-sandbox/shadowEngine.test.js  (1 test)
 ✓ tests/adaptive-sandbox/versionStore.test.js  (1 test)
 ✓ tests/adaptive-sandbox/sandboxPipeline.test.js  (1 test)

 Test Files  5 passed (5)
      Tests  6 passed (6)
```
