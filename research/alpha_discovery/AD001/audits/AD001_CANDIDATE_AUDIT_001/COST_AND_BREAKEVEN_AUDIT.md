# AD001 Candidate Audit — Cost Reconstruction & Break-Even Friction Analysis
**Audit ID**: `AD001_CANDIDATE_AUDIT_001`  
**Timestamp UTC**: `2026-09-03T03:17:01.822Z`  
**Purpose**: Determine the exact degradation slope of edge across rising execution costs and establish break-even friction.  

---

## 1. Cost Sensitivity Matrix across Core OFI Candidates

| Candidate ID | Asset | Horizon | Trades ($N$) | Gross Return | 5 bps Net | 10 bps Net | 15 bps Net | 20 bps Net | **Break-Even Friction** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `BTC_OFI_L6_H24` | BTC | H24 | 290 | **+35.37 bps** | +30.37 bps | **+25.37 bps** | +20.37 bps | 15.37 bps | **35.37 bps** |
| `ETH_OFI_L3_H12` | ETH | H12 | 745 | **+19.86 bps** | +14.86 bps | **+9.86 bps** | +4.86 bps | -0.14 bps | **19.86 bps** |
| `DOGE_OFI_L6_H24` | DOGE | H24 | 306 | **+53.2 bps** | +48.2 bps | **+43.2 bps** | +38.2 bps | 33.2 bps | **53.2 bps** |
| `SOL_OFI_L12_H8` | SOL | H8 | 208 | **+30.02 bps** | +25.02 bps | **+20.02 bps** | +15.02 bps | 10.02 bps | **30.02 bps** |

---

## 2. Friction Headroom Evaluation
- **BTC Cumulative OFI**:
  - Gross expectancy is **+35.37 bps**.
  - At institutional VIP/Maker tier (0 to 2 bps) and standard taker tier (5 to 10 bps), net edge is strongly positive (+25.37 to +33.37 bps).
  - Break-even friction is **35.37 bps**, providing a substantial safety buffer against slippage.
- **ETH Cumulative OFI**:
  - Gross expectancy is **+19.86 bps**.
  - Break-even friction is **19.86 bps**. At 10 bps friction, net expectancy is **+9.86 bps**.
