# Minimal Reality Contact Protocol (MRCP)
## First Empirical Dataset Specification (Epistemic Container)

**Status:** DRAFT
**Version:** 1.8.7-A
**Restriction Level:** CIA Data-Blind Protocol Active (NO ACTUAL DATA PERMITTED)

### 1. Epistemic Container (Dataset Schema)
This schema defines the structure for the first empirical dataset, focusing purely on observable evidence prior to outcome realization.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `Case_ID` | String/UUID | Unique identifier for the specific reality contact event. |
| `Evidence_Timestamp` | UTC Timestamp | The exact temporal coordinate of the observation, isolated from any subsequent events. |
| `EAR` | Float | Epistemic Anchoring Ratio. Metric of reality attachment. |
| `CPS` | Float | Cognitive Processing Score. |
| `Validation_Status` | Enum | Current state of data integrity (e.g., `PENDING_VALIDATION`, `QUARANTINED`, `VERIFIED_BLIND`). |

### 2. Contamination Rules
To maintain absolute epistemic hygiene, the following rules are strictly enforced:
- **No PnL Labels:** Any field, metadata, or implicit structure hinting at Profit and Loss (PnL) is strictly forbidden.
- **No Outcome Labels:** Any data representing the future state, resolution, or outcome of the `Case_ID` must be purged.
- **Temporal Isolation:** No data collected after the `Evidence_Timestamp` can be appended to the record.

### 3. Dataset Admission Rules
For a record to be admitted into the MRCP Dataset, it must satisfy:
1. **Source Verifiability:** The origin of the observation must be systematically provable.
2. **Blind Integrity:** The observer must not have possessed outcome knowledge at the time of the recording.
3. **Completeness:** All mandatory schema fields must be fully populated and conform to the data types.

### 4. Dataset Rejection Rules
A record will be immediately rejected and quarantined if:
1. **Outcome Contamination:** There is any detectable trace of post-event knowledge or outcome data.
2. **Temporal Ambiguity:** The `Evidence_Timestamp` cannot be definitively verified.
3. **Format Deviation:** The data fails to strictly adhere to the defined Epistemic Container schema.
