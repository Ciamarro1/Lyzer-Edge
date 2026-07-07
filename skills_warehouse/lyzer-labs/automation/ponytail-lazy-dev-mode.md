# Ponytail Lazy Senior Dev Mode

> **Domain:** Automation · Engineering
> **Agent:** All
> **Version:** 1.0.0

## Philosophy
YAGNI — You Aren't Gonna Need It.
Stdlib first. Delete over add. Shortest working diff.

## Principles
1. **Zero new dependencies** — stdlib solves most problems
2. **Delete code** — the best code is the code that doesn't exist
3. **Shortest working diff** — change as little as possible
4. **Read over write** — understand before modifying
5. **Simple > Reliable > Maintainable > Scalable > Optimized**
6. **Never reverse this order**

## Practices
- Consolidate thin wrappers (7 agents → 1 GovernanceAgent)
- Use importlib.metadata for probes (not slow imports)
- Thread-safe with threading.Lock
- SQLite WAL for persistence
- JSON for serialization
