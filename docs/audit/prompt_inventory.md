# Auditoria Técnica — Prompt & Agent Directive Inventory
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/prompt_inventory.md`

---

## 1. Mapeamento de Prompts e Regras Cognitivas de IA

O sistema Lyzer Edge utiliza diretivas cognitivas em nível de repositório para orquestrar e reger o comportamento de assistentes e agentes autônomos de IA.

| # | Arquivo de Prompt / Diretiva | Finalidade | Escopo & Prioridade |
|---|---|---|---|
| 1 | `AGENTS.md` | Guia do agente do ecossistema Lyzer Edge. Define estrutura de monorepo, 7 camadas do trading pipeline, variáveis de ambiente e testes. | Global (P1) |
| 2 | `.agents/rules/GEMINI.md` | Protocolo operacional master. Define papéis (CTO Executive Director), Request Classifier, Agent Routing Protocol, Socratic Gate e regras Clean Code. | Global (P0 - Prioridade Soberana) |
| 3 | `.agents/memory/cognitive_directive.md` | LYZER EDGE — Cognitive Operating Directive v1.0. Define a identidade do agente como Arquiteto Cognitivo Permanente e o ciclo em 10 passos. | Persistente no Projeto |
| 4 | `.agents/workflows/cg.md` | Debate Cognitivo Autónomo entre 3 agentes (CIA vs CTO vs Ponytail) e ciclo de produção de 6 pilares. | Workflow `/cg` |

---

## 2. Axiomas Cognitivos Garantidos pelos Prompts

1. **Anti-Fragilidade Arquitetural**: Nenhuma decisão técnica pode criar fragilidade futura em nome da velocidade.
2. **Prioridade de Engenharia**: `Reliability > Security > Maintainability > Observability > Scalability > Performance > Feature Velocity`.
3. **Proibição de Suposições**: O código executável é soberano sobre a documentação estática ou hipotética.
