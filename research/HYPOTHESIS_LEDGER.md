# 📚 GLOBAL HYPOTHESIS LEDGER

This ledger maintains a permanent, immutable record of all scientific hypotheses explored in the Lyzer Edge Quantitative Laboratory. 
**No hypothesis shall be deleted, modified after results are observed, or have its failure hidden.**

## 🔴 ARCHIVED (REJECTED / FAILED) HYPOTHESES

| ID | Batch | Hypothesis | Primary Rejection / Archive Reason |
|----|-------|------------|-----------------------------------|
| **H001** | 003 | Reversão ao POC em Falhas de Leilão | 62.5% of events diverged instead of reverting. |
| **H002** | 004 | SMC BOS de Swing Pivot | Latency forces entry at extreme top, negative expectancy. |
| **H003** | 004 | Ordens Limite de Pullback | Severe adverse selection; limit fills correlate with breakdowns. |
| **H004** | 005 | Continuação de Queda em Bitcoin | Bearish displacements suffer massive liquidity absorption. |
| **H005** | 008B | V8.1-DIPBUY | Pure statistical noise ($p=0.40$). |
| **H006** | 008A | V8.0-DISPLACEMENT-FVG-LONG | Over-filtration (N=63) destroyed Walk-Forward Analysis (6/10). |
| **H007** | 010 | V8.2-DISPLACEMENT-MOMENTUM | Overlap Illusion: dependent trades inflated N and p-value. |
| **H008** | 011 | V8 FAMILY (CLUSTER PYRAMIDING) | Failed FWER Correction (Bonferroni $\alpha = 0.000185 > p = 0.0145$). |
| **H009** | 013 / ALPHA_FACTORY_H009 | Wyckoff Spring / Volume Rejection | Failed cross-asset replication across 6 core assets in 1H (2023–2024). 6/6 assets exhibited negative expectancy (pooled $E[R] = -0.247R$, $\text{PF} = 0.76$, $p_{\text{block}} = 0.8640$, $q_{\text{BY}} = 1.0000$). Negative continuation control outperformed spring setup (+0.329R). Cross-asset generalization claim is FALSIFIED. Promotion blocked; holdout 2025–2026 untouched. |
| **H010** | OFI001 | Cumulative Order Flow Imbalance (L=6h, H=24h) | Failed Block Permutation ($p=0.0599 \ge 0.05$) in BTC; sign inversion on ETH replication ($IC = -0.0266$). Specific generalization claim falsified. |
| **H011** | AD002 / H011_VCB | Volatility Compression Breakout (θ=0.65, K=40, v=1.50, 1:5 RR) | Confirmatory claim rejected/not confirmed on Virgin Population C (BNB/XRP/ADA/SUI). Primary statistical gate failed ($p_{\text{block}} = 0.0945 \ge 0.0500$) and minimum sample-size gate failed ($N = 50 < 150$). Economic signal was positive ($E[R] = +0.589R$, $\text{PF} = 1.77$, 4/4 assets positive), but sample power is insufficient to confirm. Economic mechanism NOT falsified, but production promotion is permanently blocked. |
| **AD003** | AD003_TSD | Temporal Scale Dependence of Volatility Compression Breakouts (15m, 30m, 2h, 4h, 1:5 RR) | Discovery failure: 0/40 hypotheses met joint criteria ($N \ge 60$ observed eligible trades and $q_{\text{BY}} < 0.0500$). Apparent significance in 4 cells proved to be mechanical artifact of centered bootstrap on $N \le 4$. Setups in 15m/30m filtered by 80 bps feasibility floor; setups in 2h/4h suffered structural event density scarcity over 2 years. Economic mechanism NOT falsified, but scale invariance hypothesis remains unestablished. All promotions blocked; holdout 2025–2026 untouched and permanently sealed. |
| **AD004** | AD004_FUNDING | Perpetual Funding Rate Dislocation & Squeeze Mechanics (8h, 2023–2024 Discovery) | Discovery completed (16 cells, 13,158 observations). Structural asymmetry isolated: Short Squeeze (buying on extreme negative funding $Z \le -2.5, H=24\text{h}$) yielded $E[R] = +0.265R$, $\text{PF} = 1.95$, $p_{\text{block}} = 0.0432$, $N = 170$ with 5/6 assets positive (BTC PF=4.35, ETH PF=5.15). Long Flush (shorting on positive funding) was falsified. Direct automatic promotion from mixed grid blocked by BY multiplicity penalty ($q_{\text{BY}} = 1.0000$). Candidate isolated as H012 for frozen confirmatory charter. Holdout 2025–2026 untouched. |
| **H012** | AD004 / H012_FUNDING | Perpetual Short Squeeze via Funding Dislocation ($Z \le -2.5, H=24\text{h}$) | Confirmatory claim rejected/not confirmed on Virgin Temporal Holdout (2025–2026). Sample size was sufficient ($N = 192 \ge 100$), but strategy failed primary statistical significance ($p_{\text{block}} = 0.7301 \ge 0.0500$) and economic expectancy ($E[R] = -0.046R < +0.150R$, $\text{PF} = 0.89$, $\text{MaxDD} = 17.34R$). In 2025–2026, protracted altcoin bleeding during negative funding (ETH $-0.263R$, SOL $-0.348R$) overwhelmed the collected funding cash flows. Generalization claim falsified; production promotion is permanently blocked. |
| **AD005** | AD005_SPREAD | Cross-Sectional Momentum & Market-Neutral Spread (6 assets, 1h, 2023–2024 Discovery) | Discovery failure: 0/12 hypotheses met joint criteria ($q_{\text{BY}} < 0.0500$ and $E[R] \ge +0.150R$). Cross-sectional mean reversion was comprehensively falsified across all lookbacks (all cells negative down to $-0.272R$). Cross-sectional momentum showed positive gross drift at 168h lookback ($+0.111R, \text{PF}=1.15$), but was insufficient to overcome the 24 bps roundtrip spread friction ($p_{\text{block}} = 0.2507, q_{\text{BY}} = 1.0000$). Promotions blocked; holdout 2025–2026 untouched. |
| **AD006** | AD006_CARRY | Structural Funding Yield Harvest & Delta-Neutral Carry Engine (2023–2024 Discovery) | **DISCOVERY SUCCESS:** 9/9 cells approved under Benjamini–Yekutieli ($q_{\text{BY}} \le 0.0020 \ll 0.0500$). Static BTC/ETH carry achieved **+10.73% annualized net yield**, Sharpe **30.80** and MaxDD **0.11%** under 24 bps friction. Delta=0 eliminated price volatility, and multi-month carry amortized transaction friction to near-zero. Lead candidate promoted as H013 for frozen Confirmatory Charter on Holdout 2025–2026. |

---

## 🟡 EXPLORATORY HYPOTHESES (IN PROGRESS)

| ID | Batch | Hypothesis | Status | Note |
|----|-------|------------|--------|------|
| **H013** | AD006 | Delta-Neutral Cash-and-Carry Basis Arbitrage in BTC/ETH ($\Delta = 0$) | CANDIDATE ISOLATED | Isolated from AD006 Discovery (AnnYield = $+10.73\%$, Sharpe = $30.80$, MaxDD = $0.11\%$, $q_{\text{BY}} = 0.0004$). Awaiting frozen Confirmatory Charter on Holdout 2025–2026. |

## 🟢 CONFIRMED HYPOTHESES (PRODUCTION READY)
*None active.*
