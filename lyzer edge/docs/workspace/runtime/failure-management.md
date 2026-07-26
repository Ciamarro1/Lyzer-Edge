# LACW — Resilience & Failure Management

## Resilience Strategies
1. **Exponential Backoff Retries**: Automatic retry with jitter.
2. **Circuit Breakers**: State machine (`CLOSED` $\to$ `OPEN` $\to$ `HALF_OPEN`). Trips after 3 consecutive failures.
3. **Fallback Handlers**: Graceful degradation to secondary providers or historical cache.
