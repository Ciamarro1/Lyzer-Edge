# LACW — Institutional Testing Strategy

## Test Pyramid
1. **Unit Tests (Vitest + jsdom)**: 100% path coverage for all SDK engines (`LACWEventBus`, `LACWLayoutEngine`, `LACWWidgetRegistry`, `LACWCommandPalette`).
2. **Compliance Certification Gate (`scripts/architectureCertification.js`)**: Evaluates all registered widgets against contract rules, mount speed, zero-leak disposal, and capability declarations.
3. **Zero-Trust Safety Verification**: Asserts zero BUY/SELL trade signals are directly emitted by UI or telemetry components.
