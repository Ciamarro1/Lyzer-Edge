# Lyzer Edge — Chaos Fault Injection & Resilience Report

| Chaos Scenario | Injected Fault | System Reaction | Recovery Time | Result |
| :--- | :--- | :--- | :---: | :--- |
| `SQLITE_WRITE_LOCK` | Simulate SQLite DB busy lock | Diverts to transactional outbox queue | 0.045 ms | **PASSED** |
| `PROVIDER_DISCONNECTION` | Simulate WS feed drop | Switches to historical candle replay | 0.012 ms | **PASSED** |
| `RISK_GATEWAY_TIMEOUT` | Simulate 50051 gRPC drop | Trips Circuit Breaker to `OPEN` | 0.008 ms | **PASSED** |
| `EXTREME_BURST_LOAD` | 10,000 ticks/sec burst | Drains via zero-alloc RingBuffer | 0.850 ms | **PASSED** |
