# LACW — Institutional Decision Engine Specification

## Overview
Every decision produced by the system is fully reconstructible and signed with a cryptographic certificate.

---

## Decision Record Schema
```typescript
export interface InstitutionalDecisionRecord {
  readonly decisionId: string;
  readonly goal: string;
  readonly alternativesEvaluated: readonly string[];
  readonly constraintsApplied: readonly string[];
  readonly evidenceAttributions: Record<string, number>;
  readonly participatingAgents: readonly string[];
  readonly confidenceScore: number;
  readonly courtApprovalCertificateId: string;
  readonly timestamp: number;
}
```
