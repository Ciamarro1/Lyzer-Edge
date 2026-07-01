# Candidate Integrity Audit Specification

## Overview
This specification defines the mandatory integrity checks for Release MRCP-gamma: Evidence Admission Ceremony (EAC). The fundamental objective is to mathematically and procedurally guarantee that the evidence state has not been subjected to future leakage or unauthorized manual alteration prior to activation.

## 1. Integrity Verification Protocols

### 1.1 Temporal Isolation (Future Leakage Prevention)
To ensure the candidate evidence has not benefited from future data (lookahead bias), the following checks must pass:
- **Timestamp Boundary Enforcement:** All evidence data points must carry cryptographically signed timestamps strictly bounded by the predefined cutoff epoch.
- **Reference Resolution Audit:** Automated scan of all feature dependencies to ensure no downstream references point to data generated after the cutoff.
- **Out-of-Band Data Detection:** Heuristic and structural checks to detect anomalies indicative of data injection from unauthorized, non-time-locked sources.

### 1.2 Immutability Assurance (Manual Alteration Check)
To ensure no human operator has manually altered the evidence state post-generation:
- **Cryptographic Hashing:** The entire evidence payload must generate a SHA-384 hash that perfectly matches the locked origin state hash.
- **State Delta Zero:** Any deviation (delta > 0) between the locked repository state and the pre-activation state triggers an automatic failure.
- **Access Control Ledger:** Review of immutable system logs to ensure zero unauthorized write-access events occurred on the evidence database partition.

## 2. Dual-Key Audit Trace

Activation of the evidence candidate is strictly gated behind the **Dual-Key Audit Trace**. Both an algorithmic proof and human authorization must be recorded immutably before the candidate can transition to an active state.

### 2.1 Algorithm Signature
- **Signatory:** Automated Verification Engine
- **Prerequisite:** 100% pass rate on all Temporal Isolation and Immutability checks.
- **Payload:** The cryptographic state hashes, the execution trace of the integrity checks, and the engine's internal verifiable claim.

### 2.2 Human Signature
- **Signatory:** Authorized Quantitative Researcher / Governance Officer
- **Prerequisite:** Successful generation of the Algorithm Signature and manual verification of the context/justification for the candidate.
- **Payload:** Cryptographic authorization token of the reviewer, exact timestamp of approval, and systemic confirmation of procedural compliance.

## 3. Activation Gate Rules
- **Condition for Activation:** Both the Algorithm Signature and Human Signature must be present, valid, and cryptographically verified.
- **Failure Mode:** If either signature is missing, forged, or fails validation, the system will execute an immediate hard halt. The candidate will be marked as **REJECTED**, and a priority alert will be escalated to the Executive Governance tier.
