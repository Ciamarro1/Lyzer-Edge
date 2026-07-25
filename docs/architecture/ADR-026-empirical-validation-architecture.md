# ADR-026: Empirical Validation Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

A Fase 8 (Cognitive Market Intelligence Layer) dotou o Lyzer Edge da capacidade de descobrir regimes emergentes, compor novas features estatísticas, formular hipóteses causais e propor candidatos a estratégia (`StrategyCandidate`).

Porém, existe um abismo entre **gerar uma boa ideia** e **comprovar estatisticamente que a ideia possui alpha robusto e estável**. Submeter hipóteses brutas diretamente ao Sandbox ou à Corte ECA sem validação empírica prévia congestiona o pipeline com especulações de baixo valor.

### Problema

> "Gerar hipóteses é fácil. Provar que uma hipótese é estatisticamente estável através de múltiplos regimes de mercado antes de investir capital é o verdadeiro gargalo da inteligência quantitativa."

---

## Decision

Criar a camada **`src/empirical-validation/`** contendo a **Fase 9 — Cognitive Validation & Empirical Intelligence Layer**.

### Arquitetura da Validação Empírica

```
                 STRATEGY CANDIDATE (Fase 8)
                             │
                             ▼
                EmpiricalValidationEngine
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  Statistical        Causal Evidence      Knowledge Maturation
  Significance            Score                 Pipeline
   (95% CI/N)            (CES)         (OBSERVATION → CONSTITUTIONAL)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                 ResearchExperimentEngine
                (Walk-Forward Validation)
                             │
                             ▼
              ADAPTIVE PIPELINE CONTROLLER (Fase 7.1)
```

### Módulos Principais

1. **`EmpiricalValidationEngine.js`**
   - Executa a triagem empírica de propostas, analisando histórico de ocorrências, expectativas de retorno, variância e taxas de falha.

2. **`StatisticalSignificanceEngine.js`**
   - Valida o tamanho de amostra ($N \ge 500$), calcula o Intervalo de Confiança de 95% ($95\%\text{ CI}$) e avalia a estabilidade do Sharpe Ratio inter-regimes.

3. **`CausalEvidenceScorer.js`**
   - Calcula o **Causal Evidence Score (CES $\in [0, 100\%]$)**:
     $$CES = \frac{\text{SampleQuality} + \text{RegimeCoverage} + \text{TemporalStability} + \text{CausalConsistency}}{4}$$
   - Regimes do CES:
     - $90 \le CES \le 100$: `PROVEN` (Elegível para promoção acelerada)
     - $70 \le CES < 90$: `PROMISING` (Requer ciclo padrão de Sandbox)
     - $CES < 70$: `SPECULATIVE` (Rejeitado)

4. **`KnowledgeMaturationPipeline.js`**
   - Gerencia os 5 níveis de maturidade do conhecimento na memória semântica:
     `OBSERVATION` $\to$ `HYPOTHESIS` $\to$ `VALIDATED` $\to$ `ESTABLISHED` $\to$ `CONSTITUTIONAL`

5. **`ResearchExperimentEngine.js`**
   - Executa experimentos de **Walk-Forward Validation (WFV)** em janelas deslizantes temporais de memória causal.

6. **`EmpiricalValidationFacade` (`index.js`)**
   - Interface unificada de validação empírica.

---

## Consequences

### Positivas
- Impede a proliferação de hipóteses espúrias ou overfitted.
- Provê rigor estatístico institucional com intervalos de confiança e Walk-Forward Validation.
- Cria uma escala de maturidade imutável para todo padrão de conhecimento no Lyzer Edge.

### Negativas
- Requer amostragem histórica substancial para satisfazer $N \ge 500$ em estratégias de menor frequência.
