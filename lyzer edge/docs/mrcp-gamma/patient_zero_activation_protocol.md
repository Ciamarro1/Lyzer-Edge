# Patient Zero Activation Protocol
## Release MRCP-gamma: Evidence Admission Ceremony (EAC)

### 1. Overview
This document formalizes the final rite of passage within the Lyzer Labs ecosystem. It establishes the strict technical and operational preconditions required to officially transition an anonymous Candidate into the validated state of Patient Zero.

### 2. Activation Preconditions
The transformation from Candidate to Patient Zero is governed by strict consensus. The Activation Protocol CANNOT be initiated unless the following conditions are simultaneously met:

*   **Admission Engine = PASS**
    *   The Candidate must successfully navigate all quantitative intelligence checks, behavioral simulations, and baseline requirements evaluated by the primary Admission Engine.
*   **EAC Audit = PASS**
    *   The Evidence Admission Ceremony (EAC) must independently verify the Candidate's admission data, ensuring cryptographic integrity and absolute compliance with governance axioms.

**Failure Mode:** If either the Admission Engine or the EAC Audit returns a state other than `PASS`, the activation sequence is immediately aborted, and the entity remains in the 'Candidate' state or is purged, depending on the severity of the failure.

### 3. Execution Sequence
1.  **State Lock:** Query and freeze the current state of both the Admission Engine and the EAC Audit.
2.  **Consensus Verification:** Validate that both systems have unequivocally returned a `PASS` state.
3.  **State Transition:** Execute the structural transformation, officially designating the Candidate as 'Patient Zero'.
4.  **Immutable Record:** Commit the transformation event and associated evidence to the permanent audit log.
5.  **System Broadcast:** Propagate the new 'Patient Zero' state across all dependent Lyzer Labs subsystems.
