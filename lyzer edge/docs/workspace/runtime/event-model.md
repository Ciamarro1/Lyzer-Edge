# LACW — Universal 18-Attribute Event Model

## Mandatory Attribute Contract

```typescript
export interface UniversalEventRecord<T = Record<string, unknown>> {
  readonly id: string;
  readonly type: string;
  readonly version: string;
  readonly timestamp: number;
  readonly isoTime: string;
  readonly source: string;
  readonly actor: string;
  readonly context: Record<string, unknown>;
  readonly payload: T;
  readonly metadata: Record<string, unknown>;
  readonly correlation_id: string;
  readonly causation_id: string;
  readonly confidence: number;
  readonly importance: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'BACKGROUND';
  readonly visibility: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
  readonly permissions: readonly string[];
  readonly trace_id: string;
  readonly parent_event: string | null;
}
```
