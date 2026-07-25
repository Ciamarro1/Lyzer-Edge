# ADR-042: Provider Reality Boundary

## Context
The Lyzer Edge Command Center V2 has stabilized its internal execution pipeline (M1.1 to M1.3-Patch), guaranteeing memory safety, priority event coalescing, and rigorous error boundaries between widgets. However, the system is now entering Phase 2 (M1.4), which introduces reality sources (Live WebSockets, Historical Datasets, Replay Events, and Mock Streams). 

Without a strict architectural boundary, widgets could bypass the runtime and couple directly to data sources (e.g., establishing their own WebSockets or reading direct files). This would destroy the ability to pause, replay, and sandbox environments seamlessly. We must ensure that the Command Center acts as an observer platform with multiple controlled data universes.

## Decision
We establish the **Provider Reality Boundary** via the `IDataProvider` interface and enforce the following rules:

1. **Runtime Isolation:** All external data enters exclusively through the `IDataProvider` contract. No widget may fetch external data directly.
2. **Reality Epistemology:** Every data provider must declare its reality identity via a `realityTag` (`OBSERVED_REALITY`, `RECONSTRUCTED_REALITY`, `SYNTHETIC_REALITY`). This tag guarantees that the system knows not just "what" the data is, but "where" it came from.
3. **Memory Safety (Disposable Rule):** Every subscription created via `subscribe()` MUST return a `Disposable` object (`{ dispose: () => void }`). No subscription method may return `void`.
4. **Health Transparency:** Providers must implement a `healthCheck()` returning `ProviderHealth` (status, latency, data age). This allows the runtime and widgets to immediately know if the data source can be trusted.
5. **Runtime Decoupling:** Providers can be hot-swapped at runtime. The `CommandCenterRuntime` never knows or cares about the concrete implementation of the provider (Live, Replay, Historical, Mock).
6. **Universal Compliance:** Every new provider implementation must pass the `IDataProviderComplianceSuite` before being registered. This guarantees that all realities behave deterministically under the same contract.

## Consequences
- **Positive:** Maximum testability and deterministic replay capabilities. Widgets remain entirely pure and oblivious to data sources.
- **Negative:** Increased initial boilerplate to implement a new data source, as it must conform to the unified contract and pass the compliance suite.

## Compliance
Enforced via unit testing (`dataProvider.contract.js`) and Code Review (MCR). Any direct data fetching within a widget (e.g., `fetch()`, `new WebSocket()`) is treated as a severe architectural violation and blocked at the PR level.
