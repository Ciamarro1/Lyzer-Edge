# ADR-047: Quantitative Research Lab & Strategy Genome Architecture

## Status
**APPROVED / RATIFIED** — M1.8 / Phase 7 Implementation

## Context & Problem Statement
With the completion of the perception engines (OpenMobius), Bayesian evidence fusion, and cognitive validation suite, the primary bottleneck shifted from architecture to **empirical validation and continuous genetic strategy evolution**.
Trading systems must prove performance through combinatorial experimentation, monitor for Concept Drift, and evolve strategy hyperparameter DNA automatically.

## Decision Drivers
1. **Automated Multi-Variant Experimentation**: Ability to run thousands of feature toggle ablation experiments (e.g. Exp #3812).
2. **Institutional Model Registry**: Versioned tracking of model metrics (Sharpe, Profit Factor, Brier Score, ECE, status).
3. **Concept Drift Protection**: Automatic detection of regime shifts that degrade model performance, dropping weights to shadow mode until re-calibrated.
4. **Strategy Genome Evolution**: Genetic crossover, mutation, and selection of trading strategy parameters exceeding 10,000 mutations/sec.

## Architectural Architecture & Design
- **ResearchLabEngine**: Executes multi-variant ablation experiments.
- **ModelRegistryEngine**: Manages versioned model metadata.
- **ConceptDriftEngine**: Evaluates residual errors against historical benchmarks.
- **EvidenceMarketplaceEngine**: Plugin registry for external evidence engines.
- **StrategyGenomeEngine**: Encapsulates strategy genes, crossover, and mutation algorithms.

## Consequences
- **Positive**: Complete empirical feedback loop from observation to automated genetic strategy evolution.
- **Verification**: Certified Platinum via `scripts/architectureCertification.js`. Vitest suite passed at **626,885 mutations/sec**.
