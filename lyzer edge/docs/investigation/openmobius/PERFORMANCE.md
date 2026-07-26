# 🏛️ OpenMobius Skill — Performance Specification

---

## 1. Runtime Performance Budget

| Metric | Target Limit | Institutional Rationale |
|---|---|---|
| Latency per Candle | $< 50\,\mu\text{s}$ | Must process continuous high-frequency streams without event loop lag |
| Peak Throughput | $> 20,000\,\text{candles/sec}$ | Required for rapid multi-year backtesting & replay |
| Memory Footprint | $< 5\,\text{MB}$ per asset instance | Must allow 50+ concurrent currency pairs |
| GC Pauses | $0\,\text{ms}$ (Zero allocation during tick loop) | Backed by pre-allocated `RingBuffer` |
| Mount Time | $< 50\,\text{ms}$ | Must meet Platinum Widget Compliance Gate |

---

## 2. Allocation Optimization Plan
- Replace raw JS arrays `[]` in FVG / OB tracking with `Float64Array` buffers.
- Reuse static payload structures to minimize Garbage Collection overhead.
