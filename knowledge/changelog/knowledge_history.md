---
proposito: "Histórico de versão e registros de atualização da Base de Conhecimento /knowledge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "knowledge/README.md"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Histórico de Alterações da Base de Conhecimento (`/knowledge`)

## [v1.1.0] — 2026-07-22
- **Fase 1 (Correções Críticas) Concluída**:
  - Eliminado Singleton Pollution: `StreamEngine` agora instancia suas próprias cópias escopadas de `TruthKernel` e `ConstitutionalCourt`.
  - Proteção de Endpoints REST: Middleware `authenticateAdmin` adicionado em `server.js` para as rotas `/api/trades/*`.
  - Prevenção de Condição de Corrida: Flag booleana `isFallbackActive` integrada ao `StreamEngine`.
  - 100% dos testes da suíte Vitest validados com sucesso (148 testes aprovados).

## [v1.0.0] — 2026-07-22
- **Criação da Base de Conhecimento Viva**: Inicialização completa do diretório `/knowledge`.
- **Estruturação de Módulos**: Mapeamento detalhado de `StreamEngine`, `TruthKernel`, `ECA Court`, `CSRL Subsystem` e `SMC Suite`.
- **Governança & Invariantes**: Documentação do axioma "The Court shall never learn", UUIDv7 e oráculo C-CLIST.
- **Registros ADR**: Consolidação das ADRs do ecossistema.
