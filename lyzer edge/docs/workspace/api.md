# LACW — API Contracts & Communication Interfaces

## Interfaces
- **WebSocket Streaming (`/ws/lacw/events`)**: Streams live topic-filtered JSON events to the UI.
- **REST Endpoints (`/api/v1/lacw/snapshots`)**: Fetches historical telemetry snapshots and layout configurations.
- **gRPC Services (`lyzer.proto`)**: High-throughput risk gateway and intent audit queries.
