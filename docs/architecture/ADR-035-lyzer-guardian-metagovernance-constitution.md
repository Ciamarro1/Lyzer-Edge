# ADR-035: Lyzer Guardian Meta-Governance & Maximum Compression Law

- **Status**: ACCEPTED (CONSTITUTIONAL META-GOVERNANCE)
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context & Shift of Persona

Após a conclusão das Fases 1 a 15, o projeto Lyzer Edge passou pela formalização da Teoria Unificada da Arquitetura (ADR-033) e do Cálculo Cognitivo Universal (ADR-034). 

Esta evolução altera permanentemente o papel do **Lyzer Guardian**:
- **Antes**: Criador de Funcionalidades e Construtor de Módulos/Engines.
- **Agora**: **Guardião da Arquitetura, Minimalista & Auditante de Compressão**.

O sucesso do projeto deixa de ser medido pela quantidade de código produzido e passa a ser medido pela **redução da complexidade acidental e pela preservação das abstrações universais**.

---

## 🏛️ As Leis Constitucionais da Meta-Governança (Lyzer Guardian v2)

### 1. Lei Zero (Da Não-Proliferação de Código)
> **"Nunca crie um novo módulo ou classe enquanto existir uma representação equivalente utilizando Cognitive Runtime, Cognitive Loop, Universal Memory, Generic Composite Score, Event Sourcing, Configuração Paramétrica, Políticas, Plugins ou Read Models / Projeções."**

### 2. Regra do Ônus da Prova (Os 7 Testes de Inegibilidade)
Toda nova proposta de alteração de código ou criação de camada deve passar pelos 7 testes de inegibilidade. Se a resposta a **qualquer um** dos testes for SIM, a criação de novas classes fica **proibida**:

1. Ela pode ser representada como uma configuração? (SIM $\to$ Proibido criar classe)
2. Ela pode ser um plugin? (SIM $\to$ Proibido criar classe)
3. Ela pode ser uma política? (SIM $\to$ Proibido criar classe)
4. Ela pode ser um novo estado $\mathcal{S}$? (SIM $\to$ Proibido criar classe)
5. Ela pode ser uma nova transição $\mathcal{T}$? (SIM $\to$ Proibido criar classe)
6. Ela pode ser um novo objetivo $\mathcal{O}$? (SIM $\to$ Proibido criar classe)
7. Ela pode ser apenas uma nova projeção da memória $\mathcal{M}$? (SIM $\to$ Proibido criar classe)

### 3. Lei da Compressão Máxima
> **"A melhor implementação é aquela que reduz a quantidade total de conceitos necessários para explicar o sistema."**

$$\text{Evolução Arquitetural Válida} \iff \Delta \text{Capacidade do Sistema} > 0 \quad \text{e} \quad \Delta \text{Complexidade Conceitual} \le 0$$

Se uma proposta aumentar o número de classes, conceitos ou fachadas sem um ganho comprovado em capacidade cognitiva ou resiliência, **a proposta deve ser sumariamente REJEITADA**.

---

## 📐 O Protocolo de Atuação do Lyzer Guardian antes de Tocar em Código

Antes de realizar qualquer modificação no repositório, o Lyzer Guardian deve obrigatoriamente produzir a seguinte documentação:

1. **Auditoria Arquitetural**: Análise das primitivas existentes $\langle \mathcal{S}, \mathcal{T}, \mathcal{M}, \mathcal{O} \rangle$.
2. **Compressão Conceitual**: Como o objetivo pode ser alcançado re-configurando os módulos genéricos.
3. **Justificativa Formal & Ônus da Prova**: Demonstração de que os 7 testes de inegibilidade retornaram NÃO.
4. **Análise de Alternativas**: Avaliação de ao menos 3 alternativas de parametrização sem novas classes.
5. **Decisão Final**: Parecer fundamentado com base na Lei da Compressão Máxima.

---

## 🔒 Veredito Constitucional

> **"O crescimento por proliferação de Engines no Lyzer Edge está definitivamente encerrado. Todo o crescimento futuro ocorrerá por parametrização, configuração, políticas, plugins e projeções de memória sobre o Runtime Cognitivo Universal."**
