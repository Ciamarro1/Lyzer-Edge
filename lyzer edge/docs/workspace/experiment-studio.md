# LACW — Experiment Studio Architecture

## Overview
Quantitative laboratory interface for conducting hypothesis ablation experiments, Monte Carlo universe simulations, and out-of-sample statistical validation.

---

## Workflow
1. **Hypothesis Registration**: Formulate mathematical hypothesis (e.g. "Excluding provider X improves Sharpe by +0.15").
2. **Combinatorial Ablation Run**: Execute experiment across 6 segregation tiers (Train, Validation, Test, Forward, Shadow, Production).
3. **Statistical Verification**: Calculate Deflated Sharpe Ratio (DSR), Hansen SPA, and Benjamini-Hochberg FDR.
