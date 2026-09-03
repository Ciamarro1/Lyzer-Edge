# W10_ROBUSTNESS — Robustness & Null Controls Summary
**Worker**: `W10_ROBUSTNESS`  
**Timestamp UTC**: `2026-09-03T02:41:39.905Z`  
**Permutations Per Test**: 500  

---

## Empirical Null Distribution Controls

| Signal Name | Horizon | Real IC | Shuffle Null IC ($p$-val) | Sign Perm Null IC ($p$-val) | Block Shuffle Null IC ($p$-val) | Verdict |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **OFI_Momentum_H4** | 4h | **0.0056** | 0.0001 ($p=0.65$) | -0.0007 ($p=0.606$) | -0.0002 ($p=0.656$) | **FAILED_NULL_CONTROL** |
| **Absorption_Reversal_H8** | 8h | **0.0021** | -0.0004 ($p=0.886$) | -0.0003 ($p=0.8$) | 0.0003 ($p=0.906$) | **FAILED_NULL_CONTROL** |
