# LACW — Event Taxonomy & Category Tree

```
System Events
├── Runtime.* (Runtime.Agent.Registered, Runtime.Engine.Disposed)
├── Infrastructure.* (Infra.WebSocket.Connected, Infra.NATS.Connected)
├── Security.* (Security.Capability.Denied, Security.Policy.Violated)
└── Health.* (Health.HeapAlloc.Exceeded, Health.Heartbeat.Failed)

Cognitive Events
├── Observation.* (Observation.MarketData.Processed, Observation.Anomaly.Detected)
├── Reasoning.* (Reasoning.Chain.Evaluated, Reasoning.Premise.Invalidated)
├── Decision.* (Decision.Certificate.Issued, Decision.ECA.Vetoed)
├── Learning.* (Learning.Meta.Updated, Learning.Regime.Shifted)
└── Memory.* (Memory.Vector.Matched, Memory.Tier.Evicted)

Agent Events
├── Lifecycle.* (Agent.Mission.Started, Agent.Mission.Finished)
├── Communication.* (Agent.Message.Sent, Agent.Message.Received)
└── Execution.* (Execution.Tool.Called, Execution.Trace.Finished)
```
