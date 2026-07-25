# Auditoria Técnica — Improvement Opportunities
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/improvement_opportunities.md`

---

## 1. Oportunidades de Melhoria Arquitetural

### 1. Migração do Cálculo CSRL para Rust / WebAssembly
- **Oportunidade**: A camada CSRL (`CrossScaleTensorGraph.js` e `ScaleNormalizer.js`) realiza cálculos tensoriais síncronos no event loop do Node.js.
- **Proposta**: Mover esses algoritmos para a crate Rust `lyzer-oal` e compilá-los via N-API / WebAssembly, acelerando o processamento em mais de 80%.

### 2. Autenticação de Endpoints REST
- **Oportunidade**: Adicionar middleware de validação de token ou API Key para os endpoints `/api/trades/*`.
- **Benefício**: Impedir que usuários não autorizados encerrem posições ou limpem o histórico de operações.

### 3. Modularização de Instâncias de Corte (`ConstitutionalCourt`)
- **Oportunidade**: Modificar `ConstitutionalCourt` para ser instanciada por `StreamEngine` (uma corte isolada por símbolo de mercado), eliminando a dependência do singleton global `court`.
