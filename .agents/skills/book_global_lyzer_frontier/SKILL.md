---
name: book-global-lyzer-frontier
description: Metaskill de Arquitetura Consolidada para Lyzer Edge, compilando Event Sourcing, Quant Risk, Causal Memory, Tail Modeling e Hardening.
domain: High-Integrity Systems & Quant Architecture
priority: P0
---

# Global Frontier Knowledge (Lyzer Edge Toolkit)

## FASE 0 — Epistemic Framing
1. **Compilação**: Síntese Global dos 8 Livros de Fronteira (Kleppmann, Hoffman, Munrow, Richman, Dilger, Liu, Burns, Hainaut).
2. **Domínio Principal**: High-Integrity Systems, Microstructure, Event Sourcing, Regime Detection e Tail Risk.
3. **Prioridade**: **P0** (Adoção transversal obrigatória para todos os agentes atuando no repositório Ciamarro1/Lyzer-Edge).
4. **Depth**: `reference` (Guia rápido de axiomas para validação constante e peer review).

## FASE 1 — Intent Alignment (O Toolkit Global)

### 1. Frameworks Nomeados & Mental Models
- **Formalismo ⟨S, T, M, O⟩**: Toda operação de sistema deve ser modelada como State, Transition, Message, Output. Nada acontece fora deste formalismo (Inspirado em Event Sourcing e Modelagem Contínua).
- **The Court Shall Never Learn**: A Constitutional Court (Camada de Auditoria) é *stateless* em relação a aprendizados de negócio. Ela não treina modelos; ela julga invariantes matemáticas e legais.
- **Campo de Ilusão de Estabilidade**: Modelos quantitativos devem assumir que regimes de estabilidade no mercado são "ilusões" temporárias que antecedem *Tail Risks* extremos. 

### 2. Regras de Decisão & Thresholds
- **Se houver conflito de concorrência em memória**, ENTÃO falhe a transação e faça o replay do Ledger Efêmero (Causal Memory). NUNCA sobreescreva dados de forma não-determinística.
- **Threshold de Volatilidade (Regime Detection)**: Quando o *processCandle* detectar saltos fracionários que quebram a invariante de difusão contínua, ative a circuit-breaker rule do TRG.

### 3. Anti-Padrões (O que NUNCA fazer no Lyzer Edge)
- **O Anti-Padrão do Monólito Frágil**: Atualizar o banco de dados diretamente via ORM de forma imperativa sem gerar um evento de domínio anexado ao log causal.
- **Ignorar Extremes**: Assumir distribuição normal para riscos financeiros (erro fatal segundo *Catastrophe Risk Modeling e Extreme Value Theory*). Sempre modelar caudas pesadas.
- **Single Point of Failure na Court**: Permitir que a Constitutional Court seja bloqueante em I/O. Ela deve ser assíncrona, reagindo aos streams de eventos já gravados.

### 4. Invariantes (Pre/Pós-Condições)
- **Idempotência Forte**: `processCandle(X) + processCandle(X) == processCandle(X)`. Todo estado final deve ser o mesmo, independente da repetição do evento de entrada.
- **Isolamento Geométrico**: Cálculos matemáticos de *Continuous Time Processes* (Hainaut) não devem partilhar escopo de memória ou CPU bound threads com o I/O do Node.js (necessidade de Web Workers ou serviços desacoplados em Python/Rust).

### 5. Checklists Operacionais (Arquitetura)
- [ ] O componente obedece à semântica *Append-Only* para mudanças de estado (Event Sourcing)?
- [ ] Existe uma barreira protetora clara entre os cálculos quantitativos e a camada de ingestão de rede?
- [ ] Os erros de precisão flutuante (floating point) estão mitigados usando bibliotecas financeiras de precisão exata?

## FASE 2 — Execution Directive
Qualquer agente (Worker, Architect, Debugger) operando no Lyzer Edge deve tratar este documento como sua Constituição Técnica. Quando implementar uma feature, referencie qual regra deste Toolkit foi adotada.
