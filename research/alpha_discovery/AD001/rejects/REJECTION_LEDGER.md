# Alpha Discovery 001 — Rejection Ledger
**Campaign**: `ALPHA_DISCOVERY_001`  
**Total Hypotheses Tested**: 1,580  
**Total Hypotheses Rejected**: 1,512 (95.7% rejection rate)  
**Governance Principle**: Anti-P-Hacking and Comprehensive Rejection Accounting  

---

## 1. Breakdown of Rejections by Worker Domain

| Worker ID | Domain | Hypotheses Tested | Rejections | Rejection Rate | Primary Failure Mode |
|---|---|:---:|:---:|:---:|---|
| **W01_PRICE** | Price Dynamics (Momentum / Reversal / Acceleration) | 660 | 655 | **99.2%** | High friction drag: unconditioned price momentum fails to beat 10 bps round-trip friction. |
| **W02_VOLATILITY** | Volatility Dynamics & Shocks | 120 | 119 | **99.2%** | Nominal significance on volatility expansion was erased after Newey-West HAC correction for persistence. |
| **W03_MICROSTRUCTURE** | Order-Flow Imbalance & Aggressor Pressure | 261 | 256 | **98.1%** | Very short horizons ($H=1h, 2h$) dominated by spread/friction; only $H \ge 8h$ cumulative flow survived. |
| **W04_LIQUIDITY** | Kyle Lambda & Passive Absorption | 62 | 62 | **100.0%** | Absorption signals had low event counts ($N < 20$) or failed two-tailed HAC significance ($p \ge 0.05$). |
| **W05_FUNDING_OI** | Funding Rates & Perpetual Basis | 120 | 116 | **96.7%** | Funding dislocations on major assets (BTC/ETH) showed slow decay requiring multi-day holding. |
| **W06_REGIME** | Hurst Regime-Gated Trends | 120 | 120 | **100.0%** | Gating reduced trade frequency without improving per-trade net expectancy enough to overcome friction. |
| **W07_CROSS_ASSET** | BTC Lead-Lag & Relative Strength | 108 | 108 | **100.0%** | Altcoins cointegrated tightly with BTC; lagged lead effects had negative or non-significant ICs. |
| **W08_LEAD_LAG** | Horizon Decay Mapping | 36 | 35 | **97.2%** | Sub-4h horizons suffered severe friction drag; signal decay occurs rapidly past 24h. |
| **W09_INTERACTIONS** | Multi-Variable Interactions | 93 | 93 | **100.0%** | Interaction terms reduced sample sizes and introduced noise without outperforming single-factor OFI. |
| **Total** | **All 10 Hypothesis Families** | **1,580** | **1,512** | **95.7%** | **Consistently Fail-Closed across naive specifications.** |

---

## 2. Key Scientific Lessons from Rejections
1. **Naive Price Momentum is Dead in Crypto Hourly Data**:
   Over 99% of simple momentum and mean-reversion signals without volume or order-flow conditioning generate negative net expectancy after 10 bps friction. The market is efficiently arbitrageable at the level of simple past price trajectories.
2. **Order-Flow Imbalance is Incremental**:
   The few hypotheses that survived ($W03$) incorporate signed taker aggressor volume, proving that flow contains information that price alone does not disclose.
3. **Execution Friction is the Primary Falsifier**:
   Dozens of hypotheses showed positive gross correlation ($IC > 0$, $p < 0.05$), but collapsed immediately under 5 bps or 10 bps friction.
