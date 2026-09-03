# Gate G1 — Mathematical Specification of Null Generators
**Document ID**: `G1_GENERATORS_SPEC_v1`  
**Engine Under Audit**: `InstitutionalQuantSignalEngine` (V8)  

---

## 1. Deterministic Pseudo-Random Number Generator (PRNG)
To ensure 100% bitwise reproducibility across operating systems and Node versions, all random sampling uses **Mulberry32**:
```javascript
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```
Gaussian variates are generated via the exact Box-Muller transform:
$$Z_1 = \sqrt{-2 \ln U_1} \cos(2\pi U_2), \quad Z_2 = \sqrt{-2 \ln U_1} \sin(2\pi U_2)$$

---

## 2. Null Generator Specifications

### N1 — Gaussian IID (`01_gaussian_iid.js`)
- **Return Distribution**: $r_t \sim \mathcal{N}(0, \sigma^2)$ with $\sigma = 0.010$ (1.0% hourly scale).
- **Price Evolution**: $P_0 = 50,000$, $P_t = P_{t-1} \cdot \exp(r_t)$.
- **Intra-bar Microstructure**:
  - $Open_t = P_{t-1}$
  - $Close_t = P_t$
  - $High_t = \max(Open_t, Close_t) \cdot \exp(|Z_{high}| \cdot 0.003)$
  - $Low_t = \min(Open_t, Close_t) \cdot \exp(-|Z_{low}| \cdot 0.003)$
  - $Volume_t = 1,000 \cdot \exp(Z_{vol} \cdot 0.20)$

### N2 — Student-$t$ IID (`02_student_t_iid.js`)
- **Return Distribution**: Independent heavy tails sampled with $\nu \in \{3, 5, 8\}$ degrees of freedom:
  $$V \sim \sum_{k=1}^\nu Z_k^2 \sim \chi^2(\nu), \quad r_t = \sigma \cdot \sqrt{\frac{\nu - 2}{\nu}} \cdot \frac{Z_0}{\sqrt{V / \nu}}$$
  Normalized so that $\text{Var}(r_t) = \sigma^2$ for $\nu > 2$.
- **Economic Null**: Fat tails and catastrophic kurtosis exist, but directional drift is strictly zero ($E[r_t] = 0$).

### N3 — Random Walk / GBM (`03_random_walk.js`)
- **Price Process**: Discrete Geometric Brownian Motion:
  $$\ln P_t = \ln P_0 + \sum_{i=1}^t \epsilon_i, \quad \epsilon_i \sim \mathcal{N}(0, \sigma^2)$$
- **Economic Null**: Tests whether integrated $I(1)$ price series induce spurious trend or spurious mean-reversion signals in V8.

### N4 — Temporal Shuffle (`04_temporal_shuffle.js`)
- **Source Data**: 32,136 empirical 1-hour log returns from `research/datasets/batch039/BTCUSDT_1h.json`.
- **Transformation**: A segment of length $T = 200$ returns is sampled and permuted using deterministic Fisher-Yates shuffle.
- **Economic Null**: Retains the exact empirical marginal distribution, empirical skewness, and empirical kurtosis of Bitcoin, but completely destroys the causal temporal arrow and autocorrelation.

### N5 — Block Bootstrap / Block Shuffle (`05_block_shuffle.js`)
- **Source Data**: Empirical returns from `BTCUSDT_1h.json`.
- **Transformation**: Partitioned into contiguous non-overlapping blocks of size $B \in \{5, 10, 20\}$ bars. Blocks are permuted via Fisher-Yates.
- **Economic Null**: Preserves short-term microstructural persistence within blocks, but destroys multi-block macro trends.

### N6 — Volatility-Only GARCH(1,1) Null (`06_volatility_null.js`)
- **Process Dynamics**:
  $$r_t = \sigma_t \cdot \epsilon_t, \quad \epsilon_t \sim \mathcal{N}(0, 1)$$
  $$\sigma_t^2 = \omega + \alpha r_{t-1}^2 + \beta \sigma_{t-1}^2$$
  Parameters: $\omega = 10^{-6}, \alpha = 0.10, \beta = 0.85$ (persistence $\alpha + \beta = 0.95$).
- **Economic Null**: Strong volatility clustering, time-varying conditional variance, zero conditional directional predictability ($E[r_t \mid \mathcal{F}_{t-1}] = 0$).
