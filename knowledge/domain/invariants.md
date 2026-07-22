---
proposito: "Definição formal das invariantes inegociáveis do sistema"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "packages/lyzer-constitution/src/eca/court.js"
  - "lyzer edge/backend/streamEngine.js"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Invariantes Arquiteturais do Lyzer Edge

## 1. Axioma "The Court Shall Never Learn"
- A Corte Constitucional recusa qualquer dado de entrada contendo `confidence` ou `prediction`.
- **Raciocínio**: A arbitragem de risco deve ser puramente baseada na geometria estática da realidade, e não nas probabilidades arrojadas produzidas por um modelo preditivo.

## 2. Invariante de Traceabilidade Causal UUIDv7
- Nenhuma mensagem trafega pelo NATS ou gRPC sem conter `execution_intent_id`, `correlation_id` e `causation_id` válidos em formato UUIDv7 temporalmente ordenados.

## 3. Invariante de Veto de Ilusão de Estabilidade
- Se o estresse do oráculo C-CLIST atingir `lethalIllusionLimit` ($0.9$), NENHUMA ordem é liberada para a corretora, independente da força do sinal gerado pelos provedores de mercado.
