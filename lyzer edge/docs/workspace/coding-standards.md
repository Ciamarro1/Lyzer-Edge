# LACW — Engineering & Coding Standards

## Rules
1. **ESM Everywhere**: `"type": "module"` across all packages. Backend imports require full `.js` extensions.
2. **Strict Immutability**: All engine outputs and snapshot payloads must be frozen via `Object.freeze()`.
3. **Mandatory TC39 Disposal**: All classes must implement native `[Symbol.dispose]()`.
4. **Zero Magic Numbers**: All threshold parameters must be configured via environment variables or explicit configuration schemas.
