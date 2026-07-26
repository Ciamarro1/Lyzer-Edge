# LACW — Universal Command Palette Architecture (Ctrl+K)

## Overview
Inspired by Raycast and Cursor, the `LACWCommandPalette` is a keyboard-first universal command bus enabling full control over the workspace without requiring visual navigation through submenus.

---

## Action Registry Architecture

```typescript
export interface CommandSpec {
  readonly id: string;
  readonly title: string;
  readonly category: 'WORKSPACE' | 'AGENT' | 'EXPLAINABILITY' | 'OBSERVABILITY' | 'RESEARCH';
  readonly shortcut?: string;
  readonly keywords: string[];
  readonly handler: (args?: Record<string, unknown>) => Promise<unknown>;
}
```

---

## Built-In Commands
- `workspace:switch-preset` (`Ctrl+Shift+P`): Switches workspace layout preset.
- `agent:query-state` (`Ctrl+Shift+A`): Queries live agent execution state & memory.
- `explain:decision-lineage` (`Ctrl+Shift+E`): Explains causal evidence lineage for any decision.
- `observability:open-traces` (`Ctrl+Shift+T`): Opens distributed trace spans and latency quantiles.
