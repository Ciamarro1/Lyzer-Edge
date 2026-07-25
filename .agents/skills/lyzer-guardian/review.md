# Protocolo de Revisão e Auditoria — Lyzer Guardian

## Checklist de Revisão de Código

Antes de aprovar ou finalizar qualquer alteração de código no Lyzer Edge, verifique:

- [ ] **Axioma "The Court shall never learn"**: A Corte Constitucional continua sem receber dados probabilísticos?
- [ ] **Traceabilidade Causal**: As mensagens emitidas mantêm UUIDv7 para `execution_intent_id`, `correlation_id` e `causation_id`?
- [ ] **Escopo de Importações ESM**: Todas as importações do Node.js backend usam extensão `.js` explícita?
- [ ] **Isolamento de Estado**: Alterações no `court` ou `truthKernel` afetam apenas a instância do ativo alvo?
- [ ] **Validação por Testes**: A alteração foi validada empiricamente via Vitest ou scripts de verificação?
- [ ] **Documentação Atualizada**: Os documentos afetados na pasta `/knowledge` foram sincronizados?
