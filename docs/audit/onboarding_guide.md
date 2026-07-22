# Auditoria Técnica — Onboarding Guide
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/onboarding_guide.md`

---

## 1. Guia de Integração para Engenheiros e Agentes de IA

### 1. Visão Rápida dos Pontos de Entrada
- **Servidor Backend**: [lyzer edge/backend/server.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/server.js)
- **Frontend SPA**: [lyzer edge/src/main.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/main.js) e [app.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/src/app.js)
- **Motor Principal**: [lyzer edge/backend/streamEngine.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/streamEngine.js)
- **Corte Constitucional**: [packages/lyzer-constitution/src/eca/court.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/packages/lyzer-constitution/src/eca/court.js)

### 2. Regras Fundamentais de Desenvolvimento
1. **Preservar a Soberania da Corte**: Nunca passe `confidence` ou `prediction` para a Corte Constitucional.
2. **Respeitar o Padrão ESM**: Todos os arquivos JavaScript usam `"type": "module"`. Importações no Node.js usam extensões explícitas `.js`.
3. **Traceabilidade Causal**: Toda emissão de intenção de trade deve utilizar UUIDv7 para `execution_intent_id`, `correlation_id` e `causation_id`.
