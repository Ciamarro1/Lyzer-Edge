# 🏛️ LYZER EDGE — BATCH 011 PRE-REGISTRATION

## 1. EPISTEMIC GOAL
Investigate if the clustering of Bullish Displacement events contains causal/incremental information about regime persistence, and whether this information can be translated into a structural pyramiding architecture without fabricating alpha via temporal overlap.

## 2. HYPOTHESES
- **H1 (Regime Ignition):** A first Displacement event increases the probability of subsequent directional persistence.
- **H2 (Cluster Information):** The occurrence of secondary and tertiary Displacements within a short temporal gap adds incremental causal information regarding trend persistence.
- **H3 (Structural Pyramiding):** If H1 and H2 are true, adding exposure dynamically upon cluster validation will yield a higher Return per Unit of Risk than fixed-position or naive stacking models.

## 3. UNIVERSE OF EXPLORATION
- **Cluster Gaps:** 1h, 2h, 4h, 8h, 12h, 24h. (Any two events closer than the gap belong to the same cluster).
- **Execution Horizons:** 12h, 24h, 36h, 48h, 60h, 72h, 84h, 96h, 120h.
- **Pyramiding Architectures (Risk Units):**
  - Baseline (One Position): `1.0`
  - Linear Scale: `1.0 / 0.5 / 0.25`
  - Flat Scale: `1.0 / 0.5 / 0.5 / 0.5`
  - Aggressive Scale: `1.0 / 0.75 / 0.5`

## 4. STATISTICAL MULTIPLICITY (FWER)
- The tests will explore 6 Gaps * 9 Horizons = 54 core configurations, plus Pyramiding variants.
- Institutional Alpha = 0.01.
- Bonferroni Corrected Alpha = 0.01 / 54 = 0.000185.
- P-values from permutations must clear this threshold to reject the null hypothesis of randomness.

## 5. STATISTICAL UNIT
The fundamental unit of statistical measurement will shift from **TRADE-LEVEL** to **CLUSTER-LEVEL**. Permutations and WFA will evaluate independent clusters, neutralizing the overlap illusion discovered in Batch 010.

## 6. INTEGRITY PROTOCOL
- Track A (Shadow Lockbox) remains 100% immutable.
- Frozen Config hash verified before and after.
- Parallel workers will run isolated datasets and RNG seeds.
