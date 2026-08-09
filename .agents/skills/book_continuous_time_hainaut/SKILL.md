---
name: book-continuous-time-hainaut
description: Toolkit extraído de Continuous Time Processes for Finance, focado no formalismo S,T,M,O e dinâmicas de Regime (Self-Exciting).
domain: Financial Mathematics & Microstructure
priority: P0
---

# Continuous Time Processes for Finance (Hainaut)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Continuous Time Processes for Finance: Switching, Self-exciting, Fractional and other Recent Dynamics* (Donatien Hainaut).
2. **Domínio Principal**: Processos Estocásticos, Modelos Hawkes (Self-Exciting), Microestrutura (Lyzer Edge).
3. **Prioridade**: **P0** (Mapeia a matemática dos saltos do *processCandle* para o formalismo ⟨S, T, M, O⟩).
4. **Depth**: `study` (Conhecimento obrigatório para quem escreve modelos matemáticos na Constitutional Court).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **Processos Self-Exciting (Hawkes)**: Movimentos de mercado não são independentes. Um grande evento de liquidação aumenta a probabilidade de outros eventos imediatos (O "Jumps" causam mais "Jumps").
- **Regime Switching (Markov Chains)**: O estado estocástico de volatilidade altera-se em blocos discretos. A Court deve detectar a transição de um mercado calmo (Regime 1) para turbulento (Regime 2).

### 2. Regras de Decisão & Thresholds
- **Se a intensidade de saltos num livro de ofertas (`Lambda`) passar do limite dinâmico**, ENTÃO considere o mercado num processo de "Self-Excitation" e bloqueie a liquidez fornecida pelo algoritmo (TRG Trigger).
- **Integração Fracionária**: Em mercados onde a memória longa importa (Fractional Brownian Motion), a Constitutional Court não deve olhar apenas o último Candle (Markoviano puro), mas o Path inteiro. A *Causal Memory* (Log) habilita esse lookback longo.

### 3. Anti-Padrões (O que NUNCA fazer)
- **NUNCA** modelar candles como "i.i.d." (independentes e identicamente distribuídos) em cenários de alta frequência no Lyzer Edge.
- **Ignorar Jumps**: Se a função falhar em lidar com Processos de Poisson (Jumps discretos) acoplados ao preço contínuo, a precisão matemática está furada.

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante Formal**: Toda mensagem (Message) que chega da corretora é um "tick" de Poisson. A transição de estado ⟨S, T, M, O⟩ obedece à equação diferencial estocástica (SDE) subjacente ao Regime atual.

### 5. Checklists Operacionais
- [ ] O modelo quantitativo em uso reconhece os agrupamentos de volatilidade (Volatility Clustering)?
- [ ] O TRG é calibrado para responder a aumentos bruscos de intensidade da ordem sem *lag* desnecessário?

## FASE 2 — Execution Directive
A Constitutional Court usará Processos de Hawkes e algoritmos de Regime Switching como base para avaliar se o `processCandle` deve ser executado com margem conservadora ou não. O Log Causal fornece os eventos no tempo contínuo necessários para isso.
