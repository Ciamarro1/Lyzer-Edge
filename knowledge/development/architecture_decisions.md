---
proposito: "Registro de Decisões de Arquitetura (ADR) do ecossistema Lyzer Edge"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "lyzer edge/adr_*.md"
  - ".agents/memory/MEMORY.md"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Registros de Decisão de Arquitetura (ADRs)

## ADR-001: Isolamento em 3 Processos Isolados
- **Status**: Aprovado e Implementado.
- **Contexto**: Garantir que a falha de interface do painel web ou o GC do Node.js não afetem o gateway de execução financeira em Rust.
- **Decisão**: Dividir o sistema em 3 processos: Execution Node (Rust/NATS), ECA Court Node (Rust/JS Hub) e Dashboard Node (Node.js/Vite Express).

## ADR-002: Renderização de Zonas Mitigadas SMC com 20% de Opacidade
- **Status**: Aprovado (2026-07-03).
- **Contexto**: Evitar viés de confirmação visual no gráfico do operador ao exibir Fair Value Gaps e Order Blocks antigos.
- **Decisão**: Renderizar zonas mitigadas com opacidade máxima de 20%, limitando o número total de zonas visíveis a 300 e pares de liquidez a 50.

## ADR-003: Axioma "The Court Shall Never Learn"
- **Status**: Aprovado.
- **Contexto**: Modelos preditivos tendem a apresentar excesso de confiança (arrogância estocástica) em períodos de baixa volatilidade.
- **Decisão**: A Corte Constitucional ignora e rejeita qualquer parâmetro de entrada probabilístico.
