# Lyzer Edge — Runtime Map & Isolation Topology

## Runtime Isolation Architecture
- **Process 1**: Execution Node (Node.js ESM + Express 5 on port 7860)
- **Process 2**: ECA Court Node (Rust `lyzer-core-hub` binary)
- **Process 3**: Dashboard Node (Vite Single Page App)

## Telemetry & Event Streams
- StreamEngine spawns 6 parallel asset instances.
- Zero-memory-leak guaranteed via TC39 `[Symbol.dispose]` across 142 Disposable SDK engines.
