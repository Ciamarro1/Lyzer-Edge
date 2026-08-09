---
name: book-risk-engineering-munrow
description: Toolkit extraído de Risk Engineering for Quant Finance, focado na modelagem rigorosa de risco financeiro e detecção de regimes.
domain: Quant Risk & Finance
priority: P1
---

# Risk Engineering for Quant Finance (Munrow & Preston)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Risk Engineering for Quant Finance* (Munrow & Preston, 2025).
2. **Domínio Principal**: Engenharia de Risco, Detecção de Regime (Campo de Ilusão de Estabilidade), Stress Testing, Mitigação Algorítmica.
3. **Prioridade**: **P1** (Mitigação do gap "dual court" e validação de risco extremo no TruthKernel).
4. **Depth**: `study` (Matemática pesada que deve ser aplicada como invariante computacional).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **Campo de Ilusão de Estabilidade**: Modelos quants falham porque são calibrados em períodos de baixa volatilidade. O "Regime" atual é sempre uma ilusão prestes a quebrar.
- **Engenharia de Proteção**: Risco não é algo a ser medido post-mortem, é um parâmetro ativo que atua como freio (Circuit Breaker) no runtime do sistema.

### 2. Regras de Decisão & Thresholds
- **Se a correlação de ativos cruzar o limiar dinâmico (Threshold)**, ENTÃO assuma mudança de regime e ative o *Tail Risk Guard (TRG)*.
- **Regras de Capital**: A alavancagem deve decair exponencialmente assim que a volatilidade implícita ultrapassa limites P95 históricos em janela curta.

### 3. Anti-Padrões (O que NUNCA fazer)
- **NUNCA** assuma liquidez infinita nos seus modelos quantitativos de simulação (processCandle backtesting).
- **NUNCA** use *Value at Risk (VaR)* paramétrico normal. Utilize *Expected Shortfall (ES)* para capturar eventos de cauda.

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante do Capital Preservado**: Nenhuma operação (Message) passa pelo Formalismo ⟨S, T, M, O⟩ se exceder o teto de *Expected Shortfall*.
- **Invariante "The Court Shall Never Learn"**: O módulo de risco avalia eventos, mas não "aprende" durante um crash para não overfit. Suas regras são estáticas no momento da crise.

### 5. Checklists Operacionais
- [ ] O TruthKernel tem uma rotina de *Stress Testing* validada contra dados de crashes históricos (ex: Flash Crash)?
- [ ] O sistema tem um "Kill Switch" que isola o módulo operacional se a Constitutional Court identificar anomalia de risco?

## FASE 2 — Execution Directive
A Constitutional Court no Lyzer Edge DEVE implementar regras baseadas em *Expected Shortfall* em oposição a limiares percentuais simples.
