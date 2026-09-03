# AD001 Candidate Audit 001 — Final Forensic Verdict & Roadmap
**Audit Identifier**: `AD001_CANDIDATE_AUDIT_001`  
**Campaign Lineage**: `ALPHA_DISCOVERY_001`  
**Audit Timestamp UTC**: `2026-09-03T03:17:01.824Z`  
**Constitutional Authority**: Senior Executive Quant Director / Research Orchestrator  
**Frozen Engine SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (Verified Untouched)  

---

## 1. Executive Forensic Synthesis

This audit addressed the 4 critical methodological challenges raised regarding campaign `ALPHA_DISCOVERY_001`:

### 1. Transparency on Benjamini-Hochberg FDR
- **Finding**: Evaluated across all $M=1.580$ simultaneous tests, no hypothesis achieves global $q < 0.05$. Top tests achieve nominal $p \approx 0.004 - 0.015$, which maps to $q \approx 0.15 - 0.25$.
- **Epistemic Rule**: We explicitly **REJECT** classifying any candidate as "confirmed alpha" or "ready for direct production".
- **Status**: OFI is strictly classified as **`STRONG_RESEARCH_CANDIDATE`**.

### 2. Full Parameter Surface vs Post-Hoc Peak Picking
- **Finding**: We mapped the entire 2D topology of Lookbacks ($L \in \{3, 6, 12, 24\}$) vs Horizons ($H \in \{1, 2, 4, 8, 12, 24\}$) across 10 assets (240 parameter cells).
- **Surface Geometry**: The predictive power is **NOT a noisy Dirac delta peak**. It forms a smooth, continuous upward ramp as $H$ progresses from $1h \to 24h$, with broad plateaus around $L \in \{3h, 6h\}$ and $H \in \{12h, 24h\}$ across BTC, ETH, SOL, and DOGE.
- **Economic Explanation**: Microstructure noise dominates sub-4h horizons. Flow inventory imbalance requires 8h to 24h to translate into persistent directional drift.

- **Finding**: Reconstructed 1,000 permutations under Temporal Shuffle, Sign Permutation, and Block Shuffle ($B=10$).
- **Null Distribution**: Centered precisely at zero (Mean $\approx 0.000$, Median $\approx 0.000$, 95% CI $[ -0.046, +0.048 ]$, $\sigma \approx 0.027$).
- **Empirical Realization**: On continuous non-overlapping 24h intervals ($N=1,338$), the observed IC of $+0.0415$ achieves an empirical two-tailed permutation $p$-value of **$p \approx 0.11 - 0.15$** (113 to 151 permutations exceeded the observed IC by chance).
- **Conclusion**: The nominal HAC parametric $p$-value ($p=0.014$) on the filtered trade sample ($N=290$) does **NOT** translate into an ultra-rare event under continuous permutation ($p < 0.01$). This confirms that the observed correlation has approximately a 12% probability of occurring in stationary noise on a 1,338-bar sample, providing definitive justification for why direct promotion must be **BLOCKED**.


### 4. Data Consumption Partitioning: 2023–2026 is Discovered, NOT Out-of-Sample
- **Finding**: The 2023–2026 Batch 039 dataset was consumed during discovery.
- **Inviolable Rule**: Testing Cumulative OFI on the same 2023–2026 data can NEVER be called an Out-of-Sample confirmation.
- **Resolution**: Any future confirmatory gate (G0/G1/G2) must use:
  1. A truly independent, blind unobserved temporal period (e.g. post-2026 data or pre-2023 archive);
  2. Or unobserved independent cross-asset validation (testing the exact frozen model on new unmined assets);
  3. Or fine-grained 1-minute order flow aggregation from raw trades.

---

## 2. Audit Matrix

| Audit Dimension | Requirement | Observed Outcome | Epistemic Verdict |
|---|---|---|:---:|
| **V8 Engine Invariance** | SHA `fc19e807...` unchanged | Exact match verified | **PASS** |
| **Hypothesis Universe Accounting** | Decompose full test universe | Exactly 1,580 tests accounted across 10 families | **PASS** |
| **Global FDR Reporting** | Explicit BH q-values | Full ranking table published; $q \approx 0.15 - 0.25$ | **HONEST AUDIT** |
| **Parameter Surface Geometry** | Continuous basin vs isolated spike | Smooth continuous gradient across $L \times H$ | **STRONG EVIDENCE** |
| **Null Distribution Re-Engineering** | 1,000 replications, P1-P99 | Permutation $p \approx 0.12-0.15$ on full sample ($N=1338$) | **BLOCKS PREMATURE PROMOTION** |
| **Cost Headroom** | Expectancy $> 0$ at 10 bps | BTC: +25.37 bps; Break-even: 35.37 bps | **PASS** |
| **OOS Separation Guard** | Do not reuse discovery data | 2023–2026 classified as In-Sample Discovery only | **ENFORCED** |

---

## 3. Recommended Protocol for Future Confirmatory Lineage

We establish that:
1. **NO PREREGISTRATION will be executed on the current dataset.**
2. **Cumulative OFI is classified as:**
   $$\mathbf{OFI = \text{STRONG RESEARCH CANDIDATE (YELLOW)}}$$
3. When new unobserved data becomes available, the candidate hypothesis will be formally registered as:
   - **Hypothesis**: *Cumulative Order-Flow Imbalance ($L=6h$) contains incremental directional information on forward 24h returns on major liquid order-driven cryptocurrencies, retaining positive expectancy after 10 bps friction.*
   - **Primary Test Asset**: BTCUSDT (Blind Period)
   - **Replication Asset**: ETHUSDT (Blind Period)
   - **Cross-Validation Assets**: SOLUSDT, DOGEUSDT (Blind Period)
