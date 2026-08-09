---
name: book-catastrophe-risk-richman
description: Toolkit extraído de Catastrophe Risk Modeling and Extreme Value Theory With Python.
domain: Tail Risk & Extreme Value Theory
priority: P1
---

# Catastrophe Risk Modeling and Extreme Value Theory With Python (Richman)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Catastrophe Risk Modeling and Extreme Value Theory With Python* (Richman, 2025).
2. **Domínio Principal**: Modelagem de Cauda Moderna, EVT (Extreme Value Theory), Gestão de Crise (Flash Crashes).
3. **Prioridade**: **P1** (Necessário para a construção matemática do *Tail Risk Guard - TRG*).
4. **Depth**: `reference` (As lógicas atuam como funções de utilidade Python a serem validadas pela Court).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **Extreme Value Theory (EVT)**: Ferramenta matemática que foca exclusivamente nos "extremos" da distribuição, assumindo distribuições Generalizadas de Pareto para excessos (Peaks Over Threshold - POT).
- **Cisne Negro vs. Cauda Pesada**: Eventos catastróficos no mercado financeiro são matematicamente previstos se não ignorarmos as caudas pesadas.

### 2. Regras de Decisão & Thresholds
- **Se um ativo cruzar o limite `u` (Threshold)**, ENTÃO aplique a função de probabilidade GPD (Generalized Pareto Distribution) para ajustar a margem exigida, não a distribuição normal.
- **Threshold**: Defina `u` dinamicamente baseado nos top 5% de movimentos do *processCandle* histórico.

### 3. Anti-Padrões (O que NUNCA fazer)
- **NUNCA** cortar os *outliers* do seu dataset. Os *outliers* SÃO o dado principal quando se estuda sobrevivência. (Sobrevivência > Governança).
- **NUNCA** rodar algoritmos de EVT no mesmo *thread* principal do Node.js, dada a carga computacional iterativa. (Separação arquitetural).

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante de Sobrevivência**: O *Tail Risk Guard (TRG)* tem autoridade absoluta para cancelar processamento caso a derivada da probabilidade condicional dispare.
- **Matemática Causal**: As medições de EVT operam *após* a gravação do Log de Eventos, alimentadas de forma determinística.

### 5. Checklists Operacionais
- [ ] As funções matemáticas no repositório utilizam Float64/Decimals para evitar overflow durante cálculos de cauda?
- [ ] O modelo EVT falha seguro (Fail-safe) desarmando operações ao invés de permitir trade sob incerteza extrema?

## FASE 2 — Execution Directive
Todo módulo de análise quantitativa no Lyzer Edge deve incorporar EVT (via scripts em Python) para precificar o "Tail Risk" e alimentar a Constitutional Court.
