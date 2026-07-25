# Patient Zero Election (Worker B)
## MRCP-Epsilon: Patient Zero Election Protocol

**Worker:** B (Election Execution)
**Objective:** Evaluate the Top 3 nominees from MRCP-Delta based on the Election Criteria Matrix and officially declare Patient Zero.

### Evaluation Criteria
Based on `election_criteria_matrix.md`, candidates are scored from 1 to 10 on the following 4 dimensions:
- **FP (Falsification Potential):** How well it can reveal flaws in REL.
- **DR (Diagnostic Richness):** How much we learn if REL fails.
- **AD (Ambiguity Density):** Must live in the intermediate zone (not too obvious, not too chaotic).
- **RF (Replay Feasibility):** Ease of reconstructing and repeating the experiment.

**Election Score** = FP + DR + AD + RF (Max 40)

---

### Candidate Evaluation

#### Candidate 04: Severe Single-Period Liquidity Crisis
*   **FP (9/10):** The instantaneous, mechanical market structure failure provides exceptional potential to expose flaws in REL's structural constraints and liquidity models.
*   **DR (9/10):** If REL fails during this pure structural crisis, the resulting errors will be highly mechanical and actionable, rather than vague behavioral deviations.
*   **AD (8/10):** Offers an optimal level of complexity—a severe shock that is neither too simple to resolve nor too protracted and chaotic.
*   **RF (10/10):** Perfectly feasible to replay. The pure order-book and liquidity dynamics ensure exact reconstruction and repeatable testing.
*   **Election Score: 36/40**

#### Candidate 06: Commodity Margin Failure
*   **FP (7/10):** Margin cascading challenges structural limits, but falsification is constrained to margin mechanics rather than broad systemic limits.
*   **DR (7/10):** Provides solid diagnostic data, but the scope of insights is narrower compared to a full liquidity vacuum.
*   **AD (7/10):** Moderate complexity; the margin cascade is interesting but potentially relies on specific contract rules.
*   **RF (6/10):** Moderate replay feasibility due to the need to model specific margin requirements and collateral cascades.
*   **Election Score: 27/40**

#### Candidate 02: Parabolic Speculative Surge
*   **FP (5/10):** Psychological bubbles test sentiment handling but may not stress-test the core structural limits of REL as effectively.
*   **DR (6/10):** Failure here might yield obscure behavioral diagnostics rather than clear structural insights.
*   **AD (5/10):** Leans toward chaotic, making it difficult to isolate the exact cause of a REL failure.
*   **RF (5/10):** Requires moderate-to-high reconstruction cost to accurately model the evolving multi-period speculative behavior.
*   **Election Score: 21/40**

---

### Official Declaration

**Patient Zero is officially declared as Candidate 04: Severe Single-Period Liquidity Crisis.**

**Justification:**
Candidate 04 maximizes epistemic learning. By isolating a pure, mechanical market structure failure with low reconstruction cost (high RF) and high diagnostic richness (DR), it provides the perfect environment to challenge and potentially falsify REL. This candidate perfectly satisfies the constitutional clause: it is chosen to maximize the probability of discovering where REL is wrong.
