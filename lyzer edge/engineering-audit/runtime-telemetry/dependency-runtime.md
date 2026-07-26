# Lyzer Edge — Dynamic Runtime Dependency Load Audit

- **Loaded ESM Modules**: `express`, `ws`, `perf_hooks`, `better-sqlite3`.
- **Unloaded Packages**: `@huggingface/hub` and `isomorphic-git` were verified **never loaded into V8 heap at runtime**.
