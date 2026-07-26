# LACW — Widget Engine & Plugin Contract Standard

## Overview
Every UI component inside LACW is an isolated, contract-governed Widget Plugin. No raw un-sandboxed components are permitted.

---

## Plugin Contract Interface (`IWidgetPlugin`)

```typescript
export interface IWidgetPlugin {
  readonly manifest: {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly minRuntimeVersion: string;
    readonly targetPane: 'LEFT_PANEL' | 'CENTER_CANVAS' | 'RIGHT_PANEL' | 'BOTTOM_DRAWER';
    readonly realityTag: 'OBSERVED_REALITY' | 'INFERRED_REALITY' | 'SYNTHETIC_REALITY';
    readonly capabilities: Array<'market_data:read' | 'evidence:publish' | 'telemetry:read' | 'layout:manage' | 'command:execute'>;
    readonly description: string;
  };

  mount(container: HTMLElement, context: Record<string, unknown>): Promise<{ dispose: () => void }>;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

---

## Certification Levels
1. **GOLD**: Plugin implements contract, supports mounting, and declares capabilities.
2. **PLATINUM**: Plugin passes 100% compliance gate checks in `scripts/architectureCertification.js`, demonstrates zero memory leaks, implements TC39 `Symbol.dispose`, and includes Vitest unit tests.
