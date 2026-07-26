# LACW — Context Engine Architecture

## Overview
The `ContextEngine` is the single source of truth for global systemic context. Every component in LACW consumes context from this engine.

---

## Context State Schema
```typescript
export interface SystemicContextSnapshot {
  readonly user: { readonly id: string; readonly role: string };
  readonly currentMission: string;
  readonly activeWorkspacePreset: string;
  readonly activeAgents: readonly string[];
  readonly priority: 'HIGH_PRECISION' | 'MAX_THROUGHPUT' | 'SAFETY_CONTAINMENT';
  readonly hasActiveIncident: boolean;
  readonly hasActiveExperiment: boolean;
  readonly hasOpportunity: boolean;
  readonly hasRiskAlert: boolean;
  readonly riskLevel: 'LOW_NOMINAL' | 'ELEVATED' | 'CRITICAL';
  readonly updatedAt: number;
}
```
