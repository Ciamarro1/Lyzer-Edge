# Evidence Admission Rules (MRCP-gamma)

## Overview
This document defines the strict governance and operational rules for the Evidence Admission Ceremony (EAC) under Release MRCP-gamma. Its primary purpose is to define the roles and enforce the critical Dual-Key Admission Protocol, ensuring that no single entity or process can unilaterally authorize the admission of new evidence into the system.

## Admission Roles Matrix

| Role | Responsibilities | Authorization Level |
| :--- | :--- | :--- |
| **Extractor** | Responsible for extracting, formatting, and submitting raw evidence to the EAC pipeline. | **Submit Only.** Cannot validate or admit evidence. |
| **Admission Engine** | Validates the submitted evidence against strict protocol definitions and structural constraints. | **Algorithm Certification.** Provides the first half of the Dual-Key requirement. |
| **EAC Auditor** | Human reviewer responsible for auditing the evidence, context, and structural validity. | **Human Audit Certification.** Provides the second half of the Dual-Key requirement. Has veto power. |
| **Activation Authority** | Final gatekeeper responsible for transforming fully certified evidence into "Patient Zero". | **Execute Only.** Can only execute transformation if both Algorithm and Human Certifications are present. |

## Dual-Key Admission Protocol

The integrity of the Lyzer Labs quantitative intelligence platform demands absolute rigor in evidence admission. This is enforced via the **Dual-Key Admission Rule (No Unilateral Admission Rule)**.

### Rule Definition

1. **No Unilateral Admission**: Under no circumstances can evidence be admitted into the core system ("Patient Zero" state) by a single actor, whether algorithmic or human.
2. **Algorithm Certification**: The **Admission Engine** must explicitly pass the evidence, verifying all protocol, cryptographic, and structural constraints.
3. **Human Audit Certification**: The **EAC Auditor** must explicitly pass the evidence, verifying the context, intent, and qualitative constraints. The Auditor retains full veto power to reject the evidence at any stage.
4. **Final Transformation**: The **Activation Authority** is technically restricted to perform the final transformation to "Patient Zero" *only* when valid, non-expired certifications from *both* the Admission Engine and the EAC Auditor are simultaneously present.

### Violation Constraints
Any attempt to bypass the Dual-Key requirement will trigger an immediate quarantine of the evidence and flag a critical security alert to Executive Governance.
