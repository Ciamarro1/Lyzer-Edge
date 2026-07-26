# LACW — Realtime Streaming Infrastructure

## Channels
- WebSocket (`/ws/lacw/events`): Bi-directional event streaming
- Server Sent Events (`/sse/lacw/telemetry`): Unidirectional live metric updates
- `RealtimePriorityEngine`: Categorizes delivery into `IMMEDIATE_STREAM` (0ms delay), `BATCHED_STREAM` (50ms delay), and `BACKGROUND_STREAM` (250ms delay).
