# Lyzer Edge — V8 Falsification Campaign Final Verdict

**Campaign Identifier**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8)  
**Frozen Engine SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`  
**Governance Standard**: Executive Institutional Quant Mandate (Zero Post-Hoc Tuning, Fail-Closed)  
**Closing Timestamp UTC**: `2026-09-03T02:22:00.000Z`  
**Final Institutional Classification**: 🛑 **CAMPAIGN CONCLUDED — HYPOTHESIS NOT CONFIRMED (FAIL AT GATE G2)**  

---

## 1. Executive Summary & Epistemic Scope

Under the strict executive mandate of scientific falsification, the `InstitutionalQuantSignalEngine` (V8) was subjected to an unbending testing protocol designed to challenge its quantitative hypotheses rather than curve-fit its parameters.

### Epistemic Clarification:
- **Integridade de Software (G0)**: O motor V8 **não foi refutado como software**. Os contratos, tipos, integridade de execução e determinismo foram comprovados a 100% (G0 PASS).
- **Filtragem de Ruído (G1-R1)**: O motor V8 **não fabrica alpha espúrio em ruído aleatório**. Sob 6 famílias de processos nulos e 102.000 períodos avaliados, a taxa de falso positivo foi de 0,00% (G1-R1 PASS).
- **Hipótese Não Confirmada (G2)**: O que falhou e encerrou a campanha foi a **hipótese de edge econômico temporalmente generalizável** sob o protocolo cego pré-registrado.

```text
V8 FREEZE (7944a98)
       │
       ▼
G0: CONTRACT & DETERMINISM ──────────────────────────► PASS (commit 5172631)
       │
       ▼
G1: SYNTHETIC NULL (HISTORICAL) ─────────────────────► INCONCLUSIVE (Metric Defect, f16513b)
       │
       ▼
G1-R1: SYNTHETIC NULL REVALIDATION ──────────────────► PASS (commit 40c85a1)
       │  (6,000 paths, 102,000 evals, FPR=0.00%, zero spurious alpha)
       │
       ▼
G2: TEMPORAL OUT-OF-SAMPLE (Protocol v2.1, 6581f83) ─► FAIL (commit 44a6f00)
       │  (OOS Net Exp = +29.7 bps, but HAC p = 0.3172 >= 0.05; IS baseline negative)
       │
       ▼
G3–G10: REMAINING GATES ─────────────────────────────► PERMANENTLY BLOCKED (FAIL-CLOSED)
```

---

## 2. Definitive Summary of Completed Gates

### Gate G0 — Software & Determinism Integrity: PASS
- 59/59 unit, integration, and contract tests passed.
- 250/250 determinism trials produced bitwise-identical output hashes.
- Telemetry contracts verified without exception.

### Gate G1 / G1-R1 — Synthetic Null Falsification: PASS
- The initial G1 run contained metric calculation defects (micro-sample annualized Sharpes and percentiles mislabeled as confidence intervals), diagnosed and documented openly without altering the engine.
- Revalidation G1-R1 accounted for the complete universe of 102,000 observation intervals across 6 null families (Gaussian IID, Student-$t$, Random Walk, Temporal Shuffle, Block Shuffle, GARCH):
  - **Empirical FPR = 0.00%** (0 false positives in 6,000 paths).
  - **Pooled Trade Sharpes**: bounded within $[-0.09, +0.03]$, all indistinguishable from zero ($p > 0.05$).
  - **Paired Tests vs Random Coin Toss**: all paired $p > 0.05$.
- **Conclusion**: V8 **does not manufacture spurious alpha in noise**.

### Gate G2 — Temporal Out-of-Sample Validation: FAIL
- Evaluated on 32,136 hourly BTCUSDT candles across a 100-bar Chinese Wall embargo separating 17,544 bars of In-Sample history (2023–2024) from 14,492 bars of Out-Of-Sample history (2025–2026), under fixed 10 bps round-trip friction and Newey-West HAC ($L=5$) inference:
  - **OOS Economic Realization**: Realized $+29.70$ bps net mean return, $52.00\%$ net hit rate, Profit Factor $1.474$, and continuous Sharpe $+0.0456$ across 25 non-overlapping trades.
  - **Statistical Falsification**: Under Newey-West HAC covariance estimation, $IC_{\text{OOS}} = +0.1976$ yielded $t_{\text{HAC}} = +1.0002$ with $p = 0.3172$ ($p \ge 0.05$). The 95% confidence interval $[-0.2142, +0.5498]$ widely spans zero.
  - **Baseline Inversion**: In-Sample baseline was negative ($IC_{\text{IS}} = -0.1175$), rendering temporal retention formally `NOT EVALUABLE (IS BASELINE NON-POSITIVE)`.
- **Conclusion**: The quantitative hypothesis of out-of-sample directional predictive edge across time is **not confirmed**.

---

## 3. Methodological Caveats Preserved for Future Research

1. **Residual Temporal Dependence**: Aggregated inferences in G2 retain residual temporal dependence/overlap from the 64-bar lookback window, despite the pre-registered Newey-West HAC ($L=5$) correction. This is permanently recorded as a methodological consideration for future designs rather than patched post-hoc.
2. **Sample Size & Economic Observation**: While OOS realized returns were sample-positive (+29.7 bps net), a sample of 25 trades over 20 months does not provide sufficient statistical power to reject the null hypothesis of zero edge under serial dependence.
3. **Purity of Governance**: The research process was executed with zero post-hoc parameter adjustments, zero data dredging, zero model hopping, and zero retroactive re-interpretations. The fail-closed rule halted the campaign immediately upon Gate G2.
4. **Separation of Future Research**: Any future investigation (e.g., regime shift modeling, multi-asset diversification, alternative cadences) must be conducted under an entirely new research charter and pre-registration protocol, leaving this evidence intact and immutable.

---

## 4. Immutable Commit Lineage

| Stage | Commit SHA | Summary |
|---|:---:|---|
| **Freeze** | `7944a98` | Baseline freeze of V8 engine and datasets |
| **G0** | `5172631` | Contract determinism and test suite verification (PASS) |
| **G1** | `b5fb950` | Initial synthetic null test (HISTORICAL) |
| **G1 Audit** | `f16513b` | Forensic audit isolating metric defects (INCONCLUSIVE) |
| **G1-R1 Freeze** | `d639e1c` | Pre-registration of complete-universe revalidation |
| **G1-R1** | `40c85a1` | Complete-universe revalidation execution (PASS) |
| **G2 Freeze v2.1** | `6581f83` | Temporal OOS protocol with HAC and strict denominator |
| **G2 Execution** | `44a6f00` | Temporal OOS validation execution (FAIL) |
| **Final Closure** | `4e4a7b6` | Formal campaign closure on G2 falsification verdict |
