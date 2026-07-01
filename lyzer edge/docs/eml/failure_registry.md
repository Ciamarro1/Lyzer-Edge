# EML-B: Failure Registry (REL vs Reality Matrix)

**Purpose**: This registry captures and standardizes instances where the REL (Reference Execution Layer) diverges from empirical reality. It is designed to document falsifications, near-falsifications, ambiguities, and interpretation anomalies.

## Matrix Structure

| Incident ID | Timestamp | Category | Description | REL Expectation | Empirical Reality | Divergence Vector | Status | Resolution/Notes |
|-------------|-----------|----------|-------------|-----------------|-------------------|-------------------|--------|------------------|
| FR-0001 | [YYYY-MM-DD] | Falsification | [Brief description] | [What REL predicted] | [What actually happened] | [Why they differ] | OPEN | [Action steps] |
| FR-0002 | [YYYY-MM-DD] | Near-Falsification | [Brief description] | [What REL predicted] | [What actually happened] | [Why they differ] | OPEN | [Action steps] |
| FR-0003 | [YYYY-MM-DD] | Ambiguity | [Brief description] | [What REL predicted] | [What actually happened] | [Why they differ] | OPEN | [Action steps] |
| FR-0004 | [YYYY-MM-DD] | Interpretation Anomaly | [Brief description] | [What REL predicted] | [What actually happened] | [Why they differ] | OPEN | [Action steps] |

## Category Definitions

1. **Falsification**: The REL explicitly predicted an outcome or state that was unequivocally contradicted by empirical reality. The model must be adjusted.
2. **Near-Falsification**: The REL's prediction was technically correct under narrow conditions, but structurally flawed or practically unusable in reality. A severe warning sign.
3. **Ambiguity**: The REL's specification or prediction lacked sufficient detail to be definitively verified or falsified by empirical reality. Indicates missing parameters or undefined bounds.
4. **Interpretation Anomaly**: The REL and empirical reality align in data, but the REL's semantic interpretation of that data is flawed or misleading.

## Usage Protocol

- **Detection**: Any divergence must be logged immediately upon detection.
- **Classification**: Assign the appropriate category based on the definitions above.
- **Analysis**: Detail the REL Expectation, Empirical Reality, and the Divergence Vector.
- **Resolution**: Track the status until the REL is updated or the anomaly is resolved.
