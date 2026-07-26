# LACW — Performance SLAs & Optimization Guidelines

## Target SLAs
- **Frame Rate**: 60 FPS under continuous telemetry stream
- **Command Palette Execution Latency**: $< 10\,\text{ms}$
- **Event Bus Dispatch Overhead**: $< 50\,\mu\text{s}$ per topic subscriber
- **Zero Heap Allocations on Hot Paths**: Telemetry and event dispatchers guarantee 0 byte allocations on tick loops.

---

## Architectural Rules
1. **Virtualization**: Tables and trace span trees exceeding 50 items must use virtual windowing.
2. **Dynamic Imports**: Lazy-load all non-critical workspace widgets.
3. **Explicit Disposal**: Mandatory TC39 `[Symbol.dispose]()` implementations.
