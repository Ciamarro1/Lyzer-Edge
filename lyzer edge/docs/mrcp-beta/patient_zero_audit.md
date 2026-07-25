# MRCP-beta: Patient Zero Selection Event - Audit Protocol

## 1. Executive Summary
This document specifies the audit protocol for the "Patient Zero" selection event under the MRCP-beta release. The absolute priority of this protocol is to guarantee **No Outcome Leakage** before a candidate is accepted into the experimental cohort.

## 2. No Outcome Leakage Guarantee
Outcome Leakage occurs when future states, subsequent events, or post-selection results inadvertently influence the selection criteria or data features available at the time of evaluation. 

To structurally guarantee zero leakage:
- All data fed into the selection mechanism must pass a rigorous temporal boundary check.
- Feature derivation must strictly utilize historical records existing at or prior to the selection timestamp ($T_0$).
- Information pipelines must be physically or logically isolated from any subsequent outcome labels.

## 3. Narrative Leakage Score (NLS)
The primary quantitative measure of temporal data integrity is the **Narrative Leakage Score (NLS)**.

### 3.1 Definition
The NLS measures the risk that narrative text, metadata, or structured features contain implicit or explicit forward-looking information. It is calculated by analyzing causal dependencies and semantic correlations against known future vectors.

### 3.2 Threshold and Policy
- **Threshold:** $\text{NLS}_{max} = 0.05$
- **Mandatory Action:** If the NLS exceeds the threshold ($\text{NLS} > 0.05$), the case is **immediately rejected**.
- **Overrides:** None. If a case is rejected due to a high NLS, it cannot be manually forced into the Patient Zero cohort without a complete rewrite of the candidate's historical state and a re-audit.

## 4. Audit Pipeline Execution
1. **Candidate Staging:** Ingest candidate profiles into the isolated selection environment.
2. **Temporal Scrubbing:** Remove all metadata that does not mathematically prove its creation prior to $T_0$.
3. **NLS Evaluation:** Execute the NLS AI model against the scrubbed profile.
4. **Gate Decision:**
   - **PASS:** NLS $\le 0.05$. Candidate moves to the final evaluation phase.
   - **FAIL:** NLS $> 0.05$. Candidate is rejected and quarantined for leakage analysis.
