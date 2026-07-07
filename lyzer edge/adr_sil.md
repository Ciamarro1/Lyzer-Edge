# Architecture Decision Record (ADR): Semantic Integrity Layer (SIL)

## Context
A Release 1.7.5 implementou o ECA (External Constraint Anchor) focando na **Integridade da Realidade**. Contudo, ao preparar a Release 1.8 (Autonomous Refactoring Engine), o Chief Intelligence Architect (CIA) observou que proteger contra realidade falsa não protege contra a corrupção do significado dos conceitos (Semantic Drift e Goal Reinterpretation).

## Decision
Introduzir a **Release 1.7.6 - Semantic Integrity Layer (SIL)** como pré-requisito irredutível para a Release 1.8.

1. **Semantic Evolution Registry**: Em vez de um dicionário imutável ("Fossilização Semântica"), adotaremos um registro evolutivo para os conceitos primários (`Edge`, `Risk`, `Capital`, `Reality`). Ele conterá:
   - `Core Meaning`
   - `Allowed Extensions`
   - `Forbidden Mutations`
2. **Semantic Anchor Interpreter (SAI)**: Traduzirá conceitos abstratos do registro em verificações operacionais determinísticas via AST/Metadados.
3. **Escalonamento de Intervenção**: Em vez de disparar um *Kill Switch* total no sistema de trading, as violações semânticas acionarão uma hierarquia focada na engenharia:
   - Nível 1: Warning
   - Nível 2: Refactoring Freeze
   - Nível 3: Governance Escalation
   - Nível 4: Strategic Lockdown
4. **AST First**: Inicialmente, a verificação semântica do código será feita de forma determinística por metadados de função/AST. Modelos LLM atuarão apenas secundariamente, sujeitos à autoridade do código puro.

## Consequences
- **Positivas**: Impede a corrupção silenciosa da definição de métricas de sucesso, barrando o *Architecture Drift*. Permite o refinamento semântico (Evolução) sem permitir a degeneração.
- **Negativas**: Aumenta a rigidez no processo de desenvolvimento; redefinições de variáveis-chave exigirão governança explícita para atualizar as `Allowed Extensions`.

## Governance
O SIL atua como o sistema imunológico cognitivo do Lyzer Labs. "O significado precede a execução."
Nenhuma refatoração autônoma será comitada se o `verify_sil.js` falhar no processo de *Meaning Consistency*.
