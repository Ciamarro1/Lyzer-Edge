# Lyzer Edge — V8 Heap Dynamic Dependency Profile

| Dependency | Status in V8 Heap | Usage Context |
| :--- | :---: | :--- |
| `express` | ✅ Loaded | Backend HTTP Server (`backend/server.js`) |
| `ws` | ✅ Loaded | Realtime WebSocket Engine |
| `vitest` | ✅ Loaded | Test Automation Runner |
| `vite` | ✅ Loaded | Single Page Application Bundler |
| `better-sqlite3` | ✅ Loaded | Causal Memory Database |
| `@huggingface/hub` | ❌ Unloaded | Dead Static Declaration (Safe to remove) |
| `isomorphic-git` | ❌ Unloaded | Dead Static Declaration (Safe to remove) |
| `ts-node` | ❌ Unloaded | Replaced by `tsx` (Safe to remove) |
